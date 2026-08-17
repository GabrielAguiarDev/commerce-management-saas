import { COPY } from "@/lib/dictionary";

/**
 * Os cartões da dobra de planos, vindos do banco.
 *
 * A página continua ESTÁTICA. Esta leitura acontece no build e, depois dele,
 * quando o cache expira ou quando o console avisa que a vitrine mudou (ver
 * `app/api/revalidate/route.ts`). Nenhuma visita dispara consulta nenhuma: o
 * visitante recebe HTML pronto, como sempre recebeu.
 *
 * ┌─ POR QUE `fetch` E NÃO O CLIENTE DO SUPABASE ──────────────────────────┐
 * │ A landing não tem nenhuma dependência de banco, e esta leitura não     │
 * │ justifica a primeira: é UM GET, sem sessão, sem cookie, sem realtime.  │
 * │ O que o cliente oficial traria — tipos, auth, refresh de token — não   │
 * │ se usa aqui. `fetch` mantém o `package.json` do site com quatro        │
 * │ dependências, que é o que faz o build durar um segundo.                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ ESTA FUNÇÃO NÃO TEM COMO FALHAR ──────────────────────────────────────┐
 * │ Nenhum caminho aqui lança. Banco fora do ar, variável faltando, JSON   │
 * │ estranho, LISTA VAZIA — tudo termina no mesmo lugar, que é a copy que  │
 * │ já estava no ar. Uma dobra de planos em branco é pior que uma dobra    │
 * │ desatualizada, e um build que quebra porque o Supabase piscou é pior   │
 * │ que os dois.                                                           │
 * └────────────────────────────────────────────────────────────────────────┘
 */

/** Um cartão pronto para desenhar. */
export interface PlanCard {
  /** Estável entre re-renders; vira a `key` do React. */
  id: string;
  name: string;
  pitch: string;
  /** Já formatado, ou `null` quando não há preço a mostrar. */
  price: string | null;
  unit: string;
  cta: string;
  features: string[];
  /** Etiqueta "Recomendado" e cartão em petrol. */
  featured: boolean;
}

/**
 * A linha da view, como o PostgREST a entrega.
 *
 * `title` e `subtitle` NÃO TÊM SUFIXO DE IDIOMA: eles vêm de `plans.name` e
 * `plans.description`, que são uma coluna de texto cada — o catálogo não tem
 * tradução, e o console os edita na tela de Planos. Dos campos que a vitrine
 * de fato guarda, aqui se pede só os `_pt`: a página é servida em pt-BR e
 * `COPY` aponta direto para `pt` (ver `dictionary.ts`). Quando a troca de
 * idioma chegar, esta lista ganha os `_en`.
 */
interface ShowcaseRow {
  /** `plans.name` — um idioma só; o catálogo não tem tradução. */
  title: string;
  /** `plans.description`, idem. */
  subtitle: string;
  cta_label_pt: string;
  price_unit_pt: string;
  features_pt: string[] | null;
  price: number | string | null;
  featured: boolean;
  sort_order: number;
}

const SELECT =
  "title,subtitle,cta_label_pt,price_unit_pt,features_pt,price,featured,sort_order";

/**
 * O preço COMO A PÁGINA O ESCREVE.
 *
 * ┌─ ESTE FORMATO TEM UM GÊMEO ────────────────────────────────────────────┐
 * │ `apps/portal-admin/lib/vitrine.ts` tem a mesma função, com a mesma     │
 * │ regra, porque os dois apps não compartilham código. É de propósito que │
 * │ o console mostre o preço no formato DAQUI e não no dele: quem escreve  │
 * │ a copy precisa ver o que o visitante vai ver. Mudar um sem o outro faz │
 * │ o console prometer um número e a página publicar outro.                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Sem centavos quando são zero: na dobra de planos o número sai em corpo 38,
 * e um ",00" pendurado ali só ocupa espaço. `R$ 89`, `R$ 89,90`.
 */
function formatPrice(price: number | string | null): string | null {
  if (price === null || price === undefined) return null;
  const n = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(n)) return null;
  return "R$ " + (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
}

/**
 * A copy que está no ar hoje, montada do dicionário.
 *
 * ┌─ O FALLBACK NÃO CARREGA NÚMERO ────────────────────────────────────────┐
 * │ `price: null` nos dois cartões — que a página desenha como "Sob        │
 * │ consulta" — e não o valor de cada plano. Um preço escrito em código é  │
 * │ um preço que envelhece sem avisar: no dia em que este socorro fosse    │
 * │ usado, ele publicaria o número que estava certo no dia em que foi      │
 * │ digitado. Uma página que diz "Sob consulta" com o botão funcionando é  │
 * │ honesta; uma que anuncia R$ 89 de uma constante de seis meses atrás    │
 * │ mente para o visitante e para o caixa.                                 │
 * │                                                                        │
 * │ O TEXTO, esse sim, vem inteiro daqui — que é o que impede a dobra de   │
 * │ subir vazia.                                                           │
 * └────────────────────────────────────────────────────────────────────────┘
 */
