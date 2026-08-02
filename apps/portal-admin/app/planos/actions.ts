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
 * Edição de um módulo: a descrição e em quais planos ele aparece.
 *
 * As duas metades vivem em tabelas diferentes, e isso não é acidente. A
 * descrição é propriedade do MÓDULO (`modules.description`). Já "disponível
 * em" é propriedade da RELAÇÃO, e quem guarda é o PLANO (`plans.module_keys`)
 * — então marcar um plano aqui significa acrescentar a chave do módulo naquele
 * plano, e desmarcar, removê-la. É a mesma verdade, escrita do outro lado.
 *
 * Não é transacional: se a segunda metade falhar, a descrição fica gravada e a
 * composição não. As duas são independentes e reeditáveis, então o estrago é
 * pequeno perto de introduzir uma função de banco só para isto.
 */
export async function salvarModulo(
  moduloKey: string,
  descricao: string,
  planosMarcados: string[],
): Promise<ResultadoAcao> {
  const auth = await exigirAdmin("editar módulos");
  if (!auth.ok) return auth;

  // A descrição é do módulo e mora em `modules`. O nome fica de fora de
  // propósito: o formulário não expõe campo para ele, então gravá-lo aqui só
  // criaria a chance de sobrescrever com um valor que ninguém editou.
  const { error: erroDescricao } = await auth.supabase
    .from("modules")
    .update({ description: descricao.trim() || null })
    .eq("key", moduloKey);

  if (erroDescricao) {
    console.error("[salvarModulo] falha ao gravar descrição:", erroDescricao.message);
    return { ok: false, mensagem: `Não foi possível salvar: ${erroDescricao.message}` };
  }

  const { data: planos, error: erroLeitura } = await auth.supabase
    .from("plans")
    .select("key, is_custom, module_keys");

  if (erroLeitura || !planos) {
    return { ok: false, mensagem: "Não foi possível ler os planos." };
  }

  for (const p of planos) {
    // O customizado inclui tudo por definição — não entra na conta.
    if (p.is_custom) continue;

    const atuais: string[] = p.module_keys ?? [];
    const deveTer = planosMarcados.includes(p.key);
    const tem = atuais.includes(moduloKey);
    if (deveTer === tem) continue;

    const novos = deveTer ? [...atuais, moduloKey] : atuais.filter((k) => k !== moduloKey);

    const { error } = await auth.supabase
      .from("plans")
      .update({ module_keys: novos })
      .eq("key", p.key);

    if (error) {
      console.error("[salvarModulo] falha em", p.key, error.message);
      return { ok: false, mensagem: `Não foi possível salvar: ${error.message}` };
    }
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
