"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { modulosPadrao } from "@/lib/configuracoes";
import { resolverModulos } from "@/lib/planos";

/**
 * Dados do cliente recém-criado, para a interface inserir na lista sem
 * esperar um novo carregamento.
 */
export interface ClienteCriado {
  id: string;
  nome: string;
  segmento: string;
  responsavel: string;
  plano: string;
  mensalidade: number;
  modulos: readonly string[];
}

/**
 * A linha vigente de `plans`, lida no servidor.
 *
 * Toda decisão de preço e composição sai daqui — nunca do que o navegador
 * afirmou. É o que impede uma requisição forjada de contratar o plano Pago
 * pagando o preço do Gratuito, ou de marcar módulos que o pacote não inclui.
 */
async function lerPlano(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chave: string,
): Promise<{ preco: number | null; custom: boolean; mods: string[] } | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("price, is_custom, module_keys")
    .eq("key", chave)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return {
    preco: data.price === null ? null : Number(data.price),
    custom: !!data.is_custom,
    mods: data.module_keys ?? [],
  };
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
  const cidade = String(formData.get("cidade") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (!nome) return erro("Informe o nome do negócio.", "nome");
  if (!email) return erro("Informe o e-mail de acesso.", "email");
  if (!EMAIL_RE.test(email)) return erro("E-mail inválido.", "email");
  // O plano vem da tabela `plans`, não de uma lista em código. Se a chave não
  // existir (ou o plano tiver sido desativado), o cadastro para aqui.
  const regra = await lerPlano(supabase, planoBruto);
  if (!regra) return erro("Escolha um plano.", "plano");

  const plano = planoBruto;

  // A mensalidade só é informada no plano customizado; nos demais vale o preço
  // gravado em `plans.price`.
  let mensalidade: number;
  if (regra.custom) {
    // Aceita "149", "149,90" e "R$ 149,90".
    const numero = Number(mensalidadeBruta.replace(/[^\d,.-]/g, "").replace(",", "."));
    if (!mensalidadeBruta || !Number.isFinite(numero) || numero <= 0) {
      return erro("Informe a mensalidade do plano customizado.", "mensalidade");
    }
    mensalidade = numero;
  } else {
    mensalidade = regra.preco ?? 0;
  }

  // Os módulos marcados na grade só valem no plano Customizado. Nos planos de
  // pacote fechado, `resolverModulos` descarta o que veio no formulário e usa
  // `plans.module_keys` — assim uma requisição forjada não consegue "comprar"
  // módulos extras marcando caixinhas.
  let modulos = resolverModulos(
    regra.custom,
    regra.mods,
    formData.getAll("modulos").map(String),
  );

  // Plano de pacote fechado sem composição gravada cai nos módulos padrão da
  // plataforma (`platform_settings.default_modules`) em vez de barrar o
  // cadastro — antes isto era uma lista fixa em código.
  if (modulos.length === 0 && !regra.custom) {
    modulos = await modulosPadrao();
  }

  if (modulos.length === 0) {
    return erro(
      regra.custom
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
    p_city: cidade,
    p_phone: telefone,
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
  // O layout é quem lê `tenants` (ver lib/clientes.ts), e ele fica acima de
  // todas as rotas — revalidar só /clientes deixaria visão e financeiro com a
  // lista antiga.
  revalidatePath("/", "layout");

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

// =====================================================================
// MUTAÇÕES DE UM CLIENTE JÁ EXISTENTE
//
// Todas seguem a mesma forma: confirmar no servidor que quem pediu é admin da
// plataforma, chamar a função do banco que faz o trabalho em transação, e
// revalidar o layout — que é quem relê `tenants` (ver lib/clientes.ts).
//
// POR QUE O CLIENTE DE SESSÃO E NÃO A `service_role`: as funções
// `admin_update_tenant` e `admin_delete_tenant` conferem `is_platform_admin()`
// lá dentro, e isso só funciona se `auth.uid()` existir — o que exige a
// sessão. É uma segunda tranca, independente da checagem daqui.
// =====================================================================

export type ResultadoCliente = { ok: true } | { ok: false; mensagem: string };

/** Confirma que quem chamou é admin da plataforma. */
async function exigirAdmin(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof createClient>> } | ResultadoCliente
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, mensagem: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, mensagem: "Sessão expirada. Entre novamente para continuar." };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !perfil?.is_platform_admin) {
    return { ok: false, mensagem: "Você não tem permissão para alterar clientes." };
  }

  return { ok: true, supabase };
}

