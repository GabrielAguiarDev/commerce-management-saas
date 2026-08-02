import "server-only";

import { SIGLA_MODULO } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";
import type { Modulo, Plano } from "@/types/types";

/**
 * Catálogo de módulos, lido da tabela `modules`.
 *
 * POR QUE SAIU DO CÓDIGO: a lista vivia escrita à mão em `lib/planos.ts` e
 * repetia, campo a campo, o que a tabela `modules` já guardava. Duas fontes da
 * verdade para o mesmo fato: mexer numa e esquecer da outra fazia a ficha do
 * cliente deixar de casar um módulo com o outro, calada.
 *
 * O QUE CONTINUA EM CÓDIGO, de propósito:
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

function paraModulo(linha: LinhaModulo, planos: Plano[]): Modulo {
  const nome = linha.name ?? linha.key;
  return {
    k: linha.key,
    ...(linha.is_access ? { tipo: "acesso" as const } : {}),
    nome: umTexto(nome),
    // Um módulo novo no banco, ainda sem sigla escolhida, cai nas duas
    // primeiras letras do nome em vez de aparecer sem ícone.
    sigla: SIGLA_MODULO[linha.key] ?? nome.slice(0, 2).toUpperCase(),
    desc: umTexto(linha.description ?? "—"),
    // "Disponível em" é derivado de `plans.module_keys`: um módulo aparece nos
    // planos que o incluem, mais o customizado, que monta qualquer combinação.
    planos: [
      ...planos.filter((p) => p.tipo === "fixo" && p.mods.includes(linha.key)).map((p) => p.k),
      ...planos.filter((p) => p.tipo === "custom").map((p) => p.k),
    ],
  };
}

export interface ResultadoModulos {
  modulos: Modulo[];
  erro: string | null;
}

/**
 * `planos` entra como argumento porque "disponível em" é propriedade da
 * relação, não do módulo: quem guarda isso é `plans.module_keys`. Recebendo a
 * lista já lida, evitamos uma segunda consulta e garantimos que as duas telas
 * enxerguem exatamente o mesmo catálogo.
 */
export async function listarModulos(planos: Plano[]): Promise<ResultadoModulos> {
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

  const modulos = (data as LinhaModulo[]).map((l) => paraModulo(l, planos));

  // Um plano que aponta para um módulo inexistente só apareceria no cadastro,
  // como erro da função `admin_create_tenant`. Melhor gritar aqui, no log do
  // servidor, na primeira vez que alguém abre o painel.
  const chaves = new Set(modulos.map((m) => m.k));
  const orfaos = planos.flatMap((p) => p.mods).filter((k) => !chaves.has(k));
  if (orfaos.length > 0) {
    console.error(
      `[listarModulos] \`plans.module_keys\` aponta para módulos que não existem em ` +
        `\`modules\`: ${[...new Set(orfaos)].join(", ")}.`,
    );
  }

  return { modulos, erro: null };
}
