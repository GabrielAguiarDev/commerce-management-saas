"use server";

import { revalidatePath } from "next/cache";
import { permissionsToDb } from "@/lib/dados/equipe";
import { PORTAL_TO_DB } from "@/lib/modulos";
import { requireCustomer, type ActionResult } from "@/lib/sessao";
import type { BusinessData, ModuleKey } from "@/types/types";

/**
 * Salva os dados do negócio.
 *
 * Só `name`, `segment`, `phone` e `city` existem em `tenants`. Documento
 * (CNPJ/CPF) e endereço completo ainda não têm coluna — ver a análise do que
 * falta criar.
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
    // O RLS pode recusar a escrita se a política de `tenants` for só de
    // leitura para o dono — ver a análise.
    return {
      ok: false,
      message: "Não foi possível salvar. Fale com o suporte para alterar os dados do negócio.",
    };
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
