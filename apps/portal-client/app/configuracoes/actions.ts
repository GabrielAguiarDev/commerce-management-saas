"use server";

import { revalidatePath } from "next/cache";
import { permissoesParaBanco } from "@/lib/dados/equipe";
import { PORTAL_PARA_DB } from "@/lib/modulos";
import { exigirCliente, type ResultadoAcao } from "@/lib/sessao";
import type { DadosNegocio, ModuloKey } from "@/types/types";

/**
 * Salva os dados do negócio.
 *
 * Só `name`, `segment`, `phone` e `city` existem em `tenants`. Documento
 * (CNPJ/CPF) e endereço completo ainda não têm coluna — ver a análise do que
 * falta criar.
 */
export async function salvarDadosNegocio(d: DadosNegocio): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("alterar os dados do negócio");
  if (!sessao.ok) return sessao;

  if (!d.nome.trim()) return { ok: false, mensagem: "O negócio precisa de um nome." };

  const { error } = await sessao.supabase
    .from("tenants")
    .update({
      name: d.nome.trim(),
      segment: d.tipo.trim() || null,
      phone: d.telefone.trim() || null,
      city: d.cidade.trim() || null,
    })
    .eq("id", sessao.tenantId);

  if (error) {
    // O RLS pode recusar a escrita se a política de `tenants` for só de
    // leitura para o dono — ver a análise.
    return {
      ok: false,
      mensagem: "Não foi possível salvar. Fale com o suporte para alterar os dados do negócio.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Tipos de acesso                                                             */
/* -------------------------------------------------------------------------- */

export async function salvarPapel(p: {
  id: string | null;
  nome: string;
  modulos: ModuloKey[];
}): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("alterar os tipos de acesso");
  if (!sessao.ok) return sessao;

  if (!p.nome.trim()) return { ok: false, mensagem: "Dê um nome ao tipo de acesso." };

  const { supabase, tenantId } = sessao;
  const campos = {
    name: p.nome.trim(),
    permissions: permissoesParaBanco(p.modulos, PORTAL_PARA_DB),
  };

  const { error } = p.id
    ? await supabase.from("roles").update(campos).eq("id", p.id).eq("is_owner", false)
    : await supabase.from("roles").insert({ tenant_id: tenantId, is_owner: false, ...campos });

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removerPapel(id: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("remover um tipo de acesso");
  if (!sessao.ok) return sessao;
  const { supabase } = sessao;

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", id);

  if (count) {
    return { ok: false, mensagem: "Há funcionários usando este tipo de acesso." };
  }

  // `is_owner = false` na condição: o tipo do dono não sai nem por engano.
  const { error } = await supabase.from("roles").delete().eq("id", id).eq("is_owner", false);
  if (error) return { ok: false, mensagem: error.message };

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
export async function alternarFuncionario(id: string, ativo: boolean): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("alterar o acesso de um funcionário");
  if (!sessao.ok) return sessao;

  if (id === sessao.usuarioId) {
    return { ok: false, mensagem: "Você não pode suspender o seu próprio acesso." };
  }

  const { error } = await sessao.supabase
    .from("profiles")
    .update({ status: ativo ? "active" : "suspended" })
    .eq("id", id);

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Troca o tipo de acesso de alguém da equipe. */
export async function mudarPapelDoFuncionario(id: string, papelId: string): Promise<ResultadoAcao> {
  const sessao = await exigirCliente("alterar o acesso de um funcionário");
  if (!sessao.ok) return sessao;

  const { error } = await sessao.supabase.from("profiles").update({ role_id: papelId }).eq("id", id);

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
