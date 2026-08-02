import "server-only";

import { PACOTES_FIXOS, SIGLA_MODULO } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";
import type { Modulo } from "@/types/types";

/**
 * Catálogo de módulos, lido da tabela `modules`.
 *
 * POR QUE SAIU DO CÓDIGO: a lista vivia escrita à mão em `lib/planos.ts` e
 * repetia, campo a campo, o que a tabela `modules` já guardava. Duas fontes da
 * verdade para o mesmo fato: mexer numa e esquecer da outra fazia a ficha do
 * cliente deixar de casar um módulo com o outro, calada.
 *
 * O QUE CONTINUA EM CÓDIGO, de propósito:
 *   * `PACOTES_FIXOS` — quais módulos cada plano inclui é regra comercial, não
 *     dado; não existe tabela de planos (ver lib/planos.ts).
 *   * `SIGLA_MODULO` — as duas letras do ícone são decisão de interface e não
 *     têm coluna no banco.
 */

interface LinhaModulo {
  key: string;
  name: string | null;
  description: string | null;
  is_access: boolean | null;
}

const umTexto = (t: string) => ({ pt: t, en: t });

/** Planos que incluem um módulo. O customizado monta qualquer combinação. */
function planosComModulo(chave: string): string[] {
  const fixos = (["free", "paid"] as const).filter((p) => PACOTES_FIXOS[p].includes(chave));
  return [...fixos, "custom"];
}

function paraModulo(linha: LinhaModulo): Modulo {
  const nome = linha.name ?? linha.key;
  return {
    k: linha.key,
    ...(linha.is_access ? { tipo: "acesso" as const } : {}),
    nome: umTexto(nome),
    // Um módulo novo no banco, ainda sem sigla escolhida, cai nas duas
    // primeiras letras do nome em vez de aparecer sem ícone.
    sigla: SIGLA_MODULO[linha.key] ?? nome.slice(0, 2).toUpperCase(),
    desc: umTexto(linha.description ?? "—"),
    planos: planosComModulo(linha.key),
  };
}

export interface ResultadoModulos {
  modulos: Modulo[];
  erro: string | null;
}

export async function listarModulos(): Promise<ResultadoModulos> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { modulos: [], erro: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .select("key, name, description, is_access")
    .order("key");

  if (error) {
    console.error("[listarModulos] falha ao ler modules:", error.message);
    return { modulos: [], erro: `Não foi possível carregar os módulos: ${error.message}` };
  }

  const modulos = (data as LinhaModulo[]).map(paraModulo);

  // Um pacote de plano que aponta para um módulo inexistente no banco só
  // apareceria no cadastro, como erro da função `admin_create_tenant`. Melhor
  // gritar aqui, no log do servidor, na primeira vez que alguém abre o painel.
  const chaves = new Set(modulos.map((m) => m.k));
  const orfaos = [...PACOTES_FIXOS.free, ...PACOTES_FIXOS.paid].filter((k) => !chaves.has(k));
  if (orfaos.length > 0) {
    console.error(
      `[listarModulos] PACOTES_FIXOS aponta para módulos que não existem na tabela ` +
        `\`modules\`: ${[...new Set(orfaos)].join(", ")}. Ajuste lib/planos.ts ou o banco.`,
    );
  }

  return { modulos, erro: null };
}
