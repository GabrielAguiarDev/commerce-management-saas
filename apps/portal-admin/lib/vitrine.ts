import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Loc } from "@/types/types";

/**
 * A vitrine de planos da landing page.
 *
 * ┌─ O QUE ESTA TELA EDITA, E O QUE ELA SÓ MOSTRA ─────────────────────────┐
 * │ EDITA (mora em `plan_showcase`): a lista de "✓", o texto do botão, o   │
 * │ que vem ao lado do número, o destaque, a ordem e a publicação.         │
 * │                                                                        │
 * │ SÓ MOSTRA (vem de `plans`): título, descrição e preço. Os três têm um  │
 * │ lugar só, que é o catálogo, e mudá-los é mudar lá. Não há cópia aqui   │
 * │ nem sincronização — a leitura abaixo junta as duas tabelas na hora, e  │
 * │ é por isso que console e site não têm como divergir.                   │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * TODO PLANO ATIVO É UM CARTÃO. Não existe mais "plano sem cartão": criar um
 * plano na tela de Planos já o coloca na lista daqui e no site. Quem tira do
 * ar é o interruptor `visible`, não a ausência de uma linha — e um plano sem
 * linha de vitrine ainda aparece, com os campos de apresentação vazios.
 *
 * SEGURANÇA: leitura com o cliente de sessão, sob RLS. A policy
 * `plan_showcase_admin_all` e a de `plans` fazem o recorte.
 */

/** A linha de apresentação, como o banco a guarda. */
interface ShowcaseRow {
  plan_key: string;
  cta_label_pt: string;
  cta_label_en: string;
  price_unit_pt: string;
  price_unit_en: string;
  features_pt: string[] | null;
  features_en: string[] | null;
  featured: boolean;
  visible: boolean;
  sort_order: number;
}

const SELECT =
  "plan_key, cta_label_pt, cta_label_en, price_unit_pt, price_unit_en, features_pt, features_en, featured, visible, sort_order";

/** Uma lista de texto traduzida — os itens com "✓" do cartão. */
export interface LocList {
  pt: string[];
  en: string[];
}

export interface ShowcaseCard {
  planKey: string;

  /* --- de `plans`, só leitura ------------------------------------------ */
  /** `plans.name`. É o título que o site publica. */
  title: string;
  /** `plans.description`. É a frase de apoio que o site publica. */
  subtitle: string;
  /** O preço exatamente como a landing vai escrevê-lo, ou `null`. */
  price: string | null;

  /* --- de `plan_showcase`, editável ------------------------------------ */
  ctaLabel: Loc;
  priceUnit: Loc;
  features: LocList;
  featured: boolean;
  visible: boolean;
  sortOrder: number;

  /** O plano ainda não tem linha de apresentação — tudo em branco. */
  semApresentacao: boolean;
}

/**
 * O preço COMO A LANDING O ESCREVE. Não é o formato do console.
 *
 * ┌─ ESTE FORMATO TEM UM GÊMEO ────────────────────────────────────────────┐
 * │ `apps/landing-page/lib/vitrine.ts` tem a mesma função, com a mesma     │
 * │ regra, porque os dois apps não compartilham código. Mudar um sem o     │
 * │ outro faz o console PROMETER um preço e a página publicar outro.       │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Sem centavos quando são zero — na dobra de planos o número sai em corpo 38,
 * e um ",00" pendurado ali só ocupa espaço. `lib/money.ts` do console exige os
 * centavos pelo motivo oposto: lá o número é lido de volta como dinheiro.
 */
export function landingPrice(price: number | string | null, id: "pt" | "en"): string | null {
  if (price === null || price === undefined) return id === "pt" ? "Sob consulta" : "On request";
  const n = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(n)) return null;
  return "R$ " + (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
}

export interface ShowcaseResult {
  cards: ShowcaseCard[];
  error: string | null;
}

export async function listShowcase(id: "pt" | "en" = "pt"): Promise<ShowcaseResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { cards: [], error: "Supabase não configurado." };
  }

  const supabase = await createClient();

  // Duas consultas em paralelo, e não um embed do PostgREST: o cruzamento é
  // de dois campos e acontece aqui do lado, enquanto o embed dependeria de o
  // PostgREST reconhecer a chave estrangeira para nunca errar — e quando ele
  // erra, erra em produção, devolvendo `null` em silêncio.
  //
  // A CONSULTA A `plans` É A QUE MANDA: é dela que sai a lista de cartões,
  // porque todo plano ativo é um cartão. `plan_showcase` só acrescenta.
  const [catalogo, vitrine] = await Promise.all([
    supabase.from("plans").select("key, name, description, price, is_active, sort_order"),
    supabase.from("plan_showcase").select(SELECT),
  ]);

  if (catalogo.error) {
    console.error("[listarVitrine] falha ao ler plans:", catalogo.error.message);
    return { cards: [], error: `Não foi possível carregar os planos: ${catalogo.error.message}` };
  }

  if (vitrine.error) {
    console.error("[listarVitrine] falha ao ler plan_showcase:", vitrine.error.message);
    return { cards: [], error: `Não foi possível carregar a vitrine: ${vitrine.error.message}` };
  }

  const apresentacao = new Map(
    ((vitrine.data ?? []) as ShowcaseRow[]).map((r) => [r.plan_key, r]),
  );

  const cards = (catalogo.data ?? [])
    .filter((p) => p.is_active)
    .map((p): ShowcaseCard => {
      const s = apresentacao.get(p.key as string);

      return {
        planKey: p.key as string,

        title: (p.name as string) ?? (p.key as string),
        subtitle: (p.description as string) ?? "",
        // O cartão oculto não mostra preço na tela pelo mesmo motivo que não
        // mostra no site: `plan_showcase_price` devolve `null` para ele, e a
        // tela tem de dizer a mesma coisa que a página vai fazer.
        price: s && !s.visible ? null : landingPrice(p.price as number | null, id),

        ctaLabel: { pt: s?.cta_label_pt ?? "", en: s?.cta_label_en ?? "" },
        priceUnit: { pt: s?.price_unit_pt ?? "", en: s?.price_unit_en ?? "" },
        features: { pt: s?.features_pt ?? [], en: s?.features_en ?? [] },
        featured: s?.featured ?? false,
        visible: s?.visible ?? true,
        sortOrder: s?.sort_order ?? (p.sort_order as number) ?? 0,

        semApresentacao: !s,
      };
    })
    // A ordem da PÁGINA, que é a de `plan_showcase` e não a do catálogo.
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return { cards, error: null };
}
