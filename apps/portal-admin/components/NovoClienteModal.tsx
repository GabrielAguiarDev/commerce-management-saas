"use client";

import { useActionState, useEffect, useState } from "react";
import { criarCliente, ESTADO_INICIAL } from "@/app/clientes/actions";
import { useAdmin } from "@/components/AdminProvider";
import { css, MONO } from "@/lib/css";
import { MODULOS_POR_PLANO, ROTULO_PLANO, type Plano } from "@/lib/planos";
import type { Cliente } from "@/types/types";

const ROTULO =
  "font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--tx3)";
const CAMPO =
  "border:1px solid var(--line);background:var(--field);color:var(--tx);border-radius:9px;" +
  "padding:10px 12px;font-size:13.5px;outline:none;width:100%";

/**
 * Formulário de cadastro de cliente.
 *
 * Segurança: este componente roda no navegador e NÃO fala com o Supabase. Ele
 * só entrega o FormData para a Server Action `criarCliente`, que é quem tem a
 * service_role. A validação daqui é conveniência para quem digita — a que
 * vale é a do servidor.
 */
export function NovoClienteModal({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const { s, a } = useAdmin();
  const { L } = a;
  const id = s.idioma;

  const [estado, enviar, enviando] = useActionState(criarCliente, ESTADO_INICIAL);
  const [plano, setPlano] = useState<Plano>("free");

  // Sucesso: avisa, coloca o cliente na lista e fecha.
  useEffect(() => {
    if (estado.status !== "sucesso") return;

    a.toast(estado.mensagem);

    // Ponte enquanto a lista ainda vem de `lib/mock/data.ts`: o cadastro já foi
    // gravado no Supabase, e aqui espelhamos o registro na lista em memória
    // para ele aparecer na hora. Quando a listagem passar a ler do banco, este
    // bloco sai e sobra só o revalidatePath que a action já faz.
    const c = estado.cliente;
    const novo: Cliente = {
      id: Date.now(),
      nome: c.nome,
      segmento: { pt: c.segmento || "—", en: c.segmento || "—" },
      plano: ROTULO_PLANO[c.plano],
      status: "ativo",
      data: new Date().toLocaleDateString("pt-BR"),
      cidade: "—",
      resp: c.responsavel || "—",
      valor: c.mensalidade > 0 ? `R$ ${c.mensalidade.toFixed(2).replace(".", ",")}` : "—",
      mods: [...c.modulos],
    };
    a.set((st) => ({ clientes: [novo, ...st.clientes] }));

    fechar();
    // `estado` só muda quando a action responde, então isto roda uma vez por envio.
  }, [estado, a, fechar]);

  if (!aberto) return null;

  const titulo = id === "pt" ? "Novo cliente" : "New customer";
  const sub =
    id === "pt"
      ? "O dono recebe um convite por e-mail para definir a própria senha."
      : "The owner gets an email invite to set their own password.";

  const campo = (
    nome: string,
    rotulo: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label style={css("display:flex;flex-direction:column;gap:6px")}>
      <span style={css(ROTULO)}>{rotulo}</span>
      <input name={nome} disabled={enviando} style={css(CAMPO)} {...props} />
    </label>
  );

  return (
    <div
      onClick={enviando ? undefined : fechar}
      style={css(
        "position:fixed;inset:0;z-index:80;background:rgba(5,16,21,.55);display:flex;" +
          "align-items:center;justify-content:center;padding:24px",
      )}
    >
      <form
        action={enviar}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={css(
          "width:100%;max-width:480px;max-height:90vh;overflow-y:auto;background:var(--panel);" +
            "border:1px solid var(--line);border-radius:14px;" +
            "box-shadow:0 24px 64px rgba(4,15,20,.35);padding:22px 24px 20px;" +
            "display:flex;flex-direction:column;gap:14px",
        )}
      >
        <div style={css("display:flex;align-items:flex-start;gap:13px")}>
          <div
            style={css(
              "flex:none;width:34px;height:34px;border-radius:9px;display:flex;align-items:center;" +
                "justify-content:center;font-size:15px;font-weight:700;background:var(--accSoft);color:var(--acc)",
            )}
          >
            +
          </div>
          <div style={css("display:flex;flex-direction:column;gap:5px;flex:1;min-width:0")}>
            <h3
              style={css(
                "margin:0;font-size:16.5px;font-weight:600;color:var(--tx);letter-spacing:-.01em",
              )}
            >
              {titulo}
            </h3>
            <p style={css("margin:0;font-size:13px;line-height:1.55;color:var(--tx2)")}>{sub}</p>
          </div>
          <button
            type="button"
            onClick={fechar}
            disabled={enviando}
            aria-label={L.fechar}
            className="hv-tx"
            style={css(
              "flex:none;width:28px;height:28px;display:flex;align-items:center;justify-content:center;" +
                "border:none;background:none;color:var(--tx3);font-size:16px;line-height:1;" +
                "border-radius:7px;cursor:pointer",
            )}
          >
            ×
          </button>
        </div>

        {/* Erro do servidor: mensagem única, no topo do formulário. */}
        {estado.status === "erro" && (
          <div
            role="alert"
            style={css(
              "padding:11px 13px;border:1px solid var(--badLine);background:var(--badBg);" +
                "border-radius:10px;font-size:12.5px;color:var(--bad);line-height:1.5",
            )}
          >
            {estado.mensagem}
          </div>
        )}

        <div style={css("display:flex;flex-direction:column;gap:13px")}>
          {campo("nome", id === "pt" ? "Nome do negócio" : "Business name", {
            required: true,
            autoFocus: true,
            placeholder: id === "pt" ? "Padaria da Esquina" : "Corner Bakery",
          })}

          {campo("segmento", L.segmento, {
            placeholder: id === "pt" ? "Alimentação · Padaria" : "Food · Bakery",
          })}

          {campo("responsavel", L.responsavel, {
            placeholder: id === "pt" ? "Nome do dono" : "Owner name",
          })}

          {campo("email", id === "pt" ? "E-mail de acesso" : "Access email", {
            type: "email",
            required: true,
            placeholder: "dono@negocio.com.br",
          })}

          <label style={css("display:flex;flex-direction:column;gap:6px")}>
            <span style={css(ROTULO)}>{L.plano}</span>
            <select
              name="plano"
              value={plano}
              onChange={(e) => setPlano(e.target.value as Plano)}
              disabled={enviando}
              style={css(CAMPO + ";cursor:pointer")}
            >
              <option value="free">{ROTULO_PLANO.free}</option>
              <option value="paid">{ROTULO_PLANO.paid}</option>
              <option value="custom">{ROTULO_PLANO.custom}</option>
            </select>
          </label>

          {/* A mensalidade só existe no plano customizado — nos outros é tabelada. */}
          {plano === "custom" && (
            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.mensalidade}</span>
              <input
                name="mensalidade"
                required
                inputMode="decimal"
                placeholder="149,00"
                disabled={enviando}
                style={css(`${CAMPO};width:150px;font-family:${MONO}`)}
              />
            </label>
          )}

          {/* Deixa visível o que o plano escolhido vai ativar, antes de enviar. */}
          <div
            style={css(
              "display:flex;flex-direction:column;gap:7px;padding:12px 14px;" +
                "border:1px solid var(--lineSoft);background:var(--panel2);border-radius:10px",
            )}
          >
            <span style={css(ROTULO)}>
              {id === "pt" ? "Módulos ativados" : "Modules enabled"}
            </span>
            <div style={css("display:flex;flex-wrap:wrap;gap:6px")}>
              {MODULOS_POR_PLANO[plano].map((k) => (
                <span
                  key={k}
                  style={css(
                    `font-family:${MONO};font-size:11px;font-weight:500;padding:4px 9px;` +
                      "border-radius:99px;border:1px solid var(--accLine);" +
                      "background:var(--accSoft);color:var(--acc)",
                  )}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={css("display:flex;justify-content:flex-end;gap:9px;padding-top:4px")}>
          <button
            type="button"
            onClick={fechar}
            disabled={enviando}
            className="hv-menu"
            style={css(
              "border:1px solid var(--line);background:var(--panel);color:var(--tx2);" +
                "font-size:13px;font-weight:500;padding:10px 16px;border-radius:9px;cursor:pointer",
            )}
          >
            {L.cancelar}
          </button>
          <button
            type="submit"
            disabled={enviando}
            className={enviando ? undefined : "hv-bright"}
            style={css(
              "font-size:13px;font-weight:600;padding:10px 16px;border-radius:9px;" +
                (enviando
                  ? "border:1px solid var(--line);background:var(--neu);color:var(--tx3);cursor:wait;"
                  : "border:1px solid var(--acc);background:var(--acc);color:var(--accTx);cursor:pointer;"),
            )}
          >
            {enviando
              ? id === "pt"
                ? "Cadastrando…"
                : "Creating…"
              : id === "pt"
                ? "Cadastrar cliente"
                : "Create customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
