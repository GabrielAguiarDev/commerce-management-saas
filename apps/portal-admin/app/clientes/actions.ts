"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState, CustomerResult } from "@/app/clientes/estadoFormulario";
import { defaultModules } from "@/lib/configuracoes";
import { resolveModules } from "@/lib/planos";


/**
 * A linha vigente de `plans`, lida no servidor.
 *
 * Toda decisão de preço e composição sai daqui — nunca do que o navegador
 * afirmou. É o que impede uma requisição forjada de contratar o plano Pago
 * pagando o preço do Gratuito, ou de marcar módulos que o pacote não inclui.
 */
async function readPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
): Promise<{ price: number | null; custom: boolean; mods: string[] } | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("price, is_custom, module_keys")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return {
    price: data.price === null ? null : Number(data.price),
    custom: !!data.is_custom,
    mods: data.module_keys ?? [],
  };
}


const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function error(message: string, field?: string): FormState {
  return { status: "error", message, field };
}

/**
 * A rota do portal do CLIENTE que troca o token do e-mail por sessão.
 *
 * Fica escrita aqui, e não em `lib/rotas.ts`, porque aquele arquivo é o mapa
 * deste console — esta é uma rota do OUTRO app. O par dela é
 * `portal-client/app/auth/confirmar/route.ts`: mexeu num, confira o outro.
 */
const CLIENT_CONFIRM_PATH = "/auth/confirmar";

/** Quantos usuários por página, e até quantas páginas, ao caçar o órfão. */
const ORPHAN_PAGE_SIZE = 1000;
const ORPHAN_MAX_PAGES = 5;
/** Fora desta janela, o usuário achado é de outra época — não desta chamada. */
const ORPHAN_WINDOW_MS = 2 * 60 * 1000;

/**
 * Procura, e apaga, o usuário que ESTA chamada de `inviteUserByEmail` criou
 * quando o envio do e-mail falhou logo depois.
 *
 * POR QUE ISTO EXISTE: o convite cria o usuário no Auth e SÓ ENTÃO manda o
 * e-mail. Se o envio falhar e o usuário ficar de pé, o endereço fica ocupado
 * para sempre — a próxima tentativa com o mesmo e-mail bate em "já existe", e
 * não há tela neste console para remover um usuário do Auth. É a mesma
 * compensação do PASSO 7, aplicada ao passo anterior.
 *
 * O id não vem do erro (ele não traz nenhum), então o usuário é procurado pelo
 * e-mail. Duas travas antes de apagar qualquer coisa, porque apagar o usuário
 * errado é pior do que deixar um órfão:
 *
 *   1. RECÉM-CRIADO — fora da janela, não foi esta chamada que o criou;
 *   2. SEM CLIENTE — perfil ausente, ou presente mas ainda sem `tenant_id` e
 *      sem `is_platform_admin`. Um dono de comércio já cadastrado tem
 *      `tenant_id` (quem o grava é `admin_create_tenant`) e um admin da
 *      plataforma tem a flag; nenhum dos dois é tocado aqui.
 *
 * Quem chama já descartou o caso "e-mail já registrado" — ali o usuário é de
 * outro cadastro, legítimo, e não se apaga.
 *
 * Devolve o que aconteceu, porque a mensagem na tela muda: "limpo" e "nada"
 * significam que não sobrou lixo; "falhou" significa que pode ter sobrado, e o
 * admin precisa olhar o painel do Supabase antes de tentar de novo.
 *
 * O `email` chega já em minúsculas — quem chama normaliza na leitura do
 * formulário, e a comparação abaixo conta com isso.
 */
