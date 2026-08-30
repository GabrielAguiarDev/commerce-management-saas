"use server";

import { revalidatePath } from "next/cache";
import { permissionsToDb } from "@/lib/dados/equipe";
import {
  isValidCfop,
  isValidIbgeCode,
  isValidNcm,
  isValidTaxId,
  isValidZip,
  onlyDigits,
  UFS,
} from "@/lib/dados/fiscal";
import { isOwnPath, LOGO_BUCKET } from "@/lib/buckets";
import { logActivity } from "@/lib/historico";
import { PORTAL_TO_DB } from "@/lib/modulos";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import { PAYMENT_DB } from "@/lib/dados/vendas";
import type { BusinessData, FiscalData, ModuleKey, Settings, Theme } from "@/types/types";

/* -------------------------------------------------------------------------- */
/* Preferências de uso                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Salva as preferências do negócio — `tenant_settings`.
 *
 * `upsert` e não `update`: um negócio que nunca abriu esta tela não tem linha,
 * e a primeira mexida no interruptor é justamente quem a cria. Com `update`, a
 * primeira gravação de todo cliente afetaria zero linhas e a tela diria
 * "salvo" sem salvar.
 *
 * A LISTA VAZIA É BARRADA AQUI TAMBÉM, e não só no banco. O CHECK da coluna
 * recusaria, mas a mensagem que ele devolve fala de constraint — e quem está
 * no balcão precisa ler que um PDV sem forma de pagamento não cobra ninguém.
 */
