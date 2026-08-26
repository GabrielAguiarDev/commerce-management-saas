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
import { PORTAL_TO_DB } from "@/lib/modulos";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { BusinessData, FiscalData, ModuleKey } from "@/types/types";

/**
 * Salva os dados do negócio.
 *
 * Escreve só `name`, `segment`, `phone` e `city` — e é exatamente o que o
 * GRANT por coluna da migration fiscal permite. As outras colunas de `tenants`
 * (`plan`, `monthly_fee`, `status`) são do admin, e nem esta função nem uma
 * chamada forjada ao PostgREST alcançam.
 *
 * O documento e o endereço FISCAL não estão aqui: vivem em
 * `tenant_fiscal_settings` e são salvos por `saveFiscalData` abaixo, porque
 * são o endereço do estabelecimento que emite, não o de contato.
 */
export async function saveBusinessData(d: BusinessData): Promise<ActionResult> {
  const session = await requireCustomer("alterar os dados do negócio");
  if (!session.ok) return session;

  if (!d.name.trim()) return { ok: false, message: "O negócio precisa de um nome." };

  const { error } = await session.supabase
    .from("tenants")
    .update({
      name: d.name.trim(),
      segment: d.type.trim() || null,
      phone: d.phone.trim() || null,
      city: d.city.trim() || null,
    })
    .eq("id", session.tenantId);

  if (error) {
    // Até a migration `20260817120000_fiscal_cadastro` não haver rodado, o
    // dono não tinha política de UPDATE em `tenants` e esta escrita afetava 0
    // linhas caladamente. Se a mensagem voltar a aparecer, é a migration que
    // falta no ambiente.
    return {
      ok: false,
      message: "Não foi possível salvar. Fale com o suporte para alterar os dados do negócio.",
    };
  }

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

  const { error } = await session.supabase
    .from("profiles")
    .update({ status: active ? "active" : "suspended" })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Troca o tipo de acesso de alguém da equipe. */
export async function changeEmployeeRole(id: string, roleId: string): Promise<ActionResult> {
  const session = await requireCustomer("alterar o acesso de um funcionário");
  if (!session.ok) return session;

  const { error } = await session.supabase.from("profiles").update({ role_id: roleId }).eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
