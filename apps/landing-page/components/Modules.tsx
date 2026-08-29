import { css } from "@aguiar/ui";
import { MODULE_PANELS } from "@/components/ModulePanels";
import { ModuleShowcase } from "@/components/ModuleShowcase";
import { Reveal } from "@/components/Reveal";
import { Container } from "@/components/shared";
import { COPY } from "@/lib/dictionary";
import { MODULES_ID, PLANS } from "@/lib/links";
import { ctaLink, fetchWhatsapp } from "@/lib/whatsapp";
import { EYEBROW, H2, LEAD, SECTION } from "@/lib/styleKit";

/**
 * "Módulos" — a dobra que sustenta a promessa de montar o sistema.
 *
 * A ABERTURA NÃO ABRE MAIS A DOBRA EM LARGURA INTEIRA: o olho-mágico, a
 * manchete e o parágrafo entram na COLUNA PARADA, acima da lista de módulos, e
 * ficam na tela durante a seção toda. Nenhuma palavra mudou de texto — mudou
 * de lugar. É o que resolve a coluna que sobrava vazia embaixo do índice, sem
 * inventar conteúdo para preencher.
 *
 * O link dos planos desceu junto, para o pé da coluna. Ele era a última coisa
 * da abertura, vista uma vez e perdida; agora acompanha os cinco módulos, que
 * é exatamente quando a pergunta "e o que vem em cada plano?" aparece.
 *
 * Por isso a dobra continua sem usar `SectionIntro`: a abertura daqui não é
 * mais um bloco no topo da faixa, é o cabeçalho de uma coluna.
 *
 * Os cinco módulos não são mais uma grade de cards: são uma VITRINE de coluna
 * fixa. O índice à esquerda fica parado enquanto os painéis passam à direita,
 * um por módulo, cada um com a tela que aquele módulo mostra. A lista, o texto
 * e a ordem são os mesmos de antes — o que mudou foi quanto espaço cada módulo
 * ganha para se explicar. Ver `ModuleShowcase.tsx`.
 *
 * O CARD TRACEJADO FICA FORA DA VITRINE, embaixo dela e em largura inteira. Ele
 * não é um módulo — é o argumento inverso, o de DESLIGAR o que não se usa —, e
 * virar o sexto painel de uma fila de módulos diria o contrário do que ele
 * existe para dizer. A borda tracejada continua sendo o que anuncia isso antes
 * de alguém ler o título.
 */
export async function Modules() {
  const cta = ctaLink(await fetchWhatsapp(), COPY.cta.whatsapp.modules);

  // O `id` sai da MESMA constante que o menu do topo aponta — assim renomear a
  // âncora não pode deixar o link do menu apontando para lugar nenhum.
  return (
    <section
      id={MODULES_ID}
      aria-labelledby="modules-title"
      style={css(
        SECTION +
          "background:var(--surface);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)",
      )}
    >
      <Container>
        <ModuleShowcase
          items={COPY.modules.items}
          freeTag={COPY.modules.freeTag}
          paidTag={COPY.modules.paidTag}
          intro={
            <Reveal>
              <div style={css(EYEBROW)}>{COPY.modules.eyebrow}</div>
              <h2 id="modules-title" style={css(H2 + "margin-bottom:14px")}>
                {COPY.modules.title}
              </h2>
              <p style={css(LEAD + "margin-bottom:28px")}>{COPY.modules.subtitle}</p>
            </Reveal>
          }
          footer={
            <a
              className="lp-link"
              href={PLANS}
              style={css(
                "display:inline-block;margin-top:24px;font-size:15px;font-weight:600;color:var(--accent-text)",
              )}
            >
              {COPY.modules.link}
            </a>
          }
        >
          {MODULE_PANELS.map((Panel, i) => (
            <Panel key={i} />
          ))}
        </ModuleShowcase>

        {/* Em largura inteira o parágrafo passaria de 1100px de linha, que
            ninguém lê. A coluna de texto para de crescer nos mesmos 620px da
            abertura da dobra. */}
        <Reveal
          style={css(
            "border:1px dashed var(--dashed);border-radius:16px;padding:26px;" +
              "background:var(--surface);margin-top:40px",
          )}
        >
          <div style={css("max-width:620px")}>
            <h3 style={css("font-size:18px;font-weight:700;margin-bottom:8px;color:var(--petrol)")}>
              {COPY.modules.custom.title}
            </h3>
            <p style={css("font-size:14.5px;line-height:1.6;color:var(--text2);margin:0 0 14px")}>
              {COPY.modules.custom.text}
            </p>
            <a
              className="lp-link"
              {...cta}
              style={css("font-size:14.5px;font-weight:600;color:var(--accent-text)")}
            >
              {COPY.modules.custom.cta}
            </a>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