async function cleanupFailedInvite(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<"limpo" | "nada" | "falhou"> {
  // O Auth não tem busca por e-mail no SDK: só páginas. O laço é limitado —
  // este é um caminho de falha, não pode virar uma varredura sem fim.
  let found: { id: string; created_at: string } | null = null;

  for (let page = 1; page <= ORPHAN_MAX_PAGES && !found; page++) {
    const { data, error: erroLista } = await admin.auth.admin.listUsers({
      page,
      perPage: ORPHAN_PAGE_SIZE,
    });

    if (erroLista) {
      console.error(`[criarCliente] não foi possível listar usuários: ${erroLista.message}`);
      return "falhou";
    }

    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) found = { id: hit.id, created_at: hit.created_at };
    if (users.length < ORPHAN_PAGE_SIZE) break;
  }

  // Nada com este e-mail: o Supabase desfez a criação junto com o envio.
  if (!found) return "nada";

  // TRAVA 1 — recém-criado.
  if (Date.now() - new Date(found.created_at).getTime() > ORPHAN_WINDOW_MS) return "nada";

  // TRAVA 2 — sem cliente nem plataforma atrás dele.
  const { data: perfil, error: erroPerfil } = await admin
    .from("profiles")
    .select("tenant_id, is_platform_admin")
    .eq("id", found.id)
    .maybeSingle();

  if (erroPerfil) {
    console.error(
      `[criarCliente] não foi possível conferir o perfil de ${email}: ${erroPerfil.message}`,
    );
    return "falhou";
  }

  if (perfil && (perfil.tenant_id || perfil.is_platform_admin)) return "nada";

  const { error: erroLimpeza } = await admin.auth.admin.deleteUser(found.id);

  if (erroLimpeza) {
    console.error(
      `[criarCliente] usuário órfão no Auth: ${found.id} (${email}). ` +
        `Remova manualmente. Causa da limpeza falha: ${erroLimpeza.message}`,
    );
    return "falhou";
  }

  return "limpo";
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
export async function createCustomer(
  _anterior: FormState,
  formData: FormData,
): Promise<FormState> {
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
    return error(
      "Supabase não configurado neste ambiente. Preencha o .env.local do portal-admin " +
        "(veja .env.local.example) e reinicie o servidor.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return error("Sessão expirada. Entre novamente para continuar.");
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (erroPerfil || !perfil?.is_platform_admin) {
    // Mensagem deliberadamente seca: não confirmamos a quem não é admin se a
    // operação existe ou por que foi negada.
    return error("Você não tem permissão para cadastrar clientes.");
  }

  // =====================================================================
  // PASSO 1 — Ler e validar a entrada.
  //
  // O formulário também valida, mas aquilo é conveniência para quem digita.
  // ESTA validação é a que vale: é a única que um chamador não consegue pular.
  // =====================================================================
  const name = String(formData.get("name") ?? "").trim();
  const segment = String(formData.get("segment") ?? "").trim();
  const owner = String(formData.get("owner") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const rawPlan = String(formData.get("plan") ?? "");
  const rawMonthlyFee = String(formData.get("monthlyFee") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) return error("Informe o nome do negócio.", "name");
  if (!email) return error("Informe o e-mail de acesso.", "email");
  if (!EMAIL_RE.test(email)) return error("E-mail inválido.", "email");
  // O plano vem da tabela `plans`, não de uma lista em código. Se a chave não
  // existir (ou o plano tiver sido desativado), o cadastro para aqui.
  const rule = await readPlan(supabase, rawPlan);
  if (!rule) return error("Escolha um plano.", "plan");

  const plan = rawPlan;

  // A mensalidade só é informada no plano customizado; nos demais vale o preço
  // gravado em `plans.price`.
  let monthlyFee: number;
  if (rule.custom) {
    // Aceita "149", "149,90" e "R$ 149,90".
    const number = Number(rawMonthlyFee.replace(/[^\d,.-]/g, "").replace(",", "."));
    if (!rawMonthlyFee || !Number.isFinite(number) || number <= 0) {
      return error("Informe a mensalidade do plano customizado.", "monthlyFee");
    }
    monthlyFee = number;
  } else {
    monthlyFee = rule.price ?? 0;
  }

  // Os módulos marcados na grade só valem no plano Customizado. Nos planos de
  // pacote fechado, `resolverModulos` descarta o que veio no formulário e usa
  // `plans.module_keys` — assim uma requisição forjada não consegue "comprar"
  // módulos extras marcando caixinhas.
  let modules = resolveModules(
    rule.custom,
    rule.mods,
    formData.getAll("modulos").map(String),
  );

  // Plano de pacote fechado sem composição gravada cai nos módulos padrão da
  // plataforma (`platform_settings.default_modules`) em vez de barrar o
  // cadastro — antes isto era uma lista fixa em código.
  if (modules.length === 0 && !rule.custom) {
    modules = await defaultModules();
  }

  if (modules.length === 0) {
    return error(
      rule.custom
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
  //
  // O `redirectTo` é o que faz o link do e-mail cair no portal do CLIENTE, e é
  // a diferença entre um convite que funciona e um que não leva a lugar nenhum:
  // sem ele o Supabase usa o Site URL do projeto, a pessoa é autenticada na
  // raiz do portal e volta ao login sem nunca ter definido uma senha — com
  // sessão e sem tela para criá-la.
  //
  // A leitura da variável vem ANTES do convite de propósito: até aqui nada foi
  // criado, e um ambiente mal configurado precisa parar antes de existir um
  // usuário no Auth.
  // =====================================================================
  const clientPortal = process.env.NEXT_PUBLIC_PORTAL_CLIENTE_URL;
  if (!clientPortal) {
    return error(
      "NEXT_PUBLIC_PORTAL_CLIENTE_URL não está configurada neste ambiente. " +
        "Sem ela o convite sairia com um link para o app errado. " +
        "Preencha o .env.local do portal-admin (veja .env.local.example) e reinicie o servidor.",
    );
  }

  const { data: convite, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: owner || null },
    redirectTo: `${clientPortal}${CLIENT_CONFIRM_PATH}`,
  });

  if (erroConvite || !convite?.user) {
    // ---------------------------------------------------------------
    // Três desfechos diferentes, porque exigem três atitudes diferentes.
    // ---------------------------------------------------------------

    // 1. E-MAIL JÁ REGISTRADO. O usuário é de outro cadastro, legítimo: nada é
    //    apagado, e a mensagem é a única que o admin consegue resolver sozinho.
    const alreadyExists =
      erroConvite?.status === 422 || /already|registered|exists/i.test(erroConvite?.message ?? "");

    if (alreadyExists) {
      return error("Já existe um usuário com este e-mail.", "email");
    }

    // O e-mail entra no log porque é o que permite achar o cadastro que falhou;
    // não é segredo — quem lê este log já é quem digitou o formulário.
    console.error(
      `[criarCliente] convite falhou para ${email}: ` +
        `${erroConvite?.message ?? "sem mensagem"} (status ${erroConvite?.status ?? "?"})`,
    );

    const cleanup = await cleanupFailedInvite(admin, email);
    const motive = erroConvite?.message ?? "error desconhecido";

    // 2. FALHA DE ENVIO, SEM LIXO. Ou o Supabase desfez a criação, ou nós
    //    apagamos o usuário agora. O e-mail continua livre para tentar de novo.
    if (cleanup !== "falhou") {
      return error(
        `Não foi possível enviar o convite de acesso: ${motive}. ` +
          "O cliente NÃO foi cadastrado — confira o SMTP do projeto no Supabase e tente de novo.",
        "email",
      );
    }

    // 3. FALHA DE ENVIO E A LIMPEZA TAMBÉM FALHOU. Pode ter sobrado um usuário
    //    ocupando este e-mail, e uma nova tentativa vai bater em "já existe".
    return error(
      `Não foi possível enviar o convite de acesso: ${motive}. ` +
        "O cliente NÃO foi cadastrado, e a limpeza automática falhou: verifique no Supabase " +
        "(Authentication → Users) se restou um usuário com este e-mail antes de tentar de novo.",
      "email",
    );
  }

  const userId = convite.user.id;

  // =====================================================================
  // PASSO 3 a 6 — Tenant, papel Dono, perfil e módulos.
  //
  // Tudo numa chamada só: a função do banco roda em transação, então ou os
  // quatro registros existem, ou nenhum existe. É o que impede um cliente
  // criado pela metade.
  // =====================================================================
  const { data: tenantId, error: erroRpc } = await admin.rpc("admin_create_tenant", {
    p_user_id: userId,
    p_name: name,
    p_segment: segment,
    p_owner_name: owner,
    p_plan: plan,
    p_monthly_fee: monthlyFee,
    p_module_keys: modules,
    p_city: city,
    p_phone: phone,
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
    const { error: erroLimpeza } = await admin.auth.admin.deleteUser(userId);

    if (erroLimpeza) {
      // Caso raro e ruim: falhou criar E falhou limpar. Registramos o id para
      // que dê para remover o usuário à mão no painel do Supabase.
      console.error(
        `[criarCliente] usuário órfão no Auth: ${userId} (${email}). ` +
          `Remova manualmente. Causa da limpeza falha: ${erroLimpeza.message}`,
      );
      return error(
        "Não foi possível concluir o cadastro e a limpeza automática falhou. " +
          "Verifique no Supabase se restou um usuário com este e-mail antes de tentar de novo.",
      );
    }

    return error(`Não foi possível criar o cliente: ${erroRpc?.message ?? "error desconhecido"}`);
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
    message: `${name} cadastrado. Convite de acesso enviado para ${email}.`,
    customer: {
      id: String(tenantId),
      name,
      segment,
      owner,
      plan,
      monthlyFee,
      modules,
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


/** Confirma que quem chamou é admin da plataforma. */
async function requireAdmin(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof createClient>> } | CustomerResult
> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, message: "Supabase não configurado neste ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Sessão expirada. Entre novamente para continuar." };

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (error || !perfil?.is_platform_admin) {
    return { ok: false, message: "Você não tem permissão para alterar clientes." };
  }

  return { ok: true, supabase };
}

/** "R$ 149,00" → 149. A interface guarda o valor já formatado. */
function toNumber(amount: string): number {
  const n = Number(
    String(amount)
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
export async function updateCustomer(
  customerId: string,
  plan: string,
  valorFormatado: string,
  modulosEscolhidos: string[],
): Promise<CustomerResult> {
  const auth = await requireAdmin();
  if (!("supabase" in auth)) return auth;

  // Mesma leitura do cadastro: preço e composição saem de `plans`, nunca do
  // que o navegador mandou.
  const rule = await readPlan(auth.supabase, plan);
  if (!rule) return { ok: false, message: "Plano inválido." };

  const modules = resolveModules(rule.custom, rule.mods, modulosEscolhidos);
  if (modules.length === 0) {
    return { ok: false, message: "Selecione ao menos um módulo para este cliente." };
  }

  const monthlyFee = rule.custom ? toNumber(valorFormatado) : (rule.price ?? 0);

  if (rule.custom && monthlyFee <= 0) {
    return { ok: false, message: "Informe a mensalidade do plano customizado." };
  }

  const { error } = await auth.supabase.rpc("admin_update_tenant", {
    p_tenant_id: customerId,
    p_plan: plan,
    p_monthly_fee: monthlyFee,
    p_module_keys: modules,
  });

  if (error) {
    console.error("[atualizarCliente] falha:", error.message);
    return { ok: false, message: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Desativa ou reativa um cliente. É um `update` de uma coluna só. */
export async function setCustomerStatus(
  customerId: string,
  active: boolean,
): Promise<CustomerResult> {
  const auth = await requireAdmin();
  if (!("supabase" in auth)) return auth;

  const { error } = await auth.supabase
    .from("tenants")
    // `lib/clientes.ts` lê exatamente este par: 'active' é ativo, o resto é inativo.
    .update({ status: active ? "active" : "inactive" })
    .eq("id", customerId);

  if (error) {
    console.error("[mudarStatusCliente] falha:", error.message);
    return { ok: false, message: `Não foi possível alterar o cliente: ${error.message}` };
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
export async function deleteCustomer(
  customerId: string,
  nomeConfirmado: string,
): Promise<CustomerResult> {
  const auth = await requireAdmin();
  if (!("supabase" in auth)) return auth;

  // A tela já exige digitar o nome; conferir de novo aqui é o que impede uma
  // chamada direta à Server Action de apagar um cliente sem essa barreira.
  const { data: customer, error: erroLeitura } = await auth.supabase
    .from("tenants")
    .select("name")
    .eq("id", customerId)
    .single();

  if (erroLeitura || !customer) return { ok: false, message: "Cliente não encontrado." };

  if ((customer.name ?? "").trim() !== nomeConfirmado.trim()) {
    return { ok: false, message: "O nome digitado não confere com o do cliente." };
  }

  const { data: usuarios, error } = await auth.supabase.rpc("admin_delete_tenant", {
    p_tenant_id: customerId,
  });

  if (error) {
    console.error("[excluirCliente] falha:", error.message);
    return { ok: false, message: `Não foi possível excluir: ${error.message}` };
  }

  const admin = createAdminClient();
  for (const userId of (usuarios as string[] | null) ?? []) {
    const { error: erroAuth } = await admin.auth.admin.deleteUser(userId);
    if (erroAuth) {
      console.error(
        `[excluirCliente] usuário órfão no Auth: ${userId}. ` +
          `Remova manualmente. Causa: ${erroAuth.message}`,
      );
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
