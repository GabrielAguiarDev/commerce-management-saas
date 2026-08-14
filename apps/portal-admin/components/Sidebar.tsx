"use client";

import { usePathname } from "next/navigation";
import { useAdmin } from "@/components/AdminProvider";
import { Button, css, MONO } from "@aguiar/ui";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { Wordmark } from "@/components/Wordmark";
import {
  ClientesIcone,
  ColapsarIcone,
  ConfigIcone,
  FinanceiroIcone,
  ModulosIcone,
  PlanosIcone,
  SairIcone,
  SuporteIcone,
  VisaoIcone,
} from "@/lib/icons";
import { ROUTES, isActiveRoute } from "@/lib/rotas";
import { headerHeight, navStyle } from "@/lib/styleKit";

/**
 * O id da barra lateral. O botão da gaveta, lá na barra de topo, aponta para
 * ele com `aria-controls` — é o que liga o "abrir menu" ao que de fato abre.
 */
export const NAV_ID = "admin-nav";

interface SidebarProps {
  customerCount: number;
  chamadosAbertos: number;
  mrrValor: string;
  mrrDelta: string;
}

export function Sidebar({ customerCount, chamadosAbertos, mrrValor, mrrDelta }: SidebarProps) {
  const { s, a, isMobile } = useAdmin();
  const { L } = a;
  const pathname = usePathname();
  // No celular a barra é uma gaveta: quando ela aparece, aparece inteira.
  // Recolher só faz sentido no desktop, onde ela divide a largura com a tela.
  const col = s.collapsed && !isMobile;

  const label = col ? "display:none" : "white-space:nowrap";
  const group = col
    ? "display:block;height:1px;margin:12px 14px;background:var(--side-border);font-size:0;line-height:0;overflow:hidden;color:transparent"
    : "font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--side-text2);padding:14px 11px 5px";

  // Hover and focus both raise the tooltip, so the collapsed rail stays usable
  // from the keyboard.
  const hint = {
    onMouseEnter: a.showHint,
    onMouseLeave: a.hideHint,
    onFocus: a.showHint,
    onBlur: a.hideHint,
  };

  /**
   * `etiqueta` doubles as the aria-label, which is what the tooltip reads — so
   * the counted entries pass "Clientes · 10" and show only the part before the
   * separator inline.
   *
   * São links de verdade, e não botões: é o que dá ao Next a chance de
   * pré-carregar as telas do menu antes do clique — todas as rotas do painel
   * estão aqui, visíveis, então todas chegam prontas. A parada para perguntar
   * sobre edição pendente não se perdeu: ela mora no `<NavLink>`.
   */
  const item = (
    href: string,
    etiqueta: string,
    icon: React.ReactNode,
    contador?: React.ReactNode,
  ) => {
    const active = isActiveRoute(pathname, href);
    return (
      <NavLink
        href={href}
        style={css(navStyle(active, col))}
        aria-label={etiqueta}
        aria-current={active ? "page" : undefined}
        {...hint}
      >
        <span style={{ display: "flex", flex: "none" }}>{icon}</span>
        <span style={css(label)}>{etiqueta.split(" · ")[0]}</span>
        {contador}
      </NavLink>
    );
  };

  return (
    <aside
      id={NAV_ID}
      /**
       * Duas barras na mesma marcação.
       *
       * No desktop ela é `sticky`: ocupa uma coluna própria, acompanha a
       * rolagem e o conteúdo fica ao lado. No celular ela sai do fluxo e vira
       * uma gaveta — `fixed`, deslocada para fora da tela, e volta deslizando
       * quando `navOpen` liga. Fora do fluxo, a tela abaixo ganha a largura
       * inteira sem precisar de um segundo desenho.
       *
       * `overflow-y:auto` só importa aqui: aberta num celular deitado, a barra
       * é mais alta que a tela, e sem isso o rodapé com o botão de sair ficaria
       * inalcançável.
       */
      style={css(
        "width:" +
          (col ? "84px" : "250px") +
          ";flex:none;background:var(--side);display:flex;flex-direction:column;" +
          "height:100vh;overflow-y:auto;overscroll-behavior:contain;" +
          (isMobile
            ? "position:fixed;top:0;left:0;z-index:70;box-shadow:var(--shadow-lg);" +
              `transform:translateX(${s.navOpen ? "0" : "-100%"});` +
              "transition:transform .22s ease"
            : "position:sticky;top:0;align-self:flex-start;transition:width .18s ease"),
      )}
      // Fechada, a gaveta continua no DOM (é o que permite animar a entrada),
      // mas não deve receber Tab nem ser lida: `inert` tira as duas coisas de
      // uma vez, o que `display:none` faria ao custo da animação.
      inert={isMobile && !s.navOpen}
    >
      <div
        // A altura vem de `headerHeight`, a mesma que a barra de topo usa: é o
        // que põe as duas linhas de base na mesma altura, formando uma única
        // linha contínua em vez do degrau que havia no encontro das duas.
        style={css(
          "position:relative;height:" +
            headerHeight(isMobile) +
            ";flex:none;display:flex;align-items:center;gap:11px;" +
            "border-bottom:1px solid var(--side-border);" +
            (col ? "padding:0 30px 0 13px;" : "padding:0 42px 0 16px;"),
        )}
      >
        {/* Sem o ladrilho petrol atrás, o "A" pousa direto na barra e podia
            crescer: o arquivo é um ícone de app, com folga própria nas bordas,
            então o desenho só ganha presença se a caixa ganhar. Recolhida, a
            barra tem 84px de largura e a caixa cede o suficiente para não
            encostar no botão. */}
        <Logo size={col ? 38 : 44} priority />
        <div
          style={css(
            col
              ? "display:none"
              : "display:flex;flex-direction:column;gap:2px;min-width:0;flex:1;overflow:hidden;padding-right:6px",
          )}
        >
          <Wordmark size={15.5} />
          <span
            style={css(
              "font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--side-text2);" +
                "white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%",
            )}
          >
            {L.console}
          </span>
        </div>
        {/* Mesmo canto, dois papéis: no desktop recolhe a barra, no celular
            fecha a gaveta — que é o gesto que a pessoa procura ali. */}
        <Button
          onClick={() =>
            a.set((st) =>
              isMobile ? { navOpen: false } : { collapsed: !st.collapsed, hint: null },
            )
          }
          className="hv-menu"
          /**
           * O fundo é o da BARRA DE TOPO, não o da barra lateral.
           *
           * Ele fica exatamente na costura entre as duas, e com o lavado de
           * branco da barra escura (`--side-card`) aparecia como um bloco
           * solto, colado na marca. Vestido de `--surface` — com a borda e o
           * texto da mesma família — ele deixa de ser um terceiro elemento:
           * lê-se como a superfície do cabeçalho do conteúdo entrando na
           * lateral, arredondada só do lado de fora e sem borda do lado em que
           * encosta.
           *
           * Centrado por `top:50%`, e não por um `top` fixo: a faixa mudou de
           * altura e ainda pode mudar de novo.
           */
          style={css(
            "position:absolute;top:50%;transform:translateY(-50%);right:0;width:26px;height:30px;" +
              "border-radius:8px 0 0 8px;display:flex;align-items:center;justify-content:center;" +
              "border:1px solid var(--border);border-right:none;background:var(--surface);" +
              "color:var(--text2);cursor:pointer;padding:0;transition:color .12s,background .12s" +
              (isMobile ? ";font-size:17px;line-height:1" : ""),
          )}
          // Sem `{...hint}`, de propósito. O balão existe para nomear um ícone
          // que PERDEU o rótulo ao recolher — e este botão nunca teve um: ele é
          // o mesmo alvo, no mesmo canto, nos dois estados. Ali o balão cobria a
          // marca e o título da tela sem dizer nada que o desenho já não diga.
          // O `aria-label` fica: quem lê a tela continua ouvindo o nome.
          aria-label={isMobile ? L.fecharMenu : col ? L.expandir : L.colapsar}
        >
          {isMobile ? "×" : <ColapsarIcone />}
        </Button>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "12px 12px 0" }}>
        <span style={css(group)}>{L.gestao}</span>
        {item(ROUTES.overview, L.overview, <VisaoIcone />)}
        {item(
          ROUTES.customers,
          L.customers + " · " + customerCount,
          <ClientesIcone />,
          <span
            style={css(
              col
                ? "display:none"
                : `margin-left:auto;font-family:${MONO};font-size:10.5px;padding:2px 7px;` +
                    "border-radius:99px;background:rgba(255,255,255,.07);color:var(--side-text)",
            )}
          >
            {customerCount}
          </span>,
        )}
        {item(ROUTES.financeiro, L.financeiro, <FinanceiroIcone />)}
        {item(
          ROUTES.support,
          L.support + " · " + chamadosAbertos,
          <SuporteIcone />,
          <span
            style={css(
              col
                ? "display:none"
                : `margin-left:auto;font-family:${MONO};font-size:10.5px;padding:2px 7px;` +
                    "border-radius:99px;background:var(--danger-soft);color:var(--danger)",
            )}
          >
            {chamadosAbertos}
          </span>,
        )}

        <span style={css(group)}>{L.catalogo}</span>
        {item(ROUTES.plans, L.plans, <PlanosIcone />)}
        {item(ROUTES.modules, L.modules, <ModulosIcone />)}

        <span style={css(group)}>{L.system}</span>
        {item(ROUTES.settings, L.settings, <ConfigIcone />)}
      </nav>

      <div
        style={css(
          col
            ? "display:none"
            : "margin:16px 12px 0;padding:13px 14px;border-radius:11px;background:var(--side-card);" +
                "display:flex;flex-direction:column;gap:3px",
        )}
      >
        <span
          style={css(
            "font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:var(--side-text2)",
          )}
        >
          {L.mrr}
        </span>
        <span
          style={css(
            `font-family:${MONO};font-size:19px;font-weight:600;color:#fff;letter-spacing:-.02em`,
          )}
        >
          {mrrValor}
        </span>
        <span style={css("font-size:11px;color:var(--pos)")}>{mrrDelta}</span>
      </div>

      <div
        style={css(
          "margin-top:auto;padding:12px;border-top:1px solid var(--side-border);display:flex;" +
            // `relative` é a âncora do balão de "sair", que flutua sobre o que
            // estiver acima do rodapé.
            "flex-direction:column;gap:8px;position:relative",
        )}
      >
        {/* Sair.
            A pergunta acontece aqui mesmo, no rodapé, e não num diálogo sobre a
            tela: é o mesmo balão do portal do cliente. O clique de dentro para
            de subir para que o listener do provider — que fecha o balão a
            qualquer clique — não o feche no mesmo gesto.

            Fora do fluxo de propósito: no fluxo ele empurrava o rodapé e
            entrava na altura rolável da barra, que ganhava uma rolagem só para
            caber a pergunta. `absolute` o deixa flutuar sobre o cartão de
            receita, e o rodapé não se mexe ao abrir e fechar.

            O fundo precisa ser opaco — `--side-card` é branco translúcido, e
            sozinho deixaria o conteúdo de trás aparecer através do balão. Daí a
            camada sobre `--side`, que dá o mesmo tom sem transparência. */}
        {s.signOutOpen && !col && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={css(
              "position:absolute;left:12px;right:12px;bottom:100%;margin-bottom:8px;z-index:2;" +
                "padding:11px;border:1px solid var(--side-border);border-radius:10px;" +
                "background:linear-gradient(var(--side-card),var(--side-card)),var(--side);" +
                "box-shadow:var(--shadow-lg);animation:pop .16s ease",
            )}
          >
            <div style={css("font-size:12px;font-weight:600;line-height:1.4;color:#e4edf1")}>
              {L.signOutTitulo}
            </div>
            <div
              style={css("margin-top:3px;font-size:11px;line-height:1.4;color:var(--side-text2)")}
            >
              {L.signOutTexto}
            </div>
            <div style={css("display:flex;gap:6px;margin-top:9px")}>
              {/* Devolve a promessa: é dela que o botão tira o girador. O balão
                  fica aberto até o servidor responder — fechá-lo aqui
                  desmontaria o botão antes de o girador aparecer. */}
              <Button
                onClick={() => a.signOut()}
                loadingLabel={L.saindo}
                style={css(
                  "flex:1;padding:7px;border-radius:8px;border:none;background:var(--danger);" +
                    "color:#fff;font-size:12px;font-weight:600;cursor:pointer",
                )}
              >
                {L.signOutBotao}
              </Button>
              <Button
                onClick={() => a.set({ signOutOpen: false })}
                style={css(
                  "flex:1;padding:7px;border-radius:8px;border:1px solid var(--side-border);" +
                    "background:transparent;color:var(--side-text);font-size:12px;font-weight:600;" +
                    "cursor:pointer",
                )}
              >
                {L.cancelar}
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            // Na barra recolhida não cabe o balão (o texto quebraria dentro dos
            // 84px, e a barra rola no eixo Y). Então o clique abre a barra e faz
            // a pergunta já com largura para lê-la.
            a.set((st) =>
              col
                ? { collapsed: false, signOutOpen: true }
                : { signOutOpen: !st.signOutOpen },
            );
          }}
          className="hv-side"
          aria-label={L.signOut}
          aria-expanded={s.signOutOpen}
          {...hint}
          style={css(
            "display:flex;align-items:center;gap:12px;width:100%;padding:8px 6px;border-radius:9px;" +
              "border:none;background:none;text-align:left;cursor:pointer;" +
              "transition:background .12s,color .12s;" +
              (col ? "justify-content:center;" : ""),
          )}
        >
          <span
            style={css(
              "width:32px;height:32px;flex:none;border-radius:8px;background:var(--side-card);" +
                "color:var(--side-text);display:flex;align-items:center;justify-content:center;" +
                "font-size:12px;font-weight:600",
            )}
          >
            RA
          </span>
          <span
            style={css(
              col ? "display:none" : "display:flex;flex-direction:column;gap:1px;min-width:0;flex:1",
            )}
          >
            <span
              style={css(
                "font-size:12.5px;color:#e4edf1;font-weight:500;white-space:nowrap;" +
                  "overflow:hidden;text-overflow:ellipsis",
              )}
            >
              {/* `profiles.full_name` do usuário logado; cai no e-mail, e
                  depois no rótulo genérico, se o perfil não tiver nome. */}
              {s.adminName || L.admin}
            </span>
            <span style={css("font-size:10.5px;color:var(--side-text2)")}>{L.signOut}</span>
          </span>
          <span
            style={css(
              col
                ? "display:none"
                : "flex:none;display:flex;align-items:center;color:var(--side-text2)",
            )}
          >
            <SairIcone />
          </span>
        </Button>
      </div>
    </aside>
  );
}