/** "R$ 149,00" → 149. A interface guarda o valor já formatado. */
function paraNumero(valor: string): number {
  const n = Number(
    String(valor)
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}\b)/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Salva plano, mensalidade e módulos de um cliente.
 *
 * A mensalidade só é aceita do formulário no plano customizado; nos planos de
 * pacote fechado vale o preço tabelado, pelo mesmo motivo que os módulos são
 * recalculados por `modulosDoPlano` — uma requisição forjada não compra plano
 * mais barato nem módulo extra.
 */
export async function atualizarCliente(
  clienteId: string,
  plano: string,
  valorFormatado: string,
  modulosEscolhidos: string[],
): Promise<ResultadoCliente> {
  const auth = await exigirAdmin();
  if (!("supabase" in auth)) return auth;

  // Mesma leitura do cadastro: preço e composição saem de `plans`, nunca do
  // que o navegador mandou.
  const regra = await lerPlano(auth.supabase, plano);
  if (!regra) return { ok: false, mensagem: "Plano inválido." };

  const modulos = resolverModulos(regra.custom, regra.mods, modulosEscolhidos);
  if (modulos.length === 0) {
    return { ok: false, mensagem: "Selecione ao menos um módulo para este cliente." };
  }

  const mensalidade = regra.custom ? paraNumero(valorFormatado) : (regra.preco ?? 0);

  if (regra.custom && mensalidade <= 0) {
    return { ok: false, mensagem: "Informe a mensalidade do plano customizado." };
  }

  const { error } = await auth.supabase.rpc("admin_update_tenant", {
    p_tenant_id: clienteId,
    p_plan: plano,
    p_monthly_fee: mensalidade,
    p_module_keys: modulos,
  });

  if (error) {
    console.error("[atualizarCliente] falha:", error.message);
    return { ok: false, mensagem: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Desativa ou reativa um cliente. É um `update` de uma coluna só. */
export async function mudarStatusCliente(
  clienteId: string,
  ativo: boolean,
): Promise<ResultadoCliente> {
  const auth = await exigirAdmin();
  if (!("supabase" in auth)) return auth;

  const { error } = await auth.supabase
    .from("tenants")
    // `lib/clientes.ts` lê exatamente este par: 'active' é ativo, o resto é inativo.
    .update({ status: ativo ? "active" : "inactive" })
    .eq("id", clienteId);

  if (error) {
    console.error("[mudarStatusCliente] falha:", error.message);
    return { ok: false, mensagem: `Não foi possível alterar o cliente: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Exclui um cliente e tudo que pertence a ele. NÃO TEM VOLTA.
 *
 * Dois passos, nesta ordem de propósito:
 *   1. `admin_delete_tenant` apaga as treze tabelas em transação e devolve os
 *      usuários do Auth que pertenciam ao cliente;
 *   2. a `service_role` apaga esses usuários — o Auth vive fora do alcance da
 *      transação, e é a única parte que exige a chave privilegiada.
 *
 * Se o passo 2 falhar, o cliente já sumiu do banco e sobra um usuário órfão no
 * Auth. Registramos o id no log para remoção manual, como faz `criarCliente`,
 * em vez de fingir que a exclusão inteira falhou — ela não falhou.
 */
export async function excluirCliente(
  clienteId: string,
  nomeConfirmado: string,
): Promise<ResultadoCliente> {
  const auth = await exigirAdmin();
  if (!("supabase" in auth)) return auth;

  // A tela já exige digitar o nome; conferir de novo aqui é o que impede uma
  // chamada direta à Server Action de apagar um cliente sem essa barreira.
  const { data: cliente, error: erroLeitura } = await auth.supabase
    .from("tenants")
    .select("name")
    .eq("id", clienteId)
    .single();

  if (erroLeitura || !cliente) return { ok: false, mensagem: "Cliente não encontrado." };

  if ((cliente.name ?? "").trim() !== nomeConfirmado.trim()) {
    return { ok: false, mensagem: "O nome digitado não confere com o do cliente." };
  }

  const { data: usuarios, error } = await auth.supabase.rpc("admin_delete_tenant", {
    p_tenant_id: clienteId,
  });

  if (error) {
    console.error("[excluirCliente] falha:", error.message);
    return { ok: false, mensagem: `Não foi possível excluir: ${error.message}` };
  }

  const admin = createAdminClient();
  for (const usuarioId of (usuarios as string[] | null) ?? []) {
    const { error: erroAuth } = await admin.auth.admin.deleteUser(usuarioId);
    if (erroAuth) {
      console.error(
        `[excluirCliente] usuário órfão no Auth: ${usuarioId}. ` +
          `Remova manualmente. Causa: ${erroAuth.message}`,
      );
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
