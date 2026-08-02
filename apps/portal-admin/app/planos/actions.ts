"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin, type ResultadoAcao } from "@/lib/autorizacao";

/**
 * Edição do catálogo de planos — grava em `plans` de verdade.
 *
 * Antes isto mexia só na memória do navegador e um reload desfazia. Agora a
 * oferta é dado, e mudar um preço aqui muda o que o cadastro de cliente vai
 * cobrar (ver `app/clientes/actions.ts`, que lê a mesma tabela).
 */

/** "R$ 149,90" → 149.9. O formulário guarda o valor já formatado. */
function paraNumero(valor: string): number | null {
  const limpo = valor.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  const n = Number(
    limpo
      // Separador de milhar: "1.234,00" → "1234,00".
      .replace(/\.(?=\d{3}\b)/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function salvarPlano(
  chave: string,
  nome: string,
  precoFormatado: string,
  descricao: string,
  moduloKeys: string[],
): Promise<ResultadoAcao> {
  const auth = await exigirAdmin("editar planos");
  if (!auth.ok) return auth;

  if (!nome.trim()) return { ok: false, mensagem: "Informe o nome do plano." };

  // Precisamos saber se é customizado ANTES de decidir o que gravar: o preço
  // do customizado é negociado por cliente e a coluna fica nula.
  const { data: atual, error: erroLeitura } = await auth.supabase
    .from("plans")
    .select("is_custom")
    .eq("key", chave)
    .single();

  if (erroLeitura || !atual) return { ok: false, mensagem: "Plano não encontrado." };

  const preco = atual.is_custom ? null : paraNumero(precoFormatado);

  if (!atual.is_custom && preco === null) {
    return { ok: false, mensagem: "Informe um preço válido para este plano." };
  }

  const { error } = await auth.supabase
    .from("plans")
    .update({
      name: nome.trim(),
      description: descricao.trim() || null,
      price: preco,
      // O customizado não tem composição fixa; gravar módulos nele seria
      // contradizer o próprio conceito do plano.
      module_keys: atual.is_custom ? [] : [...new Set(moduloKeys)],
    })
    .eq("key", chave);

  if (error) {
    console.error("[salvarPlano] falha:", error.message);
    return { ok: false, mensagem: `Não foi possível salvar o plano: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Edição de um módulo — apenas a descrição.
 *
 * A RELAÇÃO módulo↔plano NÃO se edita por aqui, de propósito. Quem a guarda é
 * `plans.module_keys`, e ela é definida só na tela de Planos. Antes dava para
 * mexer nela pelos dois lados, o que criava duas fontes da verdade para o
 * mesmo fato: marcar "Pago" na ficha do módulo e remover aquele módulo do
 * plano Pago eram edições contraditórias, e a última a gravar vencia.
 *
 * A tela de Módulos continua MOSTRANDO em quais planos o módulo está, mas como
 * valor derivado de `plans.module_keys` (ver `lib/modulos.ts`) — leitura, não
 * edição. Assim os dois lados não têm como discordar.
 */
export async function salvarModulo(
  moduloKey: string,
  descricao: string,
): Promise<ResultadoAcao> {
  const auth = await exigirAdmin("editar módulos");
  if (!auth.ok) return auth;

  // O nome fica de fora: o formulário não expõe campo para ele, então gravá-lo
  // aqui só criaria a chance de sobrescrever com um valor que ninguém editou.
  const { error } = await auth.supabase
    .from("modules")
    .update({ description: descricao.trim() || null })
    .eq("key", moduloKey);

  if (error) {
    console.error("[salvarModulo] falha ao gravar descrição:", error.message);
    return { ok: false, mensagem: `Não foi possível salvar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Cria um plano novo.
 *
 * A chave é derivada do nome porque `plans.key` é a chave primária e também o
 * valor gravado em `tenants.plan` — precisa ser estável e legível. Um nome que
 * não gere nenhum caractere válido (só símbolos) é recusado em vez de virar uma
 * chave vazia.
 */
export async function criarPlano(
  nome: string,
  precoFormatado: string,
  descricao: string,
  moduloKeys: string[],
): Promise<ResultadoAcao> {
  const auth = await exigirAdmin("criar planos");
  if (!auth.ok) return auth;

  if (!nome.trim()) return { ok: false, mensagem: "Informe o nome do plano." };

  const chave = nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!chave) return { ok: false, mensagem: "O nome do plano precisa ter letras ou números." };

  const preco = paraNumero(precoFormatado);
  if (preco === null) return { ok: false, mensagem: "Informe um preço válido para este plano." };

  // Vai para o fim da lista: `sort_order` é o que ordena os cartões da tela.
  const { data: ultimo } = await auth.supabase
    .from("plans")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await auth.supabase.from("plans").insert({
    key: chave,
    name: nome.trim(),
    description: descricao.trim() || null,
    price: preco,
    is_custom: false,
    module_keys: [...new Set(moduloKeys)],
    is_active: true,
    sort_order: (ultimo?.sort_order ?? 0) + 1,
  });

  if (error) {
    console.error("[criarPlano] falha:", error.message);
    const duplicado = /duplicate|unique/i.test(error.message);
    return {
      ok: false,
      mensagem: duplicado
        ? "Já existe um plano com esse nome."
        : `Não foi possível criar o plano: ${error.message}`,
    };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
