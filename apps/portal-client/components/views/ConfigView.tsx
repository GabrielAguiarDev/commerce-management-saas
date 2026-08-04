"use client";

import {
  botaoPrimario,
  campo,
  css,
  GrupoPilulas,
  Interruptor,
  MONO,
  Painel,
  ROTULO_CAMPO,
  ROTULO_KPI,
  SANS,
  SUB_TELA,
  TITULO_TELA,
} from "@aguiar/ui";
import type { ReactNode } from "react";
import { resumoPapel } from "@/components/modais/EquipeModais";
import { usePortal } from "@/components/PortalProvider";
import { MenuLinha } from "@/components/ui";
import { MODULOS, MODULOS_PERM } from "@/lib/dados/perfis";
import { categoriasDe } from "@/lib/dados/produtos";
import { FORMAS, NOTA_FORMA } from "@/lib/dados/vendas";
import { dadosSujos } from "@/lib/estado";
import { siglaDe } from "@/lib/formato";
import { ROTAS } from "@/lib/rotas";
import type { AbaConfig } from "@/types/estado";
import type { DadosNegocio, ModuloKey } from "@/types/types";

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

/**
 * Um aviso honesto para o que a tela mostra mas o banco ainda não guarda.
 *
 * Existe porque a alternativa é pior: um interruptor que parece salvar e não
 * salva faz a pessoa descobrir sozinha, dias depois, que o portal mentiu.
 */
