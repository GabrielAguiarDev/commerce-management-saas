import { css } from "@aguiar/ui";
import { Reveal } from "@/components/Reveal";
import { Check, Container, SectionIntro } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { PLANS_ID } from "@/lib/links";
import { ctaLink, fetchWhatsapp } from "@/lib/whatsapp";
import { DISPLAY, SECTION } from "@/lib/styleKit";
import { fetchPlanCards, type PlanCard } from "@/lib/vitrine";
import type { CtaLink } from "@/lib/whatsapp";

const PRICE = `font-family:${DISPLAY};font-weight:800;font-size:38px;letter-spacing:-.02em;`;
const PLAN_NAME = "font-size:20px;font-weight:700;margin-bottom:6px;";
const PITCH = "font-size:14.5px;margin:0 0 18px;";
const PLAN_CTA =
  `display:block;text-align:center;font-family:${DISPLAY};font-weight:700;` +
  "font-size:15.5px;padding:14px;border-radius:12px;margin-bottom:24px;";

/**
 * "Planos".
 *
 * A copy DOS CARTÕES vem do banco (`plan_showcase_public`, via
 * `lib/vitrine.ts`); o preço, de dentro dela, vem do plano real que cobra o
 * cliente. O texto em volta — olho-mágico, manchete, o parágrafo e a etiqueta
 * "Recomendado" — continua no dicionário: é da dobra, não do cartão, e mudá-lo
 * é reescrever o argumento da página, não ajustar uma oferta.
 *
 * A página SEGUE ESTÁTICA. A leitura acontece no build e na revalidação, nunca
 * na visita — ver o `revalidate` em `app/page.tsx`.
 *
 * As chamadas dos cartões abrem a CONVERSA NO WHATSAPP, como as outras quatro
 * da página — e cada uma leva o nome do plano em que a pessoa clicou dentro da
 * primeira mensagem. Sem isso, o botão do cartão em destaque e o do cartão
 * gratuito chegariam do outro lado indistinguíveis, e a primeira pergunta da
 * conversa teria de ser "qual plano você viu?".
 */
