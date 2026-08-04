"use client";

import { resumoPapel } from "@/components/modais/EquipeModais";
import { usePortal } from "@/components/PortalProvider";
import { MenuLinha } from "@/components/ui";
import { botaoPrimario, campo, css, GrupoPilulas, Interruptor, MONO, Painel, ROTULO_CAMPO, ROTULO_KPI, SANS, SelecaoSimples, SUB_TELA, TITULO_TELA } from "@aguiar/ui";
import { LOG_TAGS } from "@/lib/dados/equipe";
import { MODULOS, MODULOS_PERM, PERFIS } from "@/lib/dados/perfis";
import { FORMAS, NOTA_FORMA } from "@/lib/dados/vendas";
import { rotuloData, siglaDe } from "@/lib/formato";
import { ROTAS } from "@/lib/rotas";
import { dadosSujos } from "@/lib/estado";
import type { AbaConfig } from "@/types/estado";
import type { DadosNegocio, ModuloKey, Preferencias } from "@/types/types";

const ABAS: { chave: AbaConfig; nome: string }[] = [
  { chave: "dados", nome: "Dados do negócio" },
  { chave: "prefs", nome: "Preferências" },
  { chave: "equipe", nome: "Equipe e acessos" },
  { chave: "conta", nome: "Conta e plano" },
];

/**
 * Configurações.
 *
 * Quatro abas com públicos diferentes: o que o cliente vê no comprovante, como
 * ele prefere trabalhar, quem mais entra no portal, e o que o plano dele tem.
 * A última é só leitura de propósito — mudar plano é conversa com o suporte.
 */