function AvisoNaoSalvo({ children }: { children: ReactNode }) {
  return (
    <div
      style={css(
        "display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px dashed var(--border2);" +
          "border-radius:12px;background:var(--surface2)",
      )}
    >
      <span
        style={css(
          `flex:none;padding:3px 9px;border-radius:999px;background:var(--warn-soft);color:var(--warn);font:600 10.5px ${SANS}`,
        )}
      >
        Em breve
      </span>
      <p style={css(`margin:0;font:500 12px/1.5 ${SANS};color:var(--text2)`)}>{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dados do negócio                                                            */
/* -------------------------------------------------------------------------- */

const CAMPOS: { chave: keyof DadosNegocio; label: string; placeholder: string }[] = [
  { chave: "nome", label: "Nome do negócio", placeholder: "Como o cliente conhece você" },
  { chave: "tipo", label: "Ramo", placeholder: "Ex.: petshop, lanchonete" },
  { chave: "telefone", label: "Telefone", placeholder: "(00) 00000-0000" },
  { chave: "cidade", label: "Cidade", placeholder: "Ex.: Salvador/BA" },
];

function AbaDados() {
  const { s, a, isMobile, d } = usePortal();
  const r = s.dadosRascunho;
  const sujo = dadosSujos(s, d.dados);
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
            {siglaDe(r.nome) || d.negocio.sigla}
          </span>
          <div style={css("flex:1;min-width:180px")}>
            <div style={css(`font:600 13px ${SANS}`)}>Logo do negócio</div>
            <p style={css(`margin:3px 0 8px;font:400 11.5px/1.45 ${SANS};color:var(--muted)`)}>
              Enquanto você não enviar uma imagem, usamos as iniciais do nome.
            </p>
            <button
              onClick={() => a.avisar("O envio de imagem ainda não está disponível")}
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
                  onChange={(e) => a.set({ dadosRascunho: { ...r, [c.chave]: e.target.value } })}
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

        <AvisoNaoSalvo>
          CNPJ/CPF e endereço completo ainda não têm onde ser guardados. Até lá, informe-os ao
          suporte para constarem na nota.
        </AvisoNaoSalvo>
      </div>

      <div
        style={css(
          "display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;border-top:1px solid var(--border);background:var(--surface2)",
        )}
      >
        <button
          onClick={a.salvarDados}
          disabled={s.salvando || !r.nome.trim()}
          className={s.salvando ? undefined : "hv-brilho"}
          style={css(botaoPrimario() + (s.salvando ? ";opacity:.6;cursor:progress" : ""))}
        >
          {s.salvando ? "Salvando…" : "Salvar alterações"}
        </button>
        {sujo && (
          <>
            <span
              style={css(
                `display:flex;align-items:center;gap:8px;font:600 12px ${SANS};color:var(--warn)`,
              )}
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

function AbaPreferencias() {
  const { s, a, tem, d } = usePortal();
  const categorias = categoriasDe(d.produtos);

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
        <div style={css("padding:13px 18px;border-top:1px solid var(--border);background:var(--surface2)")}>
          <AvisoNaoSalvo>
            Esta escolha vale só nesta sessão — ainda não há onde guardá-la. No próximo login todas
            as formas voltam ligadas.
          </AvisoNaoSalvo>
        </div>
      </Painel>

      <Painel
        titulo="Categorias do catálogo"
        nota="Saem dos próprios produtos: uma categoria existe enquanto algum produto a usa."
        semPadding
      >
        <div style={css("display:flex;flex-direction:column")}>
          {categorias.length === 0 ? (
            <div
              style={css(
                `padding:22px 18px;text-align:center;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
              )}
            >
              Nenhuma categoria ainda. Ela nasce quando você cadastra um produto.
            </div>
          ) : (
            categorias.map((c) => {
              const uso = d.produtos.filter((p) => p.categoria === c).length;
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
                    {uso} {uso === 1 ? "produto" : "produtos"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Painel>

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
                { chave: "claro" as const, nome: "Claro" },
                { chave: "escuro" as const, nome: "Escuro" },
              ]}
              atual={s.tema}
              onEscolher={(v) => a.set({ tema: v })}
              tamanho="sm"
            />
          </div>

          <Interruptor
            ligado={s.imprimirComprovante}
            onToggle={() => a.set({ imprimirComprovante: !s.imprimirComprovante })}
            titulo="Imprimir comprovante ao finalizar a venda"
            nota="Se desligar, o comprovante fica só no histórico e pode ser reimpresso depois."
          />
          <Interruptor
            ligado={s.pedirCliente}
            onToggle={() => a.set({ pedirCliente: !s.pedirCliente })}
            titulo="Perguntar o nome do cliente na venda"
            nota="Útil para encomendas e fiado. Deixa o balcão um pouco mais lento."
          />

          {tem("estoque") && (
            <div
              style={css(
                `display:flex;align-items:center;gap:12px;padding:14px 18px;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
              )}
            >
              O aviso de estoque baixo está sempre ligado: ele aparece no topo do portal quando um
              produto chega no mínimo que você definiu.
            </div>
          )}
        </div>

        <div style={css("padding:13px 18px;border-top:1px solid var(--border);background:var(--surface2)")}>
          <AvisoNaoSalvo>
            Aparência e preferências de venda ainda valem só nesta sessão.
          </AvisoNaoSalvo>
        </div>
      </Painel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

function AbaEquipe() {
  const { a, tem, isDesktop, d } = usePortal();

  const ativos = d.equipe.filter((x) => x.ativo).length;
  const papelCols = isDesktop ? "1fr 1fr" : "1fr";

  return (
    <div style={css("display:flex;flex-direction:column;gap:14px")}>
      <Painel
        titulo="Funcionários"
        nota={
          d.equipe.length <= 1
            ? "Por enquanto só você tem acesso a este portal."
            : `${d.equipe.length} pessoas cadastradas · ${ativos} com acesso liberado`
        }
        semPadding
      >
        {d.equipe.length === 0 ? (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;padding:36px 20px",
            )}
          >
            <div style={css(`font:700 15px ${SANS}`)}>Nenhum funcionário cadastrado</div>
            <p style={css(`margin:0;max-width:340px;font:400 12.5px/1.5 ${SANS};color:var(--muted)`)}>
              Fale com a nossa equipe para liberar o acesso de mais alguém.
            </p>
          </div>
        ) : (
          <div style={css("display:flex;flex-direction:column")}>
            {d.equipe.map((x) => (
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
                          `padding:2px 8px;border-radius:999px;font:600 10.5px ${SANS};` +
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
                  </span>

                  {/* O dono não se remove nem se suspende: alguém tem de ficar
                      com a chave da casa. */}
                  {x.dono ? (
                    <span style={css(`flex:none;font:500 11px ${SANS};color:var(--muted)`)}>é você</span>
                  ) : (
                    <MenuLinha
                      chave={`func:${x.id}`}
                      largura={214}
                      acoes={[
                        {
                          texto: "Mudar tipo de acesso",
                          onClick: () => a.abrirModal({ k: "funcionario", id: x.id }),
                        },
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
                              sub: x.papel,
                              reversao: "Dá para desfazer pelo mesmo menu.",
                              btn: x.ativo ? "Suspender" : "Liberar",
                              btnBg: "var(--warn)",
                              btnFg: "#fff",
                              cor: "var(--warn)",
                              acao: () => a.toggleFuncionario(x.id),
                            }),
                        },
                      ]}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={css("padding:13px 18px;border-top:1px solid var(--border);background:var(--surface2)")}>
          <AvisoNaoSalvo>
            Cadastrar um funcionário novo cria um login, e isso ainda é feito pela nossa equipe. Aqui
            você muda o tipo de acesso e suspende quem já existe.
          </AvisoNaoSalvo>
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
        {d.papeis.length === 0 ? (
          <div
            style={css(
              `padding:28px 20px;text-align:center;font:500 12.5px/1.5 ${SANS};color:var(--muted)`,
            )}
          >
            Nenhum tipo de acesso criado ainda. Crie o primeiro para dividir o que cada pessoa
            enxerga.
          </div>
        ) : (
          <div
            style={css(`display:grid;grid-template-columns:${papelCols};gap:1px;background:var(--border)`)}
          >
            {d.papeis.map((p) => {
              const pessoas = d.equipe.filter((x) => x.papel === p.nome).length;
              return (
                <div
                  key={p.id}
                  style={css("position:relative;padding:15px 18px;background:var(--surface)")}
                >
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
                                    : "Ele some da lista de escolhas ao definir o acesso de alguém.",
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
                        {MODULOS[m].nome}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Painel>

      <Painel titulo="O que aconteceu no portal" nota="Registro de quem fez o quê, para consulta.">
        <AvisoNaoSalvo>
          O histórico de ações ainda não é gravado. Quando existir, esta lista mostrará cada venda,
          ajuste de estoque e alteração de acesso, com autor e horário.
        </AvisoNaoSalvo>
      </Painel>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Conta e plano                                                               */
/* -------------------------------------------------------------------------- */

function AbaConta() {
  const { a, tem, isDesktop } = usePortal();

  // `dashboard` e `config` não são vendidos: todo cliente os tem.
  const todos = (Object.keys(MODULOS) as ModuloKey[]).filter(
    (m) => m !== "dashboard" && m !== "config",
  );
  const modCols = isDesktop ? "repeat(3,minmax(0,1fr))" : "1fr 1fr";
  const ligados = todos.filter((m) => tem(m)).length;

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
            <div style={css(`margin-top:6px;font:700 24px/1.1 ${SANS}`)}>
              {ligados >= todos.length ? "Plano Completo" : "Plano Essencial"}
            </div>
            <div style={css(`margin-top:5px;font:500 12.5px/1.45 ${SANS};color:var(--muted)`)}>
              {ligados} de {todos.length} módulos ligados
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
                      "border:1px solid var(--border);" +
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

      <Painel titulo="Sua conta" nota="Encerrar a sessão neste dispositivo.">
        <button
          onClick={a.sair}
          className="hv-borda"
          style={css(
            `padding:12px 18px;border-radius:11px;border:1px solid var(--border2);background:var(--surface);color:var(--danger);font:600 13px ${SANS}`,
          )}
        >
          Sair da conta
        </button>
      </Painel>
    </div>
  );
}
