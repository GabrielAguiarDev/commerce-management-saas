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

/**
 * Exclui um plano do catálogo.
 *
 * ┌─ POR QUE A CHECAGEM DE CLIENTES É OBRIGATÓRIA ─────────────────────────┐
 * │ `tenants.plan` é uma coluna de TEXTO, sem chave estrangeira para       │
 * │ `plans.key`. O banco não impede apagar um plano que ainda está em uso  │
 * │ — os clientes simplesmente passariam a apontar para uma chave que não  │
 * │ existe mais, e o painel mostraria o selo vazio, o preço sumiria da     │
 * │ ficha e o cadastro recusaria aquele plano. A trava tem que ser aqui.   │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * A alternativa seria desativar (`is_active = false`), que já esconde o plano
 * das telas sem quebrar quem o usa. Exclusão de verdade fica reservada ao caso
 * em que ninguém mais o utiliza — que é o que a tela ajuda o admin a alcançar,
 * remanejando os clientes antes.
 */
export async function excluirPlano(chave: string): Promise<ResultadoAcao> {
  const auth = await exigirAdmin("excluir planos");
  if (!auth.ok) return auth;

  // O plano sob medida (`is_custom`) é ESTRUTURAL, não uma oferta comum: é ele
  // que permite montar qualquer combinação de módulos com valor negociado.
  // Sem ele, a ficha do cliente perde a única forma de fugir dos pacotes
  // fechados, e o cadastro fica sem opção para um cliente fora da tabela.
  // Por isso não se apaga — nem mesmo quando não há nenhum cliente nele.
  const { data: alvo, error: erroAlvo } = await auth.supabase
    .from("plans")
    .select("is_custom")
    .eq("key", chave)
    .maybeSingle();

  if (erroAlvo) return { ok: false, mensagem: "Não foi possível ler o plano." };
  if (!alvo) return { ok: false, mensagem: "Plano não encontrado." };
  if (alvo.is_custom) {
    return {
      ok: false,
      mensagem:
        "O plano sob medida não pode ser excluído — é ele que permite montar " +
        "módulos e valor por cliente.",
    };
  }

  // Um catálogo vazio quebraria o cadastro de clientes por completo.
  const { data: ativos, error: erroLista } = await auth.supabase
    .from("plans")
    .select("key")
    .eq("is_active", true);

  if (erroLista) return { ok: false, mensagem: "Não foi possível ler os planos." };
  if ((ativos ?? []).length <= 1) {
    return { ok: false, mensagem: "Este é o único plano ativo — a plataforma precisa de ao menos um." };
  }

  // `head: true` traz só a contagem, sem puxar as linhas.
  const { count, error: erroContagem } = await auth.supabase
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("plan", chave);

  if (erroContagem) {
    return { ok: false, mensagem: `Não foi possível verificar os clientes: ${erroContagem.message}` };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      mensagem:
        `Ainda há ${count} cliente(s) neste plano. Mude o plano deles antes de excluir.`,
    };
  }

  const { error } = await auth.supabase.from("plans").delete().eq("key", chave);

  if (error) {
    console.error("[excluirPlano] falha:", error.message);
    return { ok: false, mensagem: `Não foi possível excluir o plano: ${error.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