function fallback(): PlanCard[] {
  const { free, full } = COPY.plans;

  return [
    {
      id: "fallback-free",
      name: free.name,
      pitch: free.pitch,
      price: null,
      unit: free.unit,
      cta: free.cta,
      features: free.features,
      featured: false,
    },
    {
      id: "fallback-full",
      name: full.name,
      pitch: full.pitch,
      price: null,
      unit: full.unit,
      cta: full.cta,
      features: full.features,
      featured: true,
    },
  ];
}

function toCard(r: ShowcaseRow, i: number): PlanCard {
  return {
    id: `${i}-${r.title}`,
    name: r.title,
    pitch: r.subtitle,
    price: formatPrice(r.price),
    unit: r.price_unit_pt,
    // ┌─ O BOTÃO NUNCA FICA SEM TEXTO ────────────────────────────────────┐
    // │ Todo plano ativo do catálogo vira cartão, tenha ou não alguém     │
    // │ escrito a apresentação dele no console — um plano criado hoje já  │
    // │ está no site hoje, com o título e o preço e o resto em branco. Um │
    // │ botão vazio seria um retângulo mudo no meio do cartão, então a    │
    // │ chamada da barra de topo entra no lugar.                          │
    // └───────────────────────────────────────────────────────────────────┘
    cta: r.cta_label_pt?.trim() || COPY.nav.cta,
    features: r.features_pt ?? [],
    featured: r.featured,
  };
}

export async function fetchPlanCards(): Promise<PlanCard[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[vitrine] SUPABASE_URL/SUPABASE_ANON_KEY ausentes — usando a copy do código.");
    return fallback();
  }

  try {
    const res = await fetch(`${url}/rest/v1/plan_showcase_public?select=${SELECT}&order=sort_order`, {
      headers: { apikey: key },
      // ┌─ POR QUE TAG, E NÃO `no-store` NEM SÓ TEMPO ──────────────────────┐
      // │ `cache: "no-store"` aqui NÃO serve, e isto foi medido: o Next     │
      // │ recusa prerenderizar uma rota que faz leitura sem cache e joga a  │
      // │ página inteira para renderização dinâmica (`ƒ /` no build) — uma  │
      // │ consulta ao banco por visita, que é exatamente o que esta dobra   │
      // │ não pode virar.                                                   │
      // │                                                                   │
      // │ Só `revalidate` também não bastava. O cache de fetch sobrevive em │
      // │ `.next/cache` de um build para o outro, e a Vercel o restaura     │
      // │ entre deploys: um `pnpm build` logo depois de editar a vitrine    │
      // │ republicava o conteúdo ANTIGO. O deploy feito para publicar a     │
      // │ mudança era justamente o que não a publicava.                     │
      // │                                                                   │
      // │ Quem resolve isso é `revalidatePath("/")`, que o console dispara  │
      // │ ao salvar: ela descarta o HTML e TAMBÉM esta entrada de fetch,    │
      // │ porque o Next marca cada leitura com a etiqueta interna da rota   │
      // │ em que ela aconteceu. A hora abaixo é só o teto para o caso de o  │
      // │ aviso não chegar.                                                 │
      // │                                                                   │
      // │ SOBRA UM CASO, e ele é conhecido: um DEPLOY não chama a rota de   │
      // │ revalidação, então um build logo após uma edição pode restaurar   │
      // │ esta entrada do cache da Vercel e publicar o texto anterior por    │
      // │ até uma hora. Se precisar do texto novo no ar na hora, salve de   │
      // │ novo no console depois que o deploy terminar.                     │
      // └───────────────────────────────────────────────────────────────────┘
      next: { revalidate: 3600 },
      // Teto curto: se o banco não responder em cinco segundos durante um
      // build, o build não vai ficar esperando — vai publicar a copy de
      // reserva e seguir.
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[vitrine] a consulta falhou: HTTP ${res.status} — usando a copy do código.`);
      return fallback();
    }

    const rows: unknown = await res.json();

    // LISTA VAZIA TAMBÉM É FALHA. Um `[]` chega aqui quando todos os cartões
    // foram despublicados, quando a policy mudou ou quando a tabela foi
    // recriada sem semente — e nos três casos publicar uma dobra sem cartão
    // nenhum é pior do que publicar a copy antiga.
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error("[vitrine] a vitrine voltou vazia — usando a copy do código.");
      return fallback();
    }

    return (rows as ShowcaseRow[]).map(toCard);
  } catch (e) {
    // `AbortSignal.timeout` cai aqui, junto com DNS, TLS e JSON inválido.
    console.error("[vitrine] erro ao ler a vitrine:", (e as Error).message, "— usando a copy do código.");
    return fallback();
  }
}
