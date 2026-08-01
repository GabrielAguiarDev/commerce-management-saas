"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ehPlanoValido, MENSALIDADE_PADRAO, modulosDoPlano, type Plano } from "@/lib/planos";
import { ROTAS } from "@/lib/rotas";

/**
 * Dados do cliente recém-criado, para a interface inserir na lista sem
 * esperar um novo carregamento.
 */
export interface ClienteCriado {
  id: string;
  nome: string;
  segmento: string;
  responsavel: string;
  plano: Plano;
  mensalidade: number;
  modulos: readonly string[];
}

export type EstadoFormulario =
  | { status: "inicial" }
  | { status: "erro"; mensagem: string; campo?: string }
  | { status: "sucesso"; mensagem: string; cliente: ClienteCriado };

export const ESTADO_INICIAL: EstadoFormulario = { status: "inicial" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function erro(mensagem: string, campo?: string): EstadoFormulario {
  return { status: "erro", mensagem, campo };
}

/**
 * Cria um cliente completo: usuário de acesso no Auth, tenant, papel Dono,
 * perfil e módulos do plano.
 *
 * ───────────────────────────────────────────────────────────────────────
 * POR QUE ISTO É UMA SERVER ACTION
 *
 * Criar usuário no Supabase Auth exige a `service_role`, que dá acesso total
 * ao banco e ignora o RLS. Ela só pode existir no servidor. O formulário no
 * navegador apenas CHAMA esta função — ele nunca vê a chave, nem os dados de
 * outros clientes. Todo o trecho abaixo roda no servidor do Next.js.
 * ───────────────────────────────────────────────────────────────────────
 */
export async function criarCliente(
  _anterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  // =====================================================================
  // PASSO 0 — AUTORIZAÇÃO. Vem antes de tudo.
  //
  // Uma Server Action é um endpoint HTTP: qualquer pessoa na internet pode
  // chamá-la, com qualquer corpo, sem passar pela nossa interface. Estar
  // "dentro do painel admin" não prova nada.
  //
  // Por isso usamos primeiro o cliente COM SESSÃO (chave pública, sob RLS)
  // para descobrir quem está pedindo, e só liberamos o cliente admin depois
  // de confirmar que é admin da plataforma.
  // =====================================================================
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return erro(
      "Supabase não configurado neste ambiente. Preencha o .env.local do portal-admin " +
        "(veja .env.local.example) e reinicie o servidor.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return erro("Sessão expirada. Entre novamente para continuar.");
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (erroPerfil || !perfil?.is_platform_admin) {
    // Mensagem deliberadamente seca: não confirmamos a quem não é admin se a
    // operação existe ou por que foi negada.
    return erro("Você não tem permissão para cadastrar clientes.");
  }

  // =====================================================================
  // PASSO 1 — Ler e validar a entrada.
  //
  // O formulário também valida, mas aquilo é conveniência para quem digita.
  // ESTA validação é a que vale: é a única que um chamador não consegue pular.
  // =====================================================================
  const nome = String(formData.get("nome") ?? "").trim();
  const segmento = String(formData.get("segmento") ?? "").trim();
  const responsavel = String(formData.get("responsavel") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const planoBruto = String(formData.get("plano") ?? "");
  const mensalidadeBruta = String(formData.get("mensalidade") ?? "").trim();

  if (!nome) return erro("Informe o nome do negócio.", "nome");
  if (!email) return erro("Informe o e-mail de acesso.", "email");
  if (!EMAIL_RE.test(email)) return erro("E-mail inválido.", "email");
  if (!ehPlanoValido(planoBruto)) return erro("Escolha um plano.", "plano");

  const plano: Plano = planoBruto;

  // A mensalidade só é informada no plano customizado; nos demais o preço é
  // tabelado (ver lib/planos.ts).
  let mensalidade: number;
  if (plano === "custom") {
    // Aceita "149", "149,90" e "R$ 149,90".
    const numero = Number(mensalidadeBruta.replace(/[^\d,.-]/g, "").replace(",", "."));
    if (!mensalidadeBruta || !Number.isFinite(numero) || numero <= 0) {
      return erro("Informe a mensalidade do plano customizado.", "mensalidade");
    }
    mensalidade = numero;
  } else {
    mensalidade = MENSALIDADE_PADRAO[plano] ?? 0;
  }

  // Os módulos marcados na grade só valem no plano Customizado. Nos planos de
  // pacote fechado, `modulosDoPlano` descarta o que veio no formulário e usa o
  // pacote do plano — assim uma requisição forjada não consegue "comprar"
  // módulos extras marcando caixinhas.
  const modulos = modulosDoPlano(plano, formData.getAll("modulos").map(String));

  if (modulos.length === 0) {
    return erro(
      plano === "custom"
        ? "Selecione ao menos um módulo para o plano customizado."
        : "O plano escolhido não tem módulos configurados.",
      "modulos",
    );
  }

  // A partir daqui usamos a service_role — já sabemos que quem pediu é admin.
  const admin = createAdminClient();

  // =====================================================================
  // PASSO 2 — Criar o usuário de acesso no Auth.
  //
  // Usamos CONVITE por e-mail em vez de definir uma senha aqui: assim o admin
  // nunca conhece a senha do cliente, e a senha nasce escolhida pelo próprio
  // dono do comércio, por um link de uso único.
  //
  // Requer SMTP configurado no projeto Supabase (Authentication → Emails).
  // =====================================================================
  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: responsavel || null },
  });

  if (erroConvite || !convite?.user) {
    const jaExiste =
      erroConvite?.status === 422 || /already|registered|exists/i.test(erroConvite?.message ?? "");
    return erro(
      jaExiste
        ? "Já existe um usuário com este e-mail."
        : `Não foi possível enviar o convite de acesso: ${erroConvite?.message ?? "erro desconhecido"}`,
      "email",
    );
  }

  const usuarioId = convite.user.id;

  // =====================================================================
  // PASSO 3 a 6 — Tenant, papel Dono, perfil e módulos.
  //
  // Tudo numa chamada só: a função do banco roda em transação, então ou os
  // quatro registros existem, ou nenhum existe. É o que impede um cliente
  // criado pela metade.
  // =====================================================================
  const { data: tenantId, error: erroRpc } = await admin.rpc("admin_create_tenant", {
    p_user_id: usuarioId,
    p_name: nome,
    p_segment: segmento,
    p_owner_name: responsavel,
    p_plan: plano,
    p_monthly_fee: mensalidade,
    p_module_keys: modulos,
  });

  // =====================================================================
  // PASSO 7 — Compensação.
  //
  // O banco já se desfez sozinho (transação). O que sobrou foi o usuário do
  // Auth, criado no passo 2, fora do alcance daquela transação. Apagamos aqui
  // para não deixar um e-mail "ocupado" por um cliente que não existe — o que
  // impediria o admin de tentar de novo com o mesmo e-mail.
  // =====================================================================
  if (erroRpc || !tenantId) {
    const { error: erroLimpeza } = await admin.auth.admin.deleteUser(usuarioId);

    if (erroLimpeza) {
      // Caso raro e ruim: falhou criar E falhou limpar. Registramos o id para
      // que dê para remover o usuário à mão no painel do Supabase.
      console.error(
        `[criarCliente] usuário órfão no Auth: ${usuarioId} (${email}). ` +
          `Remova manualmente. Causa da limpeza falha: ${erroLimpeza.message}`,
      );
      return erro(
        "Não foi possível concluir o cadastro e a limpeza automática falhou. " +
          "Verifique no Supabase se restou um usuário com este e-mail antes de tentar de novo.",
      );
    }

    return erro(`Não foi possível criar o cliente: ${erroRpc?.message ?? "erro desconhecido"}`);
  }

  // =====================================================================
  // PASSO 8 — Sucesso.
  // =====================================================================
  revalidatePath(ROTAS.clientes);

  return {
    status: "sucesso",
    mensagem: `${nome} cadastrado. Convite de acesso enviado para ${email}.`,
    cliente: {
      id: String(tenantId),
      nome,
      segmento,
      responsavel,
      plano,
      mensalidade,
      modulos,
    },
  };
}
