import { css } from "@aguiar/ui";

/**
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  ⚠  ESTE CARD É UMA CÓPIA DO VISUAL DA LANDING PAGE.                   │
 * │                                                                        │
 * │  O original é `PlanBox`, em                                            │
 * │      apps/landing-page/components/Plans.tsx                            │
 * │  e o item com "✓" vem de                                               │
 * │      apps/landing-page/components/shared.tsx  (componente `Check`)     │
 * │                                                                        │
 * │  MEXEU NO VISUAL DO CARD LÁ? MEXA AQUI TAMBÉM. Se as duas divergirem,  │
 * │  esta tela passa a prometer uma coisa e o site a publicar outra — que  │
 * │  é exatamente o problema que ela existe para resolver.                 │
 * │                                                                        │
 * │  Há um comentário simétrico no arquivo da landing apontando para cá.   │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ POR QUE NÃO DEU PARA REAPROVEITAR O COMPONENTE ───────────────────────┐
 * │ 1. `Plans.tsx` é um server component `async` que faz o próprio         │
 * │    `fetch` no banco — ele não recebe os dados por prop, então mostraria │
 * │    o que está SALVO e nunca o rascunho que está sendo digitado.        │
 * │ 2. `landing-page` não é um pacote e não está nas dependências do       │
 * │    console; `@/` aponta para a raiz de cada app.                       │
 * │ 3. Os `styleKit` dos dois apps não têm um nome sequer em comum.        │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ POR QUE AS CORES SÃO LITERAIS, E NÃO `var(--petrol)` ─────────────────┐
 * │ Porque os mesmos NOMES têm valores DIFERENTES nos dois apps, e o       │
 * │ console ainda por cima tem tema escuro — que a landing não tem. No     │
 * │ `data-theme="dark"` daqui, `--petrol` vira #7fb4cc e `--surface`       │
 * │ #0a1e2b: uma prévia escrita com as variáveis do console apareceria     │
 * │ azul-clara sobre fundo preto, mostrando um card que não existe em      │
 * │ lugar nenhum.                                                          │
 * │                                                                        │
 * │ Os valores abaixo são cópia literal de                                 │
 * │ `apps/landing-page/app/globals.css`. É isto que faz a prévia continuar │
 * │ fiel com o console em qualquer tema — ela mostra o SITE, e o site é    │
 * │ sempre claro.                                                          │
 * └────────────────────────────────────────────────────────────────────────┘
 */

/** A paleta da landing, congelada. Ver o bloco acima antes de mexer. */
const LP = {
  petrol: "#123c4a",
  accent: "#1b9abd",
  surface: "#ffffff",
  surface2: "#fbfcfd",
  border: "#e4eaec",
  text2: "#5b7280",
  muted: "#7c8f98",
  pos: "#17795e",
  onPetrol: "#dde9ec",
  onPetrol3: "#bfd4d9",
  onPetrolMuted: "#8faab2",
  posOnPetrol: "#43c193",
  /** A cor do texto do item claro — literal também no original. */
  checkText: "#3c5460",
} as const;

/**
 * A pilha de fonte de display do site.
 *
 * `--font-display` é declarada no `app/layout.tsx` do console (Manrope, via
 * `next/font`) só por causa desta prévia — é a fonte do preço e do botão no
 * site, e sem ela o "R$ 89" sairia em Public Sans: mesmo tamanho e peso, outro
 * desenho de letra.
 */
const DISPLAY = 'var(--font-display), "Manrope", system-ui, sans-serif';

/* As medidas do original, uma a uma. */
const PRICE = `font-family:${DISPLAY};font-weight:800;font-size:38px;letter-spacing:-.02em;`;
const PLAN_NAME = "font-size:20px;font-weight:700;margin-bottom:6px;";
const PITCH = "font-size:14.5px;margin:0 0 18px;";
const PLAN_CTA =
  `display:block;text-align:center;font-family:${DISPLAY};font-weight:700;` +
  "font-size:15.5px;padding:14px;border-radius:12px;margin-bottom:24px;";

