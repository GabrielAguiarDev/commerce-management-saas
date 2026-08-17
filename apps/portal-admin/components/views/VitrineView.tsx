"use client";

import { Button, Field, TextArea, css, FIELD_LABEL, MONO, PANEL } from "@aguiar/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useAdmin } from "@/components/AdminProvider";
import { VitrinePreviewCard, type PreviewData } from "@/components/VitrinePreviewCard";
import { EditarIcone } from "@/lib/icons";
import { panelBadge } from "@/lib/styleKit";
import type { ShowcaseCard } from "@/lib/vitrine";
import {
  reorderShowcase,
  saveShowcaseCard,
  toggleShowcaseVisible,
  type ShowcaseInput,
} from "@/app/vitrine/actions";

/**
 * A VITRINE — os cartões de plano como o visitante os vê em aguiarone.com.
 *
 * ┌─ POR QUE ESTA TELA É SEPARADA DA DE PLANOS ────────────────────────────┐
 * │ São dois assuntos que só parecem um. A tela de Planos edita a OFERTA:  │
 * │ preço cobrado e `module_keys`, que é quem decide o que cada cliente    │
 * │ consegue abrir. Esta edita o ANÚNCIO dessa oferta — título, promessa,  │
 * │ lista de vantagens, ordem na página.                                   │
 * │                                                                        │
 * │ Juntá-las numa tela só faria o mesmo formulário mexer em quem paga o   │
 * │ quê e em como o site descreve isso, e uma edição de copy passaria a    │
 * │ ter chance de mudar acesso por engano. São telas diferentes porque um  │
 * │ erro aqui custa uma frase errada no site, e um erro lá custa um        │
 * │ cliente sem o módulo que ele contratou.                                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * O PREÇO NÃO SE EDITA AQUI, e a tela diz isso o tempo todo: cada cartão
 * mostra, só como leitura, a qual plano está ligado e qual número a landing
 * vai imprimir. Quem escreve a copy precisa ver o preço para escrever a
 * frase certa em volta dele — mas mudar o preço é mudar o que se cobra, e
 * isso mora na tela de Planos.
 *
 * O ESTADO DO FORMULÁRIO É LOCAL, e não do `AdminProvider`. O `FormState`
 * global tem campos fixos (`name`, `price`, `desc`, `sel`) desenhados para
 * plano e módulo; um cartão tem dez campos em dois idiomas. Esticar aquele
 * tipo para caber aqui deixaria as duas telas presas uma na outra sem que
 * nenhuma delas ganhasse nada.
 */

/** O formulário de um cartão. Espelha `ShowcaseInput` da Server Action. */
type Draft = ShowcaseInput;

/**
 * O rascunho, no formato que a prévia desenha.
 *
 * ┌─ O INGLÊS EM BRANCO CAI NO PORTUGUÊS, AQUI TAMBÉM ─────────────────────┐
 * │ É a mesma regra de `ouPt` na Server Action, e ela precisa estar nos    │
 * │ dois lugares: a prévia mostra o que VAI SER GRAVADO, não o que está    │
 * │ digitado. Com o console em inglês e a tradução ainda em branco, o site │
 * │ vai publicar o texto português — e é ele que tem de aparecer aqui.     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * O PREÇO NÃO SAI DO RASCUNHO. Ele vem do cartão que o servidor mandou, que o
 * leu de `plans.price`. Não há campo de preço no formulário, e não deve haver.
 */
function toPreview(d: Draft, c: ShowcaseCard, id: "pt" | "en"): PreviewData {
  const ou = (en: string, pt: string) => (id === "en" ? en.trim() || pt : pt);
  const lista = (en: string, pt: string) =>
    (id === "en" && en.trim() ? en : pt).split("\n").map((l) => l.trim()).filter(Boolean);

  return {
    // Título e descrição não estão no rascunho: vêm de `plans` e não se
    // editam aqui. A prévia mostra o que o site vai publicar, e é isso.
    name: c.title,
    pitch: c.subtitle,
    price: c.price,
    unit: ou(d.unitEn, d.unitPt),
    cta: ou(d.ctaEn, d.ctaPt),
    features: lista(d.featuresEn, d.featuresPt),
    featured: d.featured,
  };
}

