import "server-only";

import { isComingSoon, isCoreCapability, MODULE_INITIALS } from "@/lib/planos";
import { createClient } from "@/lib/supabase/server";
import type { Module, Plan } from "@/types/types";

/**
 * Catálogo de módulos, lido da tabela `modules`.
 *
 * POR QUE SAIU DO CÓDIGO: a lista vivia escrita à mão em `lib/planos.ts` e
 * repetia, field a field, o que a tabela `modules` já guardava. Duas fontes da
 * verdade para o mesmo fato: mexer numa e esquecer da outra fazia a ficha do
 * cliente deixar de casar um módulo com o outro, calada.
 *
 * O QUE CONTINUA EM CÓDIGO, de propósito:
 *   * `SIGLA_MODULO` — as duas letras do ícone são decisão de interface e não
 *     têm coluna no banco.
 */

interface ModuleRow {
  key: string;
  name: string | null;
  description: string | null;
  is_access: boolean | null;
}

const umTexto = (t: string) => ({ pt: t, en: t });

function toModule(linha: ModuleRow, plans: Plan[]): Module {
  const name = linha.name ?? linha.key;
  return {
    k: linha.key,
    ...(linha.is_access ? { type: "acesso" as const } : {}),
    ...(isComingSoon(linha.key) ? { comingSoon: true as const } : {}),
    name: umTexto(name),
    // Um módulo novo no banco, ainda sem sigla escolhida, cai nas duas
    // primeiras letras do nome em vez de aparecer sem ícone.
    initials: MODULE_INITIALS[linha.key] ?? name.slice(0, 2).toUpperCase(),
    desc: umTexto(linha.description ?? "—"),
    // "Disponível em" é derivado de `plans.module_keys`: um módulo aparece nos
    // planos que o incluem, mais o customizado, que monta qualquer combinação.
    plans: [
      ...plans.filter((p) => p.type === "fixed" && p.mods.includes(linha.key)).map((p) => p.k),
      ...plans.filter((p) => p.type === "custom").map((p) => p.k),
    ],
  };
}

export interface ModulesResult {
  /** O catálogo vendável — sem os módulos em breve. */
  modules: Module[];
  /** Os módulos em breve, à parte. Ver `COMING_SOON_MODULES` em `lib/planos.ts`. */
  comingSoon: Module[];
  error: string | null;
}

/**
 * `planos` entra como argumento porque "disponível em" é propriedade da
 * relação, não do módulo: quem guarda isso é `plans.module_keys`. Recebendo a
 * lista já lida, evitamos uma segunda consulta e garantimos que as duas telas
 * enxerguem exatamente o mesmo catálogo.
 *
 * Aceita a PROMESSA da lista, e não só a lista pronta, porque a dependência
 * entre as duas leituras é menor do que parece: só o cruzamento no fim precisa
 * dos planos — a consulta a `modules` não precisa de nada. Esperando os planos
 * aqui dentro, e não antes da chamada, as duas viajam ao banco juntas em vez de
 * uma atrás da outra. Ver o layout raiz.
 */
export async function listModules(plans: Plan[] | Promise<Plan[]>): Promise<ModulesResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { modules: [], comingSoon: [], error: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const [{ data, error }, planList] = await Promise.all([
    supabase.from("modules").select("key, name, description, is_access").order("key"),
    plans,
  ]);

  if (error) {
    console.error("[listarModulos] falha ao ler modules:", error.message);
    return {
      modules: [],
      comingSoon: [],
      error: `Não foi possível carregar os módulos: ${error.message}`,
    };
  }

  const fullCatalog = (data as ModuleRow[]).map((l) => toModule(l, planList));

  // Capacidades essenciais têm navegação própria e não entram em planos,
  // contagens de adoção ou seletores. O filtro também protege o intervalo
  // entre publicar o código e aplicar a migration que remove a linha legada.
  const catalog = fullCatalog.filter((m) => !isCoreCapability(m.k));

  // A separação acontece aqui, na leitura, e não em cada tela: assim `modulos`
  // é sempre o que se pode vender, e nenhuma grade, contagem ou chip precisa se
  // lembrar de filtrar. Ver `COMING_SOON_MODULES` em `lib/planos.ts`.
  const modules = catalog.filter((m) => !m.comingSoon);
  const comingSoon = catalog.filter((m) => m.comingSoon);

  // Um plano que aponta para um módulo inexistente só apareceria no cadastro,
  // como erro da função `admin_create_tenant`. Melhor gritar aqui, no log do
  // servidor, na primeira vez que alguém abre o painel.
  //
  // A conferência é contra o CATÁLOGO INTEIRO: um plano que ainda inclua um
  // módulo em breve não é um plano quebrado — é um plano cuja chave vai ser
  // ignorada na hora de ativar (`resolveModules`), e avisar de órfão aqui só
  // produziria ruído no log.
  const keys = new Set(fullCatalog.map((m) => m.k));
  const orphans = planList.flatMap((p) => p.mods).filter((k) => !keys.has(k));
  if (orphans.length > 0) {
    console.error(
      `[listarModulos] \`plans.module_keys\` aponta para módulos que não existem em ` +
        `\`modules\`: ${[...new Set(orphans)].join(", ")}.`,
    );
  }

  return { modules, comingSoon, error: null };
}