export interface PreviewData {
  name: string;
  pitch: string;
  /** Já formatado como o site escreve ("R$ 89"), ou `null`. */
  price: string | null;
  unit: string;
  cta: string;
  features: string[];
  featured: boolean;
}

/**
 * O card de plano como o visitante o vê.
 *
 * DECORATIVO E INERTE, de propósito: o botão é um `<span>` e não um `<a>`,
 * então não há para onde clicar nem nada que o leitor de tela anuncie como
 * link. A prévia inteira sai da ordem de tabulação e é escondida da árvore de
 * acessibilidade — quem navega por teclado no formulário não deve tropeçar
 * numa cópia dos campos que acabou de preencher.
 */
export function VitrinePreviewCard({
  data,
  recommendedLabel,
  priceOnRequestLabel,
}: {
  data: PreviewData;
  /** "Recomendado" — vem do dicionário do console, no idioma da tela. */
  recommendedLabel: string;
  /** "Sob consulta", para quando o plano não tem preço. */
  priceOnRequestLabel: string;
}) {
  const dark = data.featured;

  return (
    <div
      aria-hidden
      style={css(
        "border-radius:18px;padding:28px;" +
          // O badge "Recomendado" fica montado sobre a borda de cima, então o
          // card precisa de espaço acima dele dentro da caixa da prévia.
          (dark
            ? `border:1.5px solid ${LP.petrol};background:${LP.petrol};color:#fff;` +
              "position:relative;box-shadow:0 16px 40px rgba(18,50,60,.18)"
            : `border:1px solid ${LP.border};background:${LP.surface2}`),
      )}
    >
      {dark && (
        <div
          style={css(
            `position:absolute;top:-13px;left:28px;background:${LP.accent};color:#fff;` +
              `font-family:${DISPLAY};font-weight:700;font-size:11.5px;letter-spacing:.05em;` +
              "text-transform:uppercase;padding:6px 12px;border-radius:999px",
          )}
        >
          {recommendedLabel}
        </div>
      )}

      <h3 style={css(PLAN_NAME + (dark ? "color:#fff" : `color:${LP.petrol}`))}>{data.name}</h3>
      <p style={css(PITCH + (dark ? `color:${LP.onPetrol3}` : `color:${LP.text2}`))}>
        {data.pitch}
      </p>

      <div style={css("display:flex;align-items:baseline;gap:6px;margin-bottom:22px")}>
        {data.price ? (
          <>
            <span style={css(PRICE + (dark ? "color:#fff" : `color:${LP.petrol}`))}>
              {data.price}
            </span>
            {data.unit && (
              <span
                style={css("font-size:14.5px;color:" + (dark ? LP.onPetrolMuted : LP.muted))}
              >
                {data.unit}
              </span>
            )}
          </>
        ) : (
          <span
            style={css(
              `font-family:${DISPLAY};font-weight:800;font-size:26px;letter-spacing:-.02em;color:` +
                (dark ? "#fff" : LP.petrol),
            )}
          >
            {priceOnRequestLabel}
          </span>
        )}
      </div>

      {/* `<span>` e não `<a>`: a prévia não leva a lugar nenhum. */}
      <span
        style={css(
          PLAN_CTA +
            (dark
              ? `background:${LP.accent};color:#fff`
              : `border:1px solid ${LP.petrol};color:${LP.petrol}`),
        )}
      >
        {data.cta}
      </span>

      <div style={css("display:flex;flex-direction:column;gap:11px")}>
        {data.features.map((f, i) => (
          // A chave é o índice porque a lista vem de um textarea sendo
          // digitado: dois itens iguais são um estado normal no meio da
          // edição, e usar o texto como chave faria o React reclamar.
          <div
            key={i}
            style={css(
              "display:flex;gap:10px;align-items:flex-start;font-size:15px;color:" +
                (dark ? LP.onPetrol : LP.checkText),
            )}
          >
            <span
              style={css("font-weight:700;color:" + (dark ? LP.posOnPetrol : LP.pos))}
            >
              ✓
            </span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