export function ConfigView() {
  const { s, a } = usePortal();
  const aba = s.fConfig.aba;

  return (
    <div>
      <div style={css("margin-bottom:16px")}>
        <h1 style={css(TITULO_TELA)}>Configurações</h1>
        <p style={css(SUB_TELA)}>
          Ajuste os dados do seu negócio, como você trabalha e quem pode usar o portal.
        </p>
      </div>

      <div style={css("margin-bottom:16px")}>
        <GrupoPilulas<AbaConfig>
          opcoes={ABAS}
          atual={aba}
          onEscolher={(v) => a.set({ fConfig: { ...s.fConfig, aba: v } })}
        />
      </div>

      {aba === "dados" && <AbaDados />}
      {aba === "prefs" && <AbaPreferencias />}
      {aba === "equipe" && <AbaEquipe />}
      {aba === "conta" && <AbaConta />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dados do negócio                                                            */
/* -------------------------------------------------------------------------- */

const CAMPOS: { chave: keyof DadosNegocio; label: string; placeholder: string }[] = [
  { chave: "nome", label: "Nome do negócio", placeholder: "Como o cliente conhece você" },
  { chave: "tipo", label: "Ramo", placeholder: "Ex.: petshop, lanchonete" },
  { chave: "documento", label: "CNPJ ou CPF", placeholder: "00.000.000/0000-00" },
  { chave: "telefone", label: "Telefone", placeholder: "(00) 00000-0000" },
  { chave: "endereco", label: "Endereço", placeholder: "Rua, número, bairro e cidade" },
];

function AbaDados() {
  const { s, a, isMobile } = usePortal();
  const r = s.dadosRascunho;
  const sujo = dadosSujos(s);

  const set = (chave: keyof DadosNegocio, valor: string) =>
    a.set({ dadosRascunho: { ...r, [chave]: valor } });

  const cols = isMobile ? "1fr" : "1fr 1fr";

  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
      )}
    >
      <div style={css("padding:15px 18px;border-bottom:1px solid var(--border)")}>
        <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>Dados do negócio</h2>
        <p style={css(`margin:3px 0 0;font:400 12px ${SANS};color:var(--muted)`)}>
          É o que aparece no portal e nos comprovantes das vendas.
        </p>
      </div>

      <div style={css("padding:18px;display:flex;flex-direction:column;gap:16px")}>
        <div style={css("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
          <span
            style={css(
              "flex:none;width:62px;height:62px;border-radius:16px;background:var(--petrol);color:#fff;" +
                `display:flex;align-items:center;justify-content:center;font:700 21px ${SANS}`,
            )}
          >
            {siglaDe(r.nome) || PERFIS[s.perfil].sigla}
          </span>
          <div style={css("flex:1;min-width:180px")}>
            <div style={css(`font:600 13px ${SANS}`)}>Logo do negócio</div>
            <p style={css(`margin:3px 0 8px;font:400 11.5px/1.45 ${SANS};color:var(--muted)`)}>
              Enquanto você não enviar uma imagem, usamos as iniciais do nome.
            </p>
            <button
              onClick={() => a.avisar("Envio de imagem estará disponível em breve")}
              className="hv-borda"
              style={css(
                `padding:9px 14px;border-radius:9px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font:600 12px ${SANS}`,
              )}
            >
              Enviar imagem
            </button>
          </div>
        </div>

        <div style={css(`display:grid;grid-template-columns:${cols};gap:13px`)}>
          {CAMPOS.map((c) => {
            // Nome vazio quebraria o menu e o comprovante — é o único obrigatório.
            const erro = c.chave === "nome" && !r.nome.trim();
            return (
              <div key={c.chave}>
                <label style={css(ROTULO_CAMPO)}>{c.label}</label>
                <input
                  value={r[c.chave]}
                  onChange={(e) => set(c.chave, e.target.value)}
                  placeholder={c.placeholder}
                  style={css(campo(erro))}
                />
                {erro && (
                  <div style={css(`margin-top:5px;font:600 11.5px ${SANS};color:var(--danger)`)}>
                    O negócio precisa de um nome.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={css(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;border-top:1px solid var(--border);background:var(--surface2)",
        )}
      >
        <button
          onClick={() => (r.nome.trim() ? a.salvarDados() : a.avisar("O negócio precisa de um nome"))}
          className="hv-brilho"
          style={css(botaoPrimario())}
        >
          Salvar alterações
        </button>
        {sujo && (
          <>
            <span
              style={css(`display:flex;align-items:center;gap:8px;font:600 12px ${SANS};color:var(--warn)`)}
            >
              <span style={css("width:7px;height:7px;border-radius:50%;background:var(--warn)")} />
              Você tem alterações não salvas
            </span>
            <button
              onClick={a.descartarDados}
              style={css(`padding:13px 16px;border-radius:11px;font:600 13px ${SANS};color:var(--text2)`)}
            >
              Descartar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preferências                                                                */
/* -------------------------------------------------------------------------- */

const PREFS: { chave: keyof Preferencias; nome: string; nota: string }[] = [
  {
    chave: "imprimirComprovante",
    nome: "Imprimir comprovante ao finalizar a venda",
    nota: "Se desligar, o comprovante fica só no histórico e pode ser reimpresso depois.",
  },
  {
    chave: "pedirCliente",
    nome: "Perguntar o nome do cliente na venda",
    nota: "Útil para encomendas e fiado. Deixa o balcão um pouco mais lento.",
  },
  {
    chave: "alertaEstoque",
    nome: "Avisar quando o estoque ficar baixo",
    nota: "O aviso aparece no topo do portal quando um produto chega no mínimo.",
  },
];

function AbaPreferencias() {
  const { s, a, tem, isDesktop } = usePortal();
  const cols = isDesktop ? "1fr 1fr" : "1fr";

  const grupos = [
    {
      id: "produto" as const,
      titulo: "Categorias de produto",
      nota: "Organizam o catálogo e os relatórios de venda.",
      itens: s.catsProduto,
      nova: s.novaCatProduto,
      placeholder: "Ex.: Bebidas",
      usoDe: (nome: string) => s.produtos.filter((p) => p.categoria === nome).length,
    },
    ...(tem("custos")
      ? [
          {
            id: "custo" as const,
            titulo: "Categorias de custo",
            nota: "Mostram para onde o dinheiro foi, nos relatórios.",
            itens: s.catsCusto,
            nova: s.novaCatCusto,
            placeholder: "Ex.: Manutenção",
            usoDe: (nome: string) => s.custos.filter((c) => c.categoria === nome).length,
          },
        ]
      : []),
  ];

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <Painel
        titulo="Formas de pagamento que você aceita"
        nota="Só as ligadas aparecem na hora de registrar a venda."
        semPadding
      >
        <div style={css("display:flex;flex-direction:column")}>
          {FORMAS.map((f) => (
            <Interruptor
              key={f}
              ligado={s.formasAceitas.includes(f)}
              onToggle={() => a.toggleForma(f)}
              titulo={f}
              nota={NOTA_FORMA[f]}
              estado={s.formasAceitas.includes(f) ? "Aceito" : "Desligado"}
            />
          ))}
        </div>
      </Painel>

      <div style={css(`display:grid;grid-template-columns:${cols};gap:14px`)}>
        {grupos.map((g) => (
          <div
            key={g.id}
            style={css(
              "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
            )}
          >
            <div style={css("padding:15px 18px;border-bottom:1px solid var(--border)")}>
              <h2 style={css(`margin:0;font:700 15px ${SANS}`)}>{g.titulo}</h2>
              <p style={css(`margin:3px 0 0;font:400 12px ${SANS};color:var(--muted)`)}>{g.nota}</p>
            </div>

            <div style={css("display:flex;flex-direction:column")}>
              {g.itens.length === 0 ? (
                <div
                  style={css(
                    `padding:22px 18px;text-align:center;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
                  )}
                >
                  Nenhuma categoria ainda. Crie a primeira abaixo.
                </div>
              ) : (
                g.itens.map((c) => {
                  const uso = g.usoDe(c);
                  return (
                    <div
                      key={c}
                      style={css(
                        "display:flex;align-items:center;gap:10px;padding:11px 18px;border-bottom:1px solid var(--border)",
                      )}
                    >
                      <span
                        style={css(
                          `flex:1;min-width:0;font:500 13px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`,
                        )}
                      >
                        {c}
                      </span>
                      <span style={css(`flex:none;font:500 11.5px ${MONO};color:var(--muted)`)}>
                        {uso} {uso === 1 ? "item" : "itens"}
                      </span>
                      <button
                        onClick={() =>
                          a.confirmar({
                            titulo: "Remover esta categoria?",
                            texto:
                              uso > 0
                                ? "Os itens que a usam passam para “Outros” — nada é apagado."
                                : "Ela some da lista de escolhas.",
                            resumo: c,
                            sub: uso > 0 ? `${uso} ${uso === 1 ? "item usa" : "itens usam"} esta categoria` : "Não está em uso",
                            reversao: "Você pode criar de novo com o mesmo nome.",
                            btn: "Remover categoria",
                            btnBg: "var(--danger)",
                            btnFg: "#fff",
                            cor: "var(--danger)",
                            acao: () => a.removerCategoria(g.id, c),
                          })
                        }
                        title="Remover categoria"
                        className="hv-remover"
                        style={css(
                          `flex:none;width:28px;height:28px;border-radius:8px;color:var(--muted);font:600 13px/1 ${MONO}`,
                        )}
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={css("display:flex;gap:8px;padding:13px 18px;background:var(--surface2)")}>
              <input
                value={g.nova}
                onChange={(e) =>
                  a.set(g.id === "produto" ? { novaCatProduto: e.target.value } : { novaCatCusto: e.target.value })
                }
                placeholder={g.placeholder}
                style={css(
                  `flex:1;min-width:0;padding:11px 13px;border:1px solid var(--border2);border-radius:10px;background:var(--surface);font:500 13px ${SANS};color:var(--text);outline:none`,
                )}
              />
              <button
                onClick={() => a.criarCategoria(g.id)}
                className="hv-brilho"
                style={css(
                  `flex:none;padding:11px 16px;border-radius:10px;background:var(--accent);color:var(--accent-ink);font:700 12.5px ${SANS}`,
                )}
              >
                Criar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Painel titulo="Como você prefere usar" semPadding>
        <div style={css("display:flex;flex-direction:column")}>
          <div
            style={css(
              "display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);flex-wrap:wrap",
            )}
          >
            <span style={css("flex:1;min-width:150px")}>
              <span style={css(`display:block;font:600 13.5px ${SANS}`)}>Aparência</span>
              <span style={css(`display:block;margin-top:2px;font:500 11.5px ${SANS};color:var(--muted)`)}>
                Escolha o que cansa menos a sua vista.
              </span>
            </span>
            <GrupoPilulas
              opcoes={[
                { chave: "claro", nome: "Claro" },
                { chave: "escuro", nome: "Escuro" },
              ]}
              atual={s.tema}
              onEscolher={(v) => a.set({ tema: v })}
              tamanho="sm"
            />
          </div>

          {PREFS.map((p) => (
            <Interruptor
              key={p.chave}
              ligado={s.prefs[p.chave]}
              onToggle={() => a.togglePref(p.chave)}
              titulo={p.nome}
              nota={p.nota}
            />
          ))}

          <div style={css("display:flex;align-items:center;gap:12px;padding:14px 18px;flex-wrap:wrap")}>
            <span style={css("flex:1;min-width:150px")}>
              <span style={css(`display:block;font:600 13.5px ${SANS}`)}>Idioma</span>
              <span style={css(`display:block;margin-top:2px;font:500 11.5px ${SANS};color:var(--muted)`)}>
                Idioma do portal para todos os funcionários.
              </span>
            </span>
            <SelecaoSimples
              valor={s.idioma}
              opcoes={["Português (Brasil)", "English"]}
              onMudar={(v) => a.set({ idioma: v })}
              estilo={
                `padding:11px 13px;border:1px solid var(--border2);border-radius:10px;background:var(--surface2);font:600 12.5px ${SANS};color:var(--text)`
              }
            />
          </div>
        </div>
      </Painel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

function AbaEquipe() {
  const { s, a, tem, isDesktop } = usePortal();
  const f = s.fConfig;
  const set = (p: Partial<typeof f>) => a.set({ fConfig: { ...f, ...p } });

  const ativos = s.equipe.filter((x) => x.ativo).length;

  const dias: Record<string, number> = { "Últimos 7 dias": 7, "Últimos 30 dias": 30, Tudo: 9999 };
  const logFiltrado = s.log.filter((l) => {
    if (l.d >= (dias[f.logPeriodo] ?? 30)) return false;
    if (f.logUsuario !== "Todos" && l.quem !== f.logUsuario) return false;
    if (f.logAcao !== "Tudo" && LOG_TAGS[l.tag].nome !== f.logAcao) return false;
    return true;
  });

  const papelCols = isDesktop ? "1fr 1fr" : "1fr";

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <Painel
        titulo="Funcionários"
        nota={
          s.equipe.length <= 1
            ? "Cadastre quem trabalha com você — cada pessoa recebe um login próprio."
            : `${s.equipe.length} pessoas cadastradas · ${ativos} com acesso liberado`
        }
        acao={
          <button
            onClick={() => a.abrirFuncionario(null)}
            className="hv-brilho"
            style={css(botaoPrimario("sm"))}
          >
            + Novo funcionário
          </button>
        }
        semPadding
      >
        {s.equipe.length <= 1 && (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:36px 20px",
            )}
          >
            <div style={css(`font:700 15px ${SANS}`)}>Você trabalha sozinho por aqui</div>
            <p style={css(`margin:0;max-width:340px;font:400 12.5px/1.5 ${SANS};color:var(--muted)`)}>
              Quando contratar alguém, cadastre aqui: cada pessoa recebe um login próprio e vê só o
              que você liberar.
            </p>
          </div>
        )}

        <div style={css("display:flex;flex-direction:column")}>
          {s.equipe.map((x) => (
            <div key={x.id} style={css("position:relative;border-bottom:1px solid var(--border)")}>
              <div style={css("display:flex;align-items:center;gap:12px;padding:13px 18px")}>
                <span
                  style={css(
                    "flex:none;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;" +
                      `font:700 12.5px ${SANS};` +
                      (x.ativo
                        ? "background:var(--accent-soft);color:var(--accent)"
                        : "background:var(--surface3);color:var(--muted)"),
                  )}
                >
                  {siglaDe(x.nome)}
                </span>

                <span style={css("flex:1;min-width:0")}>
                  <span style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
                    <span
                      style={css(
                        `font:600 13.5px ${SANS};color:${x.ativo ? "var(--text)" : "var(--muted)"}`,
                      )}
                    >
                      {x.nome}
                    </span>
                    <span
                      style={css(
                        "padding:2px 8px;border-radius:999px;font:600 10.5px " +
                          SANS +
                          ";" +
                          (x.dono
                            ? "background:var(--accent-soft);color:var(--accent)"
                            : "background:var(--surface3);color:var(--text2)"),
                      )}
                    >
                      {x.papel}
                    </span>
                    {!x.ativo && (
                      <span
                        style={css(
                          `padding:2px 8px;border-radius:999px;background:var(--surface3);color:var(--muted);font:600 10.5px ${SANS}`,
                        )}
                      >
                        Sem acesso
                      </span>
                    )}
                  </span>
                  <span
                    style={css(`display:block;margin-top:3px;font:500 11.5px ${SANS};color:var(--muted)`)}
                  >
                    {x.email} · último acesso {x.acesso}
                  </span>
                </span>

                {/* O dono não se remove nem se suspende: alguém tem de ficar com
                    a chave da casa. */}
                {x.dono ? (
                  <span style={css(`flex:none;font:500 11px ${SANS};color:var(--muted)`)}>é você</span>
                ) : (
                  <MenuLinha
                    chave={`func:${x.id}`}
                    largura={214}
                    acoes={[
                      { texto: "Editar funcionário", onClick: () => a.abrirFuncionario(x.id) },
                      {
                        texto: x.ativo ? "Suspender acesso" : "Liberar acesso",
                        cor: "var(--warn)",
                        onClick: () =>
                          a.confirmar({
                            titulo: x.ativo ? "Suspender o acesso?" : "Liberar o acesso?",
                            texto: x.ativo
                              ? "A pessoa deixa de conseguir entrar no portal, mas continua cadastrada."
                              : "A pessoa volta a conseguir entrar com o mesmo e-mail.",
                            resumo: x.nome,
                            sub: `${x.email} · ${x.papel}`,
                            reversao: "Dá para desfazer pelo mesmo menu.",
                            btn: x.ativo ? "Suspender" : "Liberar",
                            btnBg: "var(--warn)",
                            btnFg: "#fff",
                            cor: "var(--warn)",
                            acao: () => a.toggleFuncionario(x.id),
                          }),
                      },
                      {
                        texto: "Remover do portal",
                        cor: "var(--danger)",
                        onClick: () =>
                          a.confirmar({
                            titulo: "Remover esta pessoa?",
                            texto:
                              "Ela perde o acesso e sai da lista. O histórico do que ela fez continua registrado.",
                            resumo: x.nome,
                            sub: `${x.email} · ${x.papel}`,
                            reversao: "Isto não pode ser desfeito — seria preciso cadastrar de novo.",
                            btn: "Remover",
                            btnBg: "var(--danger)",
                            btnFg: "#fff",
                            cor: "var(--danger)",
                            acao: () => a.removerFuncionario(x.id),
                          }),
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </Painel>

      <Painel
        titulo="Tipos de acesso"
        nota="Cada tipo define o que a pessoa vê no portal. Só aparecem os módulos que o seu plano tem."
        acao={
          <button
            onClick={() => a.abrirPapel(null)}
            className="hv-acc-borda"
            style={css(
              `padding:11px 18px;border-radius:10px;border:1px solid var(--border2);background:var(--surface2);color:var(--text2);font:600 13px ${SANS}`,
            )}
          >
            + Novo tipo
          </button>
        }
        semPadding
      >
        <div style={css(`display:grid;grid-template-columns:${papelCols};gap:1px;background:var(--border)`)}>
          {s.papeis.map((p) => {
            const pessoas = s.equipe.filter((x) => x.papel === p.nome).length;
            return (
              <div key={p.id} style={css("position:relative;padding:15px 18px;background:var(--surface)")}>
                <div style={css("display:flex;align-items:flex-start;gap:10px")}>
                  <div style={css("flex:1;min-width:0")}>
                    <div style={css("display:flex;align-items:center;gap:7px;flex-wrap:wrap")}>
                      <span style={css(`font:700 14px ${SANS}`)}>{p.nome}</span>
                      {p.fixo && (
                        <span
                          style={css(
                            `padding:2px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font:600 10.5px ${SANS}`,
                          )}
                        >
                          acesso total
                        </span>
                      )}
                    </div>
                    <div style={css(`margin-top:5px;font:500 11.5px/1.45 ${SANS};color:var(--muted)`)}>
                      {resumoPapel(p.modulos, p.fixo)}
                    </div>
                    <div style={css(`margin-top:4px;font:500 11.5px ${SANS};color:var(--muted)`)}>
                      {pessoas === 0
                        ? "Ninguém usa este tipo"
                        : `${pessoas} ${pessoas === 1 ? "pessoa usa" : "pessoas usam"}`}
                    </div>
                  </div>

                  {!p.fixo && (
                    <MenuLinha
                      chave={`papel:${p.id}`}
                      largura={200}
                      acoes={[
                        { texto: "Editar acessos", onClick: () => a.abrirPapel(p.id) },
                        {
                          texto: "Remover tipo",
                          cor: "var(--danger)",
                          onClick: () =>
                            a.confirmar({
                              titulo: "Remover este tipo de acesso?",
                              texto:
                                pessoas > 0
                                  ? "Há pessoas usando este tipo — mova-as para outro antes de remover."
                                  : "Ele some da lista de escolhas ao cadastrar alguém.",
                              resumo: p.nome,
                              sub: resumoPapel(p.modulos, p.fixo),
                              reversao: "Você pode criar de novo com os mesmos acessos.",
                              btn: "Remover tipo",
                              btnBg: "var(--danger)",
                              btnFg: "#fff",
                              cor: "var(--danger)",
                              acao: () => a.removerPapel(p.id),
                            }),
                        },
                      ]}
                    />
                  )}
                </div>

                <div style={css("display:flex;gap:5px;flex-wrap:wrap;margin-top:11px")}>
                  {(p.fixo ? MODULOS_PERM.filter((m) => tem(m)) : p.modulos).map((m) => (
                    <span
                      key={m}
                      style={css(
                        `padding:3px 9px;border-radius:999px;background:var(--surface3);color:var(--text2);font:600 10.5px ${SANS}`,
                      )}
                    >
                      {MODULOS[m as ModuloKey].nome}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Painel>

      <Painel
        titulo="O que aconteceu no portal"
        nota="Registro de quem fez o quê. É só para consulta — ninguém pode apagar."
        semPadding
      >
        <div
          style={css(
            "display:flex;gap:8px;flex-wrap:wrap;padding:13px 18px;border-bottom:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <SelecaoSimples
            valor={f.logUsuario}
            opcoes={["Todos", ...s.equipe.map((x) => x.nome)]}
            onMudar={(v) => set({ logUsuario: v })}
          />
          <SelecaoSimples
            valor={f.logAcao}
            opcoes={["Tudo", ...Object.values(LOG_TAGS).map((t) => t.nome)]}
            onMudar={(v) => set({ logAcao: v })}
          />
          <SelecaoSimples
            valor={f.logPeriodo}
            opcoes={["Últimos 7 dias", "Últimos 30 dias", "Tudo"]}
            onMudar={(v) => set({ logPeriodo: v })}
          />
        </div>

        {logFiltrado.length === 0 ? (
          <div style={css("padding:32px 20px;text-align:center")}>
            <div style={css(`font:700 14.5px ${SANS}`)}>Nada registrado neste filtro</div>
            <p style={css(`margin:5px 0 0;font:400 12.5px/1.5 ${SANS};color:var(--muted)`)}>
              Mude o período ou o funcionário para ver o histórico.
            </p>
          </div>
        ) : (
          <div style={css("display:flex;flex-direction:column")}>
            {logFiltrado.map((l) => {
              const t = LOG_TAGS[l.tag];
              return (
                <div
                  key={l.id}
                  style={css(
                    "display:flex;align-items:flex-start;gap:12px;padding:12px 18px;border-bottom:1px solid var(--border)",
                  )}
                >
                  <span
                    style={css(
                      "flex:none;width:30px;height:30px;border-radius:9px;background:var(--surface3);color:var(--text2);" +
                        `display:flex;align-items:center;justify-content:center;font:700 11px ${SANS}`,
                    )}
                  >
                    {siglaDe(l.quem)}
                  </span>
                  <span style={css("flex:1;min-width:0")}>
                    <span style={css(`display:block;font:500 13px/1.4 ${SANS}`)}>
                      <span style={css("font-weight:600")}>{l.quem}</span> {l.texto}
                    </span>
                    <span style={css("display:flex;align-items:center;gap:7px;margin-top:3px;flex-wrap:wrap")}>
                      <span
                        style={css(
                          `padding:2px 7px;border-radius:999px;background:${t.bg};color:${t.cor};font:600 10px ${SANS}`,
                        )}
                      >
                        {t.nome}
                      </span>
                      <span style={css(`font:500 11px ${MONO};color:var(--muted)`)}>
                        {rotuloData(l.d, l.hora)}
                      </span>
                      {l.detalhe && (
                        <span style={css(`font:400 11px ${SANS};color:var(--muted)`)}>· {l.detalhe}</span>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Painel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conta e plano                                                               */
/* -------------------------------------------------------------------------- */

function AbaConta() {
  const { a, tem, modulos, isDesktop } = usePortal();

  const todos = Object.keys(MODULOS) as ModuloKey[];
  const plano = modulos.length >= 8 ? "Plano Completo" : "Plano Essencial";
  const modCols = isDesktop ? "repeat(3,minmax(0,1fr))" : "1fr 1fr";

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <div
        style={css(
          "border:1px solid var(--border);border-radius:15px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden",
        )}
      >
        <div
          style={css(
            "display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:18px;border-bottom:1px solid var(--border)",
          )}
        >
          <div style={css("flex:1;min-width:200px")}>
            <div style={css(ROTULO_KPI)}>Seu plano</div>
            <div style={css(`margin-top:6px;font:700 24px/1.1 ${SANS}`)}>{plano}</div>
            <div style={css(`margin-top:5px;font:500 12.5px/1.45 ${SANS};color:var(--muted)`)}>
              {modulos.length} de {todos.length} módulos ligados · cobrança mensal
            </div>
          </div>
          <span
            style={css(
              `flex:none;padding:7px 14px;border-radius:999px;background:var(--pos-soft);color:var(--pos);font:600 12px ${SANS}`,
            )}
          >
            Ativo
          </span>
        </div>

        <div style={css("padding:18px")}>
          <div style={css(`margin-bottom:11px;${ROTULO_KPI}`)}>Módulos do seu plano</div>
          <div style={css(`display:grid;grid-template-columns:${modCols};gap:8px`)}>
            {todos.map((m) => {
              const ligado = tem(m);
              return (
                <div
                  key={m}
                  style={css(
                    "display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:11px;" +
                      `border:1px solid ${ligado ? "var(--border)" : "var(--border)"};` +
                      `background:${ligado ? "var(--surface2)" : "transparent"}`,
                  )}
                >
                  <span
                    style={css(
                      "flex:none;width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;" +
                        `font:600 10px ${MONO};` +
                        (ligado
                          ? "background:var(--accent);color:var(--accent-ink)"
                          : "background:var(--surface3);color:var(--muted)"),
                    )}
                  >
                    {MODULOS[m].sigla}
                  </span>
                  <span
                    style={css(
                      `flex:1;min-width:0;font:600 12.5px ${SANS};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` +
                        `color:${ligado ? "var(--text)" : "var(--muted)"}`,
                    )}
                  >
                    {MODULOS[m].nome}
                  </span>
                  <span
                    style={css(
                      `flex:none;white-space:nowrap;font:600 11px ${SANS};color:${ligado ? "var(--accent)" : "var(--muted)"}`,
                    )}
                  >
                    {ligado ? "ligado" : "não incluso"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={css(
            "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 18px;border-top:1px solid var(--border);background:var(--surface2)",
          )}
        >
          <p
            style={css(`flex:1;min-width:200px;margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}
          >
            Quer ligar um módulo novo ou mudar de plano? Quem cuida disso é a nossa equipe — fale com
            a gente e ajustamos para você.
          </p>
          <button
            onClick={() => a.irPara(ROTAS.suporte)}
            className="hv-brilho"
            style={css(`flex:none;${botaoPrimario("sm")}`)}
          >
            Falar com o suporte
          </button>
        </div>
      </div>
    </div>
  );
}
