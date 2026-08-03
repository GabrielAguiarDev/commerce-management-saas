"use client";

import { usePortal } from "@/components/PortalProvider";
import { BotaoNovo, CabecalhoTela, FaixaKpis, GrupoPilulas, Vazio } from "@/components/ui";
import { css, MONO, SANS } from "@/lib/css";
import { SP_STATUS } from "@/lib/dados/chamados";
import { rotuloData } from "@/lib/formato";
import { rotaChamado } from "@/lib/rotas";
import { campoFiltro } from "@/lib/styleKit";
import type { StatusChamado } from "@/types/types";

const FILTROS: { chave: string; nome: string }[] = [
  { chave: "todos", nome: "Todos" },
  { chave: "abertos", nome: "Em aberto" },
  { chave: "aguardando", nome: "Aguardando você" },
  { chave: "resolvido", nome: "Resolvidos" },
];

/**
 * Suporte.
 *
 * O atendimento é por chamado, não por chat: a pessoa escreve, fecha o portal e
 * volta quando quiser. Por isso o selo "aguardando você" é o mais destacado da
 * lista — é o único que pede uma ação de quem está olhando.
 */
export function SuporteView() {
  const { s, a, isMobile } = usePortal();
  const f = s.fSuporte;
  const set = (p: Partial<typeof f>) => a.set({ fSuporte: { ...f, ...p } });

  const busca = f.busca.trim().toLowerCase();
  const filtrados = s.chamados.filter((c) => {
    if (busca && !c.assunto.toLowerCase().includes(busca) && !c.id.includes(busca)) return false;
    if (f.status === "abertos" && c.status === "resolvido") return false;
    if (f.status === "aguardando" && c.status !== "aguardando") return false;
    if (f.status === "resolvido" && c.status !== "resolvido") return false;
    return true;
  });

  const contar = (st: StatusChamado) => s.chamados.filter((c) => c.status === st).length;
  const emAberto = s.chamados.filter((c) => c.status !== "resolvido").length;

  const kpis = [
    { label: "Em aberto", valor: String(emAberto), nota: emAberto ? "Ainda em atendimento" : "Nada pendente" },
    {
      label: "Aguardando você",
      valor: String(contar("aguardando")),
      nota: contar("aguardando") ? "O suporte espera sua resposta" : "Nenhuma resposta pendente",
      cor: contar("aguardando") ? "var(--warn)" : "var(--pos)",
    },
    { label: "Resolvidos", valor: String(contar("resolvido")), nota: "No histórico", cor: "var(--pos)" },
  ];

  return (
    <div>
      <CabecalhoTela
        titulo="Suporte"
        subtitulo="Precisa de ajuda? Abra um chamado e a gente responde por aqui — normalmente em até 1 dia útil."
        acao={<BotaoNovo texto="Abrir chamado" onClick={a.abrirNovoChamado} largo={isMobile} />}
      />

      {s.chamados.length === 0 ? (
        <div
          style={css(
            "display:flex;flex-direction:column;align-items:center;text-align:center;gap:7px;padding:48px 20px;" +
              "border:1px dashed var(--border2);border-radius:14px;background:var(--surface2)",
          )}
        >
          <span
            style={css(
              "width:46px;height:46px;border-radius:13px;background:var(--accent-soft);color:var(--accent);" +
                `display:flex;align-items:center;justify-content:center;font:700 15px ${MONO}`,
            )}
          >
            SP
          </span>
          <div style={css(`margin-top:2px;font:700 16px ${SANS}`)}>Nenhum chamado ainda</div>
          <p style={css(`margin:0;max-width:380px;font:400 13px/1.5 ${SANS};color:var(--muted)`)}>
            Travou em algo, apareceu um erro ou ficou com dúvida? Abra um chamado contando o que
            aconteceu — a gente responde aqui mesmo.
          </p>
          <button
            onClick={a.abrirNovoChamado}
            className="hv-brilho"
            style={css(
              `margin-top:10px;padding:14px 24px;border-radius:12px;background:var(--accent);color:var(--accent-ink);font:700 14px ${SANS}`,
            )}
          >
            Abrir chamado
          </button>
        </div>
      ) : (
        <>
          <FaixaKpis kpis={kpis} colunas={isMobile ? "1fr 1fr" : "repeat(3,minmax(0,1fr))"} />

          <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px")}>
            <input
              value={f.busca}
              onChange={(e) => set({ busca: e.target.value })}
              placeholder="Buscar pelo assunto do chamado"
              style={css(`flex:1;min-width:180px;${campoFiltro()}`)}
            />
            <GrupoPilulas
              opcoes={FILTROS}
              atual={f.status}
              onEscolher={(v) => set({ status: v })}
              tamanho="sm"
            />
          </div>

          {filtrados.length === 0 ? (
            <Vazio
              titulo="Nenhum chamado com esse filtro"
              texto="Tente outro termo de busca ou veja todos os chamados."
              acao="Ver todos"
              onAcao={() => set({ busca: "", status: "todos" })}
            />
          ) : (
            <>
              <div
                style={css(
                  "display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border);border-radius:12px;overflow:hidden",
                )}
              >
                {filtrados.map((c) => {
                  const st = SP_STATUS[c.status];
                  const ultima = c.msgs[c.msgs.length - 1];
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        a.marcarLido(c.id);
                        a.irPara(rotaChamado(c.id));
                      }}
                      className="hv-linha2"
                      style={css(
                        "display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--surface);text-align:left",
                      )}
                    >
                      <span
                        style={css(`flex:none;width:8px;height:8px;border-radius:50%;background:${st.ponto}`)}
                      />
                      <span style={css("flex:1;min-width:0")}>
                        <span style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
                          <span
                            style={css(
                              `font:${c.naoLido ? "700" : "600"} 13.5px ${SANS};color:var(--text)`,
                            )}
                          >
                            {c.assunto}
                          </span>
                          {c.naoLido && (
                            <span
                              style={css(
                                `padding:2px 8px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font:600 10px ${SANS}`,
                              )}
                            >
                              nova resposta
                            </span>
                          )}
                        </span>
                        <span
                          style={css(
                            `display:block;margin-top:4px;font:500 11.5px/1.4 ${SANS};color:var(--muted)`,
                          )}
                        >
                          #{c.id} · {c.categoria} · {c.msgs.length}{" "}
                          {c.msgs.length === 1 ? "mensagem" : "mensagens"} · última{" "}
                          {rotuloData(ultima.d, ultima.hora)}
                        </span>
                      </span>
                      <span
                        style={css(
                          `flex:none;padding:4px 10px;border-radius:999px;background:${st.bg};color:${st.cor};font:600 11px ${SANS};white-space:nowrap`,
                        )}
                      >
                        {st.rotulo}
                      </span>
                      <span style={css(`flex:none;color:var(--muted);font:600 14px/1 ${MONO}`)}>›</span>
                    </button>
                  );
                })}
              </div>
              <p style={css(`margin:10px 0 0;font:500 12px ${SANS};color:var(--muted)`)}>
                {filtrados.length} de {s.chamados.length} chamados
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
