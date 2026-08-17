"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, type ActionResult } from "@/lib/autorizacao";
import { revalidarLanding } from "@/lib/revalidarLanding";

/**
 * Edição da VITRINE — a apresentação dos planos na landing page.
 *
 * ┌─ O QUE ESTAS AÇÕES NÃO PODEM FAZER ────────────────────────────────────┐
 * │ Nenhuma escreve em `plans`. Nenhuma lê ou grava `module_keys`. Nenhuma │
 * │ guarda preço, título ou descrição — os três vêm do catálogo na hora da │
 * │ leitura, e não existe caminho daqui para mudá-los. Quem quiser mudar o │
 * │ título que o site publica muda na tela de Planos, que é onde ele mora. │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ TUDO AQUI É UPSERT, E POR QUÊ ────────────────────────────────────────┐
 * │ Todo plano ativo aparece na vitrine, TENHA OU NÃO uma linha em         │
 * │ `plan_showcase` — um plano recém-criado na tela de Planos já está no   │
 * │ site, com o título e o preço dele e o resto em branco. A primeira      │
 * │ edição (ou o primeiro clique no interruptor) é que cria a linha. Um    │
 * │ `update` simples não gravaria nada nesse caso, e falharia calado: a    │
 * │ tela diria "salvo" e nada teria mudado.                                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Toda ação termina em `revalidatePath` (o console relê) e em
 * `revalidarLanding` (o site relê). A segunda NUNCA derruba a primeira: o dado
 * já está salvo quando ela roda — ver `lib/revalidarLanding.ts`.
 */

/** O que o formulário manda. Só apresentação — não há título nem preço. */
export interface ShowcaseInput {
  ctaPt: string;
  ctaEn: string;
  unitPt: string;
  unitEn: string;
  /** Uma feature por linha, como o textarea entrega. */
  featuresPt: string;
  featuresEn: string;
  featured: boolean;
}

/** "a\n\nb\n " → ["a","b"]. Linha em branco não vira "✓" vazio no site. */
function toList(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * O inglês cai no português quando está em branco.
 *
 * A página é servida em pt-BR e ainda não tem troca de idioma, então exigir a
 * tradução para salvar travaria o trabalho de hoje por causa de uma tela que
 * ainda não existe.
 */
const ouPt = (en: string, pt: string) => (en.trim() ? en.trim() : pt.trim());

/**
 * A ordem em que este plano entra, quando a linha está sendo criada agora.
 *
 * Vai para o fim da lista. Sem isto, todo cartão novo nasceria com zero e
 * empataria com os outros recém-criados, e a ordem da página passaria a
 * depender de como o Postgres devolveu as linhas naquele dia.
 */
type Autorizado = Extract<Awaited<ReturnType<typeof requireAdmin>>, { ok: true }>;

async function proximaOrdem(supabase: Autorizado["supabase"]): Promise<number> {
  const { data } = await supabase
    .from("plan_showcase")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data?.sort_order as number | undefined) ?? 0) + 1;
}

export async function saveShowcaseCard(
  planKey: string,
  input: ShowcaseInput,
): Promise<ActionResult> {
  const auth = await requireAdmin("editar a vitrine do site");
  if (!auth.ok) return auth;

  if (!planKey) return { ok: false, message: "Cartão não identificado." };

  const featuresPt = toList(input.featuresPt);
  const featuresEn = toList(input.featuresEn);

  // A linha pode não existir ainda; se não existir, ela nasce publicada e no
  // fim da lista. Se existir, `visible` e `sort_order` NÃO entram no upsert —
  // são de outros dois controles, e sobrescrevê-los aqui republicaria um
  // cartão que alguém acabou de tirar do ar.
  const { data: atual } = await auth.supabase
    .from("plan_showcase")
    .select("visible, sort_order")
    .eq("plan_key", planKey)
    .maybeSingle();

  const { error } = await auth.supabase.from("plan_showcase").upsert(
    {
      plan_key: planKey,
      cta_label_pt: input.ctaPt.trim(),
      cta_label_en: ouPt(input.ctaEn, input.ctaPt),
      price_unit_pt: input.unitPt.trim(),
      price_unit_en: ouPt(input.unitEn, input.unitPt),
      features_pt: featuresPt,
      // Lista vazia em inglês espelha a portuguesa, pelo mesmo motivo do texto.
      features_en: featuresEn.length ? featuresEn : featuresPt,
      featured: input.featured,
      visible: atual?.visible ?? true,
      sort_order: atual?.sort_order ?? (await proximaOrdem(auth.supabase)),
    },
    { onConflict: "plan_key" },
  );

  if (error) {
    console.error("[salvarVitrine] falha:", error.message);
    return { ok: false, message: `Não foi possível salvar o cartão: ${error.message}` };
  }

  revalidatePath("/", "layout");
  await revalidarLanding();
  return { ok: true };
}

/** Publica ou tira do ar um cartão, sem perder a apresentação. */
export async function toggleShowcaseVisible(
  planKey: string,
  visible: boolean,
): Promise<ActionResult> {
  const auth = await requireAdmin("publicar ou ocultar um cartão da vitrine");
  if (!auth.ok) return auth;

  const { data: atual } = await auth.supabase
    .from("plan_showcase")
    .select("sort_order")
    .eq("plan_key", planKey)
    .maybeSingle();

  const { error } = await auth.supabase.from("plan_showcase").upsert(
    {
      plan_key: planKey,
      visible,
      sort_order: (atual?.sort_order as number | undefined) ?? (await proximaOrdem(auth.supabase)),
    },
    { onConflict: "plan_key" },
  );

  if (error) {
    console.error("[alternarVisivelVitrine] falha:", error.message);
    return { ok: false, message: `Não foi possível alterar a visibilidade: ${error.message}` };
  }

  revalidatePath("/", "layout");
  await revalidarLanding();
  return { ok: true };
}

/**
 * Reordena os cartões.
 *
 * Recebe a LISTA INTEIRA na ordem desejada e reescreve `sort_order` como 1..n,
 * em vez de trocar dois vizinhos de lugar. Troca de pares depende de os
 * valores atuais estarem sãos — dois cartões com o mesmo `sort_order`, ou um
 * buraco na sequência, e a troca não faz nada visível ou faz duas vezes. Aqui
 * a lista que o admin vê É a ordem que vai ao banco, sempre.
 *
 * `upsert` porque um plano da lista pode ainda não ter linha: mover um cartão
 * recém-criado para cima é uma das primeiras coisas que se faz com ele.
 */
export async function reorderShowcase(planKeys: string[]): Promise<ActionResult> {
  const auth = await requireAdmin("reordenar a vitrine");
  if (!auth.ok) return auth;

  if (!planKeys.length) return { ok: true };

  const { error } = await auth.supabase.from("plan_showcase").upsert(
    planKeys.map((key, i) => ({ plan_key: key, sort_order: i + 1 })),
    { onConflict: "plan_key" },
  );

  if (error) {
    console.error("[reordenarVitrine] falha:", error.message);
    return { ok: false, message: `Não foi possível reordenar: ${error.message}` };
  }

  revalidatePath("/", "layout");
  await revalidarLanding();
  return { ok: true };
}