export async function savePreferences(p: Settings): Promise<ActionResult> {
  const session = await requireCustomer("mudar as preferências");
  if (!session.ok) return session;

  const methods = p.acceptedMethods.filter((m, i, all) => all.indexOf(m) === i);
  if (methods.length === 0) {
    return { ok: false, message: "Você precisa aceitar pelo menos uma forma de pagamento." };
  }

  const { data, error } = await session.supabase
    .from("tenant_settings")
    .upsert(
      {
        tenant_id: session.tenantId,
        accepted_payment_methods: methods.map((m) => PAYMENT_DB[m]),
        print_receipt: p.printReceipt,
        ask_customer: p.askCustomer,
      },
      { onConflict: "tenant_id" },
    )
    .select("tenant_id");

  if (error) return { ok: false, message: error.message };
  // Mesma checagem de linhas de `saveBusinessData`: RLS que recusa devolve
  // sucesso com zero linhas, e sem contar diríamos "salvo" para nada.
  if (!data?.length) {
    return { ok: false, message: "As preferências não foram salvas. Recarregue e tente de novo." };
  }

  await logActivity(session.supabase, "settings.updated", {
    summary: `Formas aceitas: ${methods.length}`,
    metadata: { printReceipt: p.printReceipt, askCustomer: p.askCustomer },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Salva o tema DESTA pessoa — `profiles.ui_theme`.
 *
 * Fica em `profiles` e não em `tenant_settings` porque é escolha individual:
 * numa tabela por negócio, o caixa mudar para escuro mudaria a tela do dono.
 *
 * NÃO revalida a rota. As outras gravações trazem o retrato novo do servidor
 * porque a tela precisa mostrar o que o banco confirmou; aqui a tela JÁ está
 * com o tema aplicado — quem o aplica é o estado do provider, na hora do
 * clique. Um `revalidatePath` aqui recarregaria o portal inteiro para
 * confirmar uma cor que já está na frente da pessoa.
 */
export async function saveTheme(theme: Theme): Promise<ActionResult> {
  const session = await requireCustomer("mudar o tema");
  if (!session.ok) return session;

  const { data, error } = await session.supabase
    .from("profiles")
    .update({ ui_theme: theme })
    .eq("id", session.userId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  if (!data?.length) {
    return { ok: false, message: "O tema não foi salvo." };
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Registra a logo já enviada — ou tira a que está lá, com `null`.
 *
 * O ARQUIVO NÃO PASSA POR AQUI. Ele já subiu direto do navegador para o
 * Storage (ver `lib/arquivos.ts`); o que chega é o caminho, e o trabalho desta
 * função é o de sempre: conferir de quem é, gravar, e contar as linhas.
 *
 * A ANTIGA É APAGADA DEPOIS, e só se a gravação passou. Na ordem inversa, um
 * UPDATE recusado deixaria a coluna apontando para um arquivo que acabamos de
 * destruir — a pessoa ficaria sem logo nenhuma, com a tela dizendo que tem uma.
 *
 * E o `remove` não derruba nada se falhar: um arquivo órfão de 40 KB no bucket
 * é um problema de faxina; uma exceção aqui é um problema de quem só queria
 * trocar a imagem.
 */
export async function saveLogo(path: string | null): Promise<ActionResult> {
  const session = await requireCustomer("mudar a logo do negócio");
  if (!session.ok) return session;

  const { supabase, tenantId } = session;

  if (path !== null && !isOwnPath(path, tenantId)) {
    return { ok: false, message: "Esse arquivo não pertence a este negócio." };
  }

  const { data: atual } = await supabase
    .from("tenants")
    .select("logo_path")
    .eq("id", tenantId)
    .single();

  const { data, error } = await supabase
    .from("tenants")
    .update({ logo_path: path })
    .eq("id", tenantId)
    .select("id");

  if (error) return { ok: false, message: error.message };
  // Sem GRANT na coluna, um UPDATE afeta zero linhas SEM ERRO — foi o que
  // `20260828030000_storage_buckets.sql` teve de consertar. A contagem é o que
  // faz esse buraco aparecer aqui em vez de na recarga seguinte.
  if (!data?.length) {
    return { ok: false, message: "A logo não foi salva. Recarregue e tente de novo." };
  }

  const antiga = atual?.logo_path;
  if (antiga && antiga !== path) {
    await supabase.storage.from(LOGO_BUCKET).remove([antiga]);
  }

  await logActivity(supabase, path ? "logo.updated" : "logo.removed");

  revalidatePath("/", "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Dados do negócio                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Salva os dados do negócio.
 *
 * Escreve só `name`, `segment`, `phone` e `city` — os quatro campos que a tela
 * manda, e exatamente o que o banco deixa passar: a migration fiscal
 * (`20260817120000_fiscal_cadastro.sql`) reduziu o GRANT de UPDATE em `tenants`
 * a essas colunas, e a policy do dono
 * (`20260826000000_tenant_update_policy.sql`) ainda protege `plan`,
 * `monthly_fee` e `status` com um trigger que devolve os valores antigos. As
 * colunas comerciais são do admin: nem esta função nem uma chamada forjada ao
 * PostgREST as alcançam — acrescentar uma delas ao `update` abaixo seria
 * escrever uma linha que nunca tem efeito.
 *
 * O documento e o endereço FISCAL não estão aqui: vivem em
 * `tenant_fiscal_settings` e são salvos por `saveFiscalData` abaixo, porque
 * são o endereço do estabelecimento que emite, não o de contato.
 */
export async function saveBusinessData(d: BusinessData): Promise<ActionResult> {
  const session = await requireCustomer("alterar os dados do negócio");
  if (!session.ok) return session;

  if (!d.name.trim()) return { ok: false, message: "O negócio precisa de um nome." };

  // ┌─ O `.select("id")` NÃO É DECORAÇÃO ────────────────────────────────────┐
  // │ Um UPDATE barrado pelo RLS não devolve erro: o PostgREST responde      │
  // │ sucesso com ZERO linhas, exatamente como responderia a um `id` que não │
  // │ existe. Sem pedir as linhas de volta e contá-las, esta função diria    │
  // │ "salvo" para uma escrita que o banco recusou, e o valor antigo         │
  // │ reapareceria na carga seguinte — o pior desfecho possível, porque a    │
  // │ pessoa só descobre depois e não tem como saber o que aconteceu.        │
  // │                                                                        │
  // │ É a mesma checagem que `tenantApi.updateTenant` faz no app desde       │
  // │ sempre; o portal é que estava sem ela. Hoje a policy existe e o caminho │
  // │ feliz é o normal — a checagem é o que garante que uma mudança futura no │
  // │ RLS apareça como erro, e não como dado que some.                       │
  // └────────────────────────────────────────────────────────────────────────┘
  const { data, error } = await session.supabase
    .from("tenants")
    .update({
      name: d.name.trim(),
      segment: d.type.trim() || null,
      phone: d.phone.trim() || null,
      city: d.city.trim() || null,
    })
    .eq("id", session.tenantId)
    .select("id");

  if (error || !data || data.length === 0) {
    // Zero linhas sem erro significa que o banco recusou em silêncio: ou falta
    // a policy de UPDATE do dono (migrations `20260817120000_fiscal_cadastro`
    // e `20260826000000_tenant_update_policy`), ou o GRANT por coluna não
    // cobre algum campo do `update` acima.
    console.error(
      "[saveBusinessData] a escrita não pegou:",
      error?.message ?? "zero linhas afetadas — o RLS recusou em silêncio.",
    );
    return {
      ok: false,
      message: "Não foi possível salvar os dados do negócio. Tente de novo; se continuar, fale com o suporte.",
    };
  }

  await logActivity(session.supabase, "business.updated", { summary: d.name.trim() });

  revalidatePath("/", "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Cadastro fiscal                                                             */
/* -------------------------------------------------------------------------- */

/** O que a tela manda: o cadastro mais o token do CSC, que só anda de ida. */
export interface FiscalToSave extends FiscalData {
  /** Vazio mantém o que já está gravado — a tela nunca recebeu o valor atual. */
  cscTokenInput: string;
}

/**
 * Salva o cadastro fiscal do negócio.
 *
 * SÃO DUAS ESCRITAS, e a ordem importa: primeiro o cadastro, depois o segredo.
 * Se a segunda falhar, o cliente perde o CSC digitado e reescreve; se fosse ao
 * contrário, um segredo gravado ficaria pendurado num cadastro que não existe.
 *
 * VALIDAÇÃO PARCIAL DE PROPÓSITO: este cadastro leva semanas para ficar
 * completo (certificado, credenciamento, contador), e exigir tudo de uma vez
 * faria a tela recusar todo salvamento até o último campo. O que é recusado é
 * campo MAL PREENCHIDO — CNPJ com dígito errado, NCM de 6 dígitos. Campo vazio
 * passa, e quem cobra o que falta é a lista de pendências da tela.
 */
export async function saveFiscalData(f: FiscalToSave): Promise<ActionResult> {
  const session = await requireCustomer("alterar os dados fiscais");
  if (!session.ok) return session;

  const taxId = onlyDigits(f.taxId);
  const zip = onlyDigits(f.zipCode);
  const ibge = onlyDigits(f.cityIbgeCode);
  const ncm = onlyDigits(f.defaultNcm);
  const cfop = onlyDigits(f.defaultCfop);
  const uf = f.stateCode.trim().toUpperCase();

  if (taxId && !isValidTaxId(taxId)) {
    return { ok: false, message: "O CNPJ/CPF informado não é válido. Confira os dígitos." };
  }
  if (zip && !isValidZip(zip)) return { ok: false, message: "O CEP precisa ter 8 dígitos." };
  if (ibge && !isValidIbgeCode(ibge)) {
    return { ok: false, message: "O código IBGE do município tem 7 dígitos." };
  }
  if (uf && !UFS.includes(uf)) return { ok: false, message: "UF inválida." };
  if (ncm && !isValidNcm(ncm)) return { ok: false, message: "O NCM padrão precisa ter 8 dígitos." };
  if (cfop && !isValidCfop(cfop)) return { ok: false, message: "O CFOP padrão precisa ter 4 dígitos." };

  /**
   * A trava de PRODUÇÃO.
   *
   * Passar para produção é o instante em que as notas deixam de ser teste e
   * viram documento fiscal com valor legal. Fazer isso com o cadastro pela
   * metade produz rejeição em série no balcão — ou, pior, uma nota autorizada
   * com dado errado, que já não se apaga. Por isso a checagem é do SERVIDOR:
   * a tela também esconde o botão, mas a tela é só uma sugestão.
   */
  if (f.environment === "production") {
    const complete =
      !!f.legalName.trim() &&
      isValidTaxId(taxId) &&
      f.regime != null &&
      !!f.street.trim() &&
      !!f.streetNumber.trim() &&
      !!f.district.trim() &&
      isValidZip(zip) &&
      !!uf &&
      isValidIbgeCode(ibge) &&
      !!f.cscId.trim() &&
      (f.cscTokenSet || !!f.cscTokenInput.trim());

    if (!complete) {
      return {
        ok: false,
        message:
          "Complete o cadastro fiscal antes de passar para produção — falta identificação, endereço ou CSC.",
      };
    }
  }

  const { supabase, tenantId } = session;

  const { error } = await supabase.from("tenant_fiscal_settings").upsert(
    {
      tenant_id: tenantId,
      legal_name: f.legalName.trim() || null,
      tax_id: taxId || null,
      // Isento não guarda número: manter os dois preenchidos deixaria a nota
      // com uma inscrição que o cliente afirma não ter.
      state_registration: f.stateRegistrationExempt ? null : f.stateRegistration.trim() || null,
      state_registration_exempt: f.stateRegistrationExempt,
      city_registration: f.cityRegistration.trim() || null,
      tax_regime: f.regime,

      street: f.street.trim() || null,
      street_number: f.streetNumber.trim() || null,
      complement: f.complement.trim() || null,
      district: f.district.trim() || null,
      zip_code: zip || null,
      city_name: f.cityName.trim() || null,
      state_code: uf || null,
      city_ibge_code: ibge || null,

      environment: f.environment,
      nfce_series: f.nfceSeries > 0 ? f.nfceSeries : 1,

      default_ncm: ncm || null,
      default_cfop: cfop || null,
      default_icms_code: f.defaultIcmsCode.trim() || null,
      default_pis_cst: f.defaultPisCst.trim() || null,
      default_cofins_cst: f.defaultCofinsCst.trim() || null,
      default_origin: Number(f.defaultOrigin || 0),
    },
    { onConflict: "tenant_id" },
  );

  if (error) return { ok: false, message: error.message };

  // O segredo vai por RPC, nunca por escrita direta: `fiscal_credentials` não
  // tem policy para quem tem sessão, e é a função `security definer` que
  // atravessa isso — sem devolver o que está lá dentro.
  if (f.cscId.trim() || f.cscTokenInput.trim()) {
    const { error: erroCsc } = await supabase.rpc("set_fiscal_credentials", {
      p_csc_id: f.cscId.trim() || null,
      p_csc_token: f.cscTokenInput.trim() || null,
    });

    if (erroCsc) {
      return {
        ok: false,
        message: `Os dados foram salvos, mas o CSC não: ${erroCsc.message}`,
      };
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Tipos de acesso                                                             */
/* -------------------------------------------------------------------------- */

export async function saveRole(p: {
  id: string | null;
  name: string;
  modules: ModuleKey[];
}): Promise<ActionResult> {
  const session = await requireCustomer("alterar os tipos de acesso");
  if (!session.ok) return session;

  if (!p.name.trim()) return { ok: false, message: "Dê um nome ao tipo de acesso." };

  const { supabase, tenantId } = session;
  const fields = {
    name: p.name.trim(),
    permissions: permissionsToDb(p.modules, PORTAL_TO_DB),
  };

  const { error } = p.id
    ? await supabase.from("roles").update(fields).eq("id", p.id).eq("is_owner", false)
    : await supabase.from("roles").insert({ tenant_id: tenantId, is_owner: false, ...fields });

  if (error) return { ok: false, message: error.message };

  // Quem pode o quê é a informação mais sensível desta tela: o log guarda o
  // nome do acesso e quantos módulos ele abriu.
  await logActivity(supabase, p.id ? "role.updated" : "role.created", {
    entityId: p.id,
    summary: `${fields.name} · ${p.modules.length} módulos`,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeRole(id: string): Promise<ActionResult> {
  const session = await requireCustomer("remover um tipo de acesso");
  if (!session.ok) return session;
  const { supabase } = session;

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", id);

  if (count) {
    return { ok: false, message: "Há funcionários usando este tipo de acesso." };
  }

  // `is_owner = false` na condição: o tipo do dono não sai nem por engano.
  const { error } = await supabase.from("roles").delete().eq("id", id).eq("is_owner", false);
  if (error) return { ok: false, message: error.message };

  await logActivity(supabase, "role.deleted", { entityId: id });

  revalidatePath("/", "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Funcionários                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Suspende ou libera o acesso de alguém da equipe.
 *
 * É o que dá para fazer daqui: CRIAR um funcionário exige criar o usuário no
 * Auth, e isso precisa da `service_role`, que não existe neste projeto por
 * decisão de segurança. Ver a análise.
 */
export async function setEmployeeActive(id: string, active: boolean): Promise<ActionResult> {
  const session = await requireCustomer("alterar o acesso de um funcionário");
  if (!session.ok) return session;

  if (id === session.userId) {
    return { ok: false, message: "Você não pode suspender o seu próprio acesso." };
  }

  const { data, error } = await session.supabase
    .from("profiles")
    .update({ status: active ? "active" : "suspended" })
    .eq("id", id)
    .select("full_name");

  if (error) return { ok: false, message: error.message };

  await logActivity(session.supabase, active ? "employee.restored" : "employee.suspended", {
    entityId: id,
    summary: data?.[0]?.full_name ?? null,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Troca o tipo de acesso de alguém da equipe. */
export async function changeEmployeeRole(id: string, roleId: string): Promise<ActionResult> {
  const session = await requireCustomer("alterar o acesso de um funcionário");
  if (!session.ok) return session;

  const { data, error } = await session.supabase
    .from("profiles")
    .update({ role_id: roleId })
    .eq("id", id)
    .select("full_name");

  if (error) return { ok: false, message: error.message };

  await logActivity(session.supabase, "employee.role_changed", {
    entityId: id,
    summary: data?.[0]?.full_name ?? null,
    metadata: { roleId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