function toDraft(c: ShowcaseCard): Draft {
  return {
    ctaPt: c.ctaLabel.pt,
    ctaEn: c.ctaLabel.en,
    unitPt: c.priceUnit.pt,
    unitEn: c.priceUnit.en,
    // O textarea edita uma feature por linha — é a forma mais direta de
    // mexer numa lista curta e ordenada sem inventar um editor de itens.
    featuresPt: c.features.pt.join("\n"),
    featuresEn: c.features.en.join("\n"),
    featured: c.featured,
  };
}

export function VitrineView({
  cards,
  error,
}: {
  cards: ShowcaseCard[];
  error: string | null;
}) {
  const { s, a, isMobile } = useAdmin();
  const { L } = a;
  const id = s.language;
  const router = useRouter();
  const [, startAction] = useTransition();

  /** A chave do cartão aberto para edição, ou `null`. Um de cada vez. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const refresh = () => startAction(() => router.refresh());
  const edit = (k: keyof Draft, v: string | boolean) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const open = (c: ShowcaseCard) => {
    setEditing(c.planKey);
    setDraft(toDraft(c));
  };

  const close = () => {
    setEditing(null);
    setDraft(null);
  };

  const save = async (planKey: string) => {
    if (!draft) return;
    const res = await saveShowcaseCard(planKey, draft);
    if (!res.ok) return a.toast(res.message, "error");
    close();
    a.toast(L.toastVitrineSalva);
    refresh();
  };

  const toggle = async (c: ShowcaseCard) => {
    const res = await toggleShowcaseVisible(c.planKey, !c.visible);
    if (!res.ok) return a.toast(res.message, "error");
    a.toast(c.visible ? L.toastVitrineOculta : L.toastVitrinePublicada, c.visible ? "warning" : "ok");
    refresh();
  };

  /**
   * Move um cartão uma posição e manda a lista inteira.
   *
   * A ordem que o admin vê na tela é a que vai ao banco — ver o comentário de
   * `reordenarVitrine` na Server Action.
   */
  const move = async (index: number, delta: number) => {
    const alvo = index + delta;
    if (alvo < 0 || alvo >= cards.length) return;
    const ordem = cards.map((c) => c.planKey);
    [ordem[index], ordem[alvo]] = [ordem[alvo], ordem[index]];
    const res = await reorderShowcase(ordem);
    if (!res.ok) return a.toast(res.message, "error");
    a.toast(L.toastVitrineOrdem);
    refresh();
  };

  if (error) {
    return (
      <div style={css(PANEL + ";padding:22px;color:var(--danger);font-size:13.5px")}>{error}</div>
    );
  }

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      {/* A tela abre dizendo o que ela NÃO faz. É a confusão previsível —
          "Planos" e "Vitrine" na mesma seção do menu — e é mais barato
          respondê-la aqui do que consertar uma edição feita na tela errada. */}
      <p
        style={css(
          PANEL +
            ";margin:0;padding:14px 18px;font-size:12.5px;line-height:1.6;color:var(--text2)",
        )}
      >
        {L.vitrineIntro}
      </p>

      {cards.map((c, i) => {
        const aberto = editing === c.planKey;

        return (
          <section key={c.planKey} style={css(PANEL + ";overflow:hidden")}>
            {/* ----------------------------------------------------------
                A LINHA DO CARTÃO: identidade, o que o site vai mostrar e
                os controles que não precisam abrir o formulário.
                ---------------------------------------------------------- */}
            <div
              style={css(
                "display:flex;gap:14px;padding:16px 18px;" +
                  (isMobile ? "flex-direction:column" : "align-items:flex-start"),
              )}
            >
              {/* Reordenação. Duas setas e não arrastar: são dois ou três
                  cartões, e arrastar exigiria ponteiro — o console é usado
                  no celular. */}
              <div style={css("display:flex;flex-direction:column;gap:4px;flex:none")}>
                <Button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={L.vitrineSubir}
                  title={L.vitrineSubir}
                  style={css(setaEstilo(i === 0))}
                >
                  ↑
                </Button>
                <Button
                  onClick={() => move(i, 1)}
                  disabled={i === cards.length - 1}
                  aria-label={L.vitrineDescer}
                  title={L.vitrineDescer}
                  style={css(setaEstilo(i === cards.length - 1))}
                >
                  ↓
                </Button>
              </div>

              <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;gap:9px")}>
                <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                  {/* Só o nome. A CHAVE do plano (`paid`, `custom`) não
                      aparece mais: ela existia aqui para ligar o título de
                      venda ao plano real, quando os dois podiam ser
                      diferentes. Agora o título É `plans.name`, então a
                      chave só acrescentava uma palavra em inglês no meio de
                      uma tela em português — e traduzi-la não é uma opção,
                      porque é chave primária e `tenants.plan` aponta para
                      ela sem chave estrangeira que protegesse a renomeação.
                      A tela de Planos também não a mostra. */}
                  <h3 style={css("margin:0;font-size:15.5px;font-weight:600;color:var(--text)")}>
                    {c.title}
                  </h3>
                  {c.featured && <span style={css(panelBadge("acc"))}>{L.vitrineDestaqueBadge}</span>}
                  {!c.visible && <span style={css(panelBadge("neutral"))}>{L.vitrineOculto}</span>}
                </div>

                {/* ------------------------------------------------------
                    O BLOCO SÓ-LEITURA — os três campos que vêm do catálogo
                    e não se editam aqui. Ele responde "o que vai sair no
                    site?" sem abrir o formulário, e diz de onde cada coisa
                    vem para ninguém procurar o campo de título nesta tela.
                    ------------------------------------------------------ */}
                <div
                  style={css(
                    "display:flex;gap:20px;flex-wrap:wrap;padding:10px 12px;border-radius:9px;" +
                      "background:var(--surface2, var(--surface3));border:1px solid var(--border-soft, var(--border))",
                  )}
                >
                  <Leitura rotulo={L.vitrinePrecoLanding}>
                    <span style={css(`font-family:${MONO};font-weight:600`)}>{c.price ?? "—"}</span>
                    {c.priceUnit[id] ? (
                      <span style={css("color:var(--muted)")}> {c.priceUnit[id]}</span>
                    ) : null}
                  </Leitura>
                  <Leitura rotulo={L.vitrineDescricaoSite}>
                    {c.subtitle || <span style={css("color:var(--muted)")}>—</span>}
                  </Leitura>
                </div>

                <span style={css("font-size:11px;color:var(--muted);line-height:1.5")}>
                  {L.vitrineVemDePlanos}
                </span>
              </div>

              <div
                style={css(
                  "display:flex;align-items:center;gap:8px;flex:none" +
                    (isMobile ? ";justify-content:flex-end" : ""),
                )}
              >
                {/* O interruptor de publicação fica FORA do formulário: tirar
                    um cartão do ar é urgente e não pode depender de abrir,
                    editar e salvar. */}
                <Button
                  onClick={() => toggle(c)}
                  role="switch"
                  aria-checked={c.visible}
                  aria-label={L.vitrineVisivel}
                  title={L.vitrineVisivel}
                  style={css(
                    "display:flex;align-items:center;gap:8px;border:1px solid var(--border);" +
                      "background:var(--surface);border-radius:9px;padding:7px 11px;cursor:pointer;" +
                      "font-size:12px;font-weight:500;color:" +
                      (c.visible ? "var(--pos)" : "var(--muted)"),
                  )}
                >
                  <span
                    style={css(
                      "width:8px;height:8px;border-radius:50%;background:" +
                        (c.visible ? "var(--pos)" : "var(--border)"),
                    )}
                  />
                  {c.visible ? L.vitrineNoAr : L.vitrineOculto}
                </Button>

                <Button
                  onClick={() => (aberto ? close() : open(c))}
                  aria-label={L.edit}
                  title={L.edit}
                  aria-expanded={aberto}
                  className="hv-acc-borda"
                  style={css(
                    "display:flex;align-items:center;justify-content:center;width:32px;height:32px;" +
                      "border:1px solid var(--border);background:var(--surface);border-radius:8px;" +
                      "cursor:pointer;padding:0;color:" +
                      (aberto ? "var(--accent-text)" : "var(--muted)"),
                  )}
                >
                  <EditarIcone />
                </Button>
              </div>
            </div>

            {/* ----------------------------------------------------------
                O FORMULÁRIO, com a prévia ao lado.

                Os campos: duas colunas, pt e en lado a lado — a tradução se
                escreve olhando para o original, e um campo em branco de um
                lado fica evidente ao lado do preenchido do outro.

                A prévia: grudada no alto enquanto se rola a lista de itens,
                que é o campo mais alto do formulário. No celular ela vai para
                CIMA dos campos — embaixo, o teclado a empurraria para fora da
                tela justamente enquanto se digita.
                ---------------------------------------------------------- */}
            {aberto && draft && (
              <div
                style={css(
                  "border-top:1px solid var(--border);padding:18px;background:var(--surface2, transparent);" +
                    "display:flex;flex-direction:column;gap:16px",
                )}
              >
                <div
                  style={css(
                    "display:grid;gap:20px;align-items:start;grid-template-columns:" +
                      (isMobile ? "1fr" : "minmax(0,1fr) 360px"),
                  )}
                >
                  {isMobile && (
                    <Previa titulo={L.vitrinePreview}>
                      <VitrinePreviewCard
                        data={toPreview(draft, c, id)}
                        recommendedLabel={L.vitrinePreviewRecomendado}
                        priceOnRequestLabel={L.vitrineSobConsulta}
                      />
                    </Previa>
                  )}

                  <div style={css("display:flex;flex-direction:column;gap:16px;min-width:0")}>
                  {/* Não há campo de título nem de descrição, e a ausência é
                      o recado: os dois são de `plans` e se editam na tela de
                      Planos. Uma cópia editável aqui é exatamente a origem
                      do problema que esta mudança veio resolver — o console
                      dizendo "Pago" e o site dizendo "Completo". */}
                  <Par
                    rotulo={L.vitrineBotao}
                    isMobile={isMobile}
                    pt={<Field value={draft.ctaPt} onChange={(e) => edit("ctaPt", e.target.value)} />}
                    en={
                      <Field
                        value={draft.ctaEn}
                        placeholder={draft.ctaPt}
                        onChange={(e) => edit("ctaEn", e.target.value)}
                      />
                    }
                  />

                  {/* A unidade é a única coisa que se escreve ENCOSTADA no
                      preço. A tira que ficava aqui, montando o número com o
                      texto digitado, saiu: a prévia ao lado mostra a mesma
                      coisa dentro do card inteiro, e duas respostas para a
                      mesma pergunta é uma a mais. */}
                  <Par
                    rotulo={L.vitrineUnidade}
                    nota={L.vitrinePrecoVemDoPlano}
                    isMobile={isMobile}
                    pt={<Field value={draft.unitPt} onChange={(e) => edit("unitPt", e.target.value)} />}
                    en={
                      <Field
                        value={draft.unitEn}
                        placeholder={draft.unitPt}
                        onChange={(e) => edit("unitEn", e.target.value)}
                      />
                    }
                  />

                  <Par
                    rotulo={L.vitrineFeatures}
                    nota={L.vitrineFeaturesNota}
                    isMobile={isMobile}
                    pt={
                      <TextArea
                        rows={6}
                        value={draft.featuresPt}
                        onChange={(e) => edit("featuresPt", e.target.value)}
                      />
                    }
                    en={
                      <TextArea
                        rows={6}
                        value={draft.featuresEn}
                        placeholder={draft.featuresPt}
                        onChange={(e) => edit("featuresEn", e.target.value)}
                      />
                    }
                  />

                  {/* Aviso, não trava: as duas listas são independentes na
                      página, e um item a mais em inglês pode ser proposital. */}
                  {contarLinhas(draft.featuresEn) > 0 &&
                    contarLinhas(draft.featuresPt) !== contarLinhas(draft.featuresEn) && (
                      <Aviso tom="warn">{L.vitrineFeaturesDesencontro}</Aviso>
                    )}

                  <label
                    style={css(
                      "display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;color:var(--text)",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={draft.featured}
                      onChange={(e) => edit("featured", e.target.checked)}
                      style={css("width:16px;height:16px;accent-color:var(--accent);cursor:pointer")}
                    />
                    <span>
                      {L.vitrineDestaque}
                      <span style={css("display:block;font-size:11.5px;color:var(--muted)")}>
                        {L.vitrineDestaqueNota}
                      </span>
                    </span>
                  </label>
                  </div>

                  {!isMobile && (
                    <Previa titulo={L.vitrinePreview} sticky>
                      <VitrinePreviewCard
                        data={toPreview(draft, c, id)}
                        recommendedLabel={L.vitrinePreviewRecomendado}
                        priceOnRequestLabel={L.vitrineSobConsulta}
                      />
                    </Previa>
                  )}
                </div>

                <div style={css("display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap")}>
                  <Button
                    onClick={close}
                    style={css(
                      "border:1px solid var(--border);background:var(--surface);color:var(--text2);" +
                        "border-radius:9px;padding:10px 16px;font-size:13px;cursor:pointer",
                    )}
                  >
                    {L.cancelar}
                  </Button>
                  <Button
                    onClick={() => save(c.planKey)}
                    loadingLabel={L.salvarSimples}
                    className="hv-brilho"
                    style={css(
                      "background:var(--accent);border:1px solid var(--accent);color:var(--accent-ink);" +
                        "border-radius:9px;padding:10px 18px;font-size:13px;font-weight:500;cursor:pointer",
                    )}
                  >
                    {L.salvarSimples}
                  </Button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* A lista de "planos sem cartão" saiu junto com o conceito: todo plano
          ativo é um cartão agora, e um plano criado na tela de Planos já nasce
          aqui e no site. Quem tira do ar é o interruptor, não a ausência. */}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Peças da tela                                                               */
/* -------------------------------------------------------------------------- */

/** Um dado que a tela mostra e não deixa editar. */
function Leitura({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div style={css("display:flex;flex-direction:column;gap:2px;min-width:0")}>
      <span style={css("font-size:10.5px;font-weight:600;color:var(--muted)")}>{rotulo}</span>
      <span style={css("font-size:13px;color:var(--text)")}>{children}</span>
    </div>
  );
}

/**
 * Um campo em dois idiomas, lado a lado.
 *
 * O `placeholder` do lado inglês é o texto português — é a forma mais curta de
 * dizer "em branco, isto é o que vai ser gravado" sem uma linha de ajuda em
 * cada campo. A Server Action faz exatamente isso (`ouPt`).
 */
function Par({
  rotulo,
  nota,
  pt,
  en,
  isMobile,
}: {
  rotulo: string;
  nota?: string;
  pt: React.ReactNode;
  en: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <div>
      <label style={css(FIELD_LABEL)}>{rotulo}</label>
      {nota && (
        <span style={css("display:block;margin:-2px 0 7px;font-size:11px;color:var(--muted)")}>
          {nota}
        </span>
      )}
      <div
        style={css(
          "display:grid;gap:10px;grid-template-columns:" + (isMobile ? "1fr" : "1fr 1fr"),
        )}
      >
        <Idioma sigla="PT">{pt}</Idioma>
        <Idioma sigla="EN">{en}</Idioma>
      </div>
    </div>
  );
}

function Idioma({ sigla, children }: { sigla: string; children: React.ReactNode }) {
  return (
    <div style={css("display:flex;flex-direction:column;gap:5px;min-width:0")}>
      <span
        style={css(
          `font-family:${MONO};font-size:10px;font-weight:600;letter-spacing:.06em;color:var(--muted)`,
        )}
      >
        {sigla}
      </span>
      {children}
    </div>
  );
}

/**
 * A moldura da prévia — uma janelinha para dentro do site.
 *
 * O FUNDO É BRANCO LITERAL, e não `var(--surface)`. A dobra de planos da
 * landing é branca e o site não tem tema escuro; se esta caixa acompanhasse o
 * tema do console, o cartão claro apareceria boiando sobre preto no modo
 * escuro — uma composição que não existe em lugar nenhum. Aqui dentro é sempre
 * o site, e o rótulo do lado de fora é que pertence ao console.
 *
 * `padding-top` maior que o resto: o selo "Recomendado" do cartão em destaque
 * fica montado 13px acima da própria borda, e sem essa folga ele seria cortado.
 */
function Previa({
  titulo,
  sticky = false,
  children,
}: {
  titulo: string;
  sticky?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={css("min-width:0" + (sticky ? ";position:sticky;top:14px" : ""))}>
      <span style={css(FIELD_LABEL)}>{titulo}</span>
      <div
        style={css(
          "background:#ffffff;border:1px solid var(--border);border-radius:14px;" +
            "padding:26px 18px 18px;overflow:hidden",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Aviso({ tom, children }: { tom: "warn" | "danger"; children: React.ReactNode }) {
  return (
    <p
      style={css(
        "margin:0;font-size:12px;line-height:1.5;padding:8px 11px;border-radius:8px;" +
          (tom === "danger"
            ? "background:var(--danger-soft);color:var(--danger);border:1px solid var(--danger-line)"
            : "background:var(--warn-soft);color:var(--warn);border:1px solid var(--warn-line)"),
      )}
    >
      {children}
    </p>
  );
}

const setaEstilo = (off: boolean) =>
  "display:flex;align-items:center;justify-content:center;width:26px;height:24px;" +
  "border:1px solid var(--border);background:var(--surface);border-radius:7px;" +
  "font-size:12px;line-height:1;padding:0;" +
  (off ? "color:var(--border);cursor:not-allowed;" : "color:var(--muted);cursor:pointer;");

const contarLinhas = (t: string) => t.split("\n").filter((l) => l.trim()).length;