export async function Plans() {
  // As duas leituras viajam juntas: nenhuma depende da outra, e esperar uma
  // para começar a outra dobraria o tempo desta dobra no build.
  const [cards, whatsapp] = await Promise.all([fetchPlanCards(), fetchWhatsapp()]);

  return (
    <section
      id={PLANS_ID}
      aria-labelledby="plans-title"
      style={css(SECTION + "background:var(--surface);border-top:1px solid var(--rule)")}
    >
      {/* A faixa estreita (1000px) é a da dobra desde sempre: duas ou três
          colunas de plano numa faixa de 1160 ficariam largas demais e comparar
          uma com a outra exigiria varrer a tela. A partir de QUATRO cartões
          ela abre para a larga — a essa altura o problema deixa de ser a
          varredura e passa a ser a coluna espremida. */}
      <Container narrow={cards.length <= 3}>
        <Reveal>
          <SectionIntro
            id="plans-title"
            eyebrow={COPY.plans.eyebrow}
            title={COPY.plans.title}
            lead={COPY.plans.subtitle}
          />
        </Reveal>

        {/* ┌─ A GRADE AGUENTA QUALQUER QUANTIDADE ──────────────────────────┐
            │ `auto-fit` com `minmax` nunca estoura: o que não cabe numa     │
            │ linha desce para a seguinte, sozinho. O que muda por           │
            │ quantidade é só a medida mínima da coluna e a largura da faixa:│
            │                                                                │
            │   1 cartão   → coluna única de 420px, centralizada. Sem isto   │
            │                ele esticaria por 1000px e viraria uma tarja.   │
            │   2 e 3      → o desenho de hoje: mínimo 290px na faixa        │
            │                estreita, que acomoda três colunas de ~306px.   │
            │   4 ou mais  → faixa larga e mínimo 250px. Quatro cabem numa   │
            │                linha; cinco quebram 3+2 sem nada estourar.     │
            │                                                                │
            │ `align-items:start` para que um cartão com um item a mais não  │
            │ estique os vizinhos junto.                                     │
            └────────────────────────────────────────────────────────────────┘ */}
        <div
          style={css(
            cards.length === 1
              ? "max-width:420px;margin:0 auto"
              : "display:grid;align-items:start;gap:20px;grid-template-columns:" +
                  `repeat(auto-fit,minmax(min(${cards.length >= 4 ? 250 : 290}px,100%),1fr))`,
          )}
        >
          {cards.map((card, i) => (
            // O `<Reveal>` É o cartão — ele não envolve, ele vira o próprio
            // item da grade. Um `<div>` a mais em volta quebraria o
            // `align-items:start`, porque o item da grade passaria a ser o
            // invólucro. Ver o comentário no topo de `Reveal.tsx`.
            //
            // O atraso escalona a entrada da esquerda para a direita, e o teto
            // impede que o quarto cartão de uma fileira apareça meio segundo
            // depois do primeiro.
            <PlanBox
              key={card.id}
              card={card}
              delay={Math.min(i, 3) * 80}
              // A conversa começa com o nome do plano em que a pessoa clicou —
              // é o único dos cinco textos que muda por botão.
              cta={ctaLink(whatsapp, COPY.cta.whatsapp.plan.replace("{plano}", card.name))}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

/**
 * Um cartão.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  ⚠  ESTE VISUAL TEM UMA CÓPIA NO CONSOLE.                              │
 * │                                                                        │
 * │      apps/portal-admin/components/VitrinePreviewCard.tsx               │
 * │                                                                        │
 * │  É a prévia da tela de Vitrine: quem edita a copy precisa ver o        │
 * │  resultado sem publicar e abrir o site. Reaproveitar ESTE componente   │
 * │  não era possível — ele é `async` e busca os próprios dados, o console │
 * │  precisa desenhar o rascunho que está sendo digitado, e os dois apps   │
 * │  não compartilham paleta (os mesmos nomes de variável têm valores      │
 * │  diferentes, e o console ainda tem tema escuro).                       │
 * │                                                                        │
 * │  MEXEU AQUI? MEXA LÁ TAMBÉM — senão o console promete uma coisa e      │
 * │  esta página publica outra.                                            │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * `featured` troca o cartão inteiro de registro: fundo petrol, texto claro,
 * sombra e a etiqueta montada sobre a borda de cima. É o mesmo desenho que o
 * plano pago tinha fixo no código — agora quem o liga é uma coluna, e ligá-lo
 * em mais de um cartão funciona sem quebrar nada (só enfraquece o recado, e é
 * por isso que a tela do console avisa em vez de impedir).
 */
function PlanBox({ card, delay, cta }: { card: PlanCard; delay: number; cta: CtaLink }) {
  const dark = card.featured;

  return (
    <Reveal
      delay={delay}
      style={css(
        "border-radius:18px;padding:28px;" +
          (dark
            ? "border:1.5px solid var(--petrol);background:var(--petrol);color:#fff;" +
              "position:relative;box-shadow:0 16px 40px rgba(18,50,60,.18)"
            : "border:1px solid var(--border);background:var(--surface2)"),
      )}
    >
      {/* A etiqueta fica montada sobre a borda superior — daí o
          `position:relative` no cartão e o topo negativo. */}
      {dark && (
        <div
          style={css(
            "position:absolute;top:-13px;left:28px;background:var(--accent);color:#fff;" +
              `font-family:${DISPLAY};font-weight:700;font-size:11.5px;letter-spacing:.05em;` +
              "text-transform:uppercase;padding:6px 12px;border-radius:999px",
          )}
        >
          {COPY.plans.recommended}
        </div>
      )}

      <h3 style={css(PLAN_NAME + (dark ? "color:#fff" : "color:var(--petrol)"))}>{card.name}</h3>
      <p style={css(PITCH + (dark ? "color:var(--on-petrol3)" : "color:var(--text2)"))}>
        {card.pitch}
      </p>

      <div style={css("display:flex;align-items:baseline;gap:6px;margin-bottom:22px")}>
        {card.price ? (
          <>
            <span style={css(PRICE + (dark ? "color:#fff" : "color:var(--petrol)"))}>
              {card.price}
            </span>
            {card.unit && (
              <span
                style={css(
                  "font-size:14.5px;color:" + (dark ? "var(--on-petrol-muted)" : "var(--muted)"),
                )}
              >
                {card.unit}
              </span>
            )}
          </>
        ) : (
          // Sem preço — plano sob medida, ou o socorro de `lib/vitrine.ts`.
          // Corpo menor que o do número: é uma frase, e em 38px ela viraria
          // uma manchete que compete com a da dobra.
          <span
            style={css(
              `font-family:${DISPLAY};font-weight:800;font-size:26px;letter-spacing:-.02em;color:` +
                (dark ? "#fff" : "var(--petrol)"),
            )}
          >
            {COPY.plans.priceOnRequest}
          </span>
        )}
      </div>

      <a
        className={dark ? "lp-cta" : "lp-outline"}
        {...cta}
        style={css(
          PLAN_CTA +
            (dark
              ? "background:var(--accent);color:#fff"
              : "border:1px solid var(--petrol);color:var(--petrol)"),
        )}
      >
        {card.cta}
      </a>

      <div style={css("display:flex;flex-direction:column;gap:11px")}>
        {card.features.map((f) => (
          <Check key={f} dark={dark}>
            {f}
          </Check>
        ))}
      </div>
    </Reveal>
  );
}
