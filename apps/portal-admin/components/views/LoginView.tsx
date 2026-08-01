"use client";

import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/AdminProvider";
import { css } from "@/lib/css";
import { MarcaIcone } from "@/lib/icons";
import { ROTAS } from "@/lib/rotas";

/** 0 = unusable, 3 = strong. Length, mixed classes, then length-or-symbol. */
function forcaSenha(v: string): number {
  if (!v) return 0;
  let n = 0;
  if (v.length >= 8) n++;
  if (/\d/.test(v) && /[a-zA-Z]/.test(v)) n++;
  if (v.length >= 12 || /[^\w\s]/.test(v)) n++;
  return n;
}

const cartao = (gap = "16px") =>
  "background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:26px;" +
  `display:flex;flex-direction:column;gap:${gap};box-shadow:0 12px 32px rgba(9,26,33,.09)`;

const CARTAO = cartao();

const CAMPO =
  "border:1px solid var(--line);background:var(--field);color:var(--tx);border-radius:9px;" +
  "padding:11px 13px;font-size:13.5px;outline:none";

const ROTULO =
  "font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--tx3)";

const PRIMARIO =
  "background:var(--acc);border:1px solid var(--acc);color:var(--accTx);font-size:14px;" +
  "font-weight:600;padding:12px;border-radius:9px;cursor:pointer";

export function LoginView() {
  const { s, a } = useAdmin();
  const { L } = a;
  const router = useRouter();
  const nf = forcaSenha(s.senha1);

  const titulo =
    s.authView === "esqueci" || s.authView === "enviado" ? L.esqueciTitulo : L.redefinirTitulo;
  const sub =
    s.authView === "esqueci"
      ? L.esqueciSub
      : s.authView === "enviado"
        ? L.linkEnviado
        : L.redefinirSub;

  const salvarNovaSenha = () => {
    if (!s.senha1 || s.senha1 !== s.senha2) {
      a.toast(L.toastErroSenha, "erro");
      return;
    }
    a.set({ authView: "login", senha1: "", senha2: "" });
    a.toast(L.toastSenha);
  };

  const voltar = (
    <button
      onClick={() => a.set({ authView: "login", senha1: "", senha2: "", emailRec: "" })}
      className="hv-acc"
      style={css(
        "align-self:center;background:none;border:none;color:var(--tx3);font-size:12.5px;" +
          "cursor:pointer;padding:0",
      )}
    >
      {L.voltarLogin}
    </button>
  );

  return (
    <div
      style={css(
        "position:fixed;inset:0;z-index:60;background:var(--bg);display:flex;align-items:center;" +
          "justify-content:center;padding:24px",
      )}
    >
      <div
        style={css(
          "width:100%;max-width:392px;display:flex;flex-direction:column;gap:26px",
        )}
      >
        <div style={css("display:flex;align-items:center;gap:12px")}>
          <div
            style={css(
              "width:42px;height:42px;flex:none;border-radius:12px;background:var(--acc);" +
                "color:var(--accTx);display:flex;align-items:center;justify-content:center",
            )}
          >
            <MarcaIcone size={22} />
          </div>
          <div style={css("display:flex;flex-direction:column;gap:2px")}>
            <span
              style={css(
                "font-size:20px;font-weight:600;letter-spacing:-.02em;color:var(--tx)",
              )}
            >
              Aguiar One
            </span>
            <span
              style={css(
                "font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)",
              )}
            >
              {L.console}
            </span>
          </div>
        </div>

        {s.authView === "login" && (
          <>
            <div style={css(CARTAO)}>
              <div style={css("display:flex;flex-direction:column;gap:4px")}>
                <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>
                  {L.entrarTitulo}
                </h2>
                <p style={css("margin:0;font-size:12.5px;color:var(--tx2)")}>{L.entrarSub}</p>
              </div>

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(ROTULO)}>{L.email}</span>
                <input
                  value={s.loginEmail}
                  onChange={(e) => a.set({ loginEmail: e.target.value })}
                  placeholder="rafael@aguiarone.com.br"
                  style={css(CAMPO)}
                />
              </label>

              <label style={css("display:flex;flex-direction:column;gap:6px")}>
                <span style={css(ROTULO)}>{L.senha}</span>
                <input
                  type="password"
                  value={s.loginSenha}
                  onChange={(e) => a.set({ loginSenha: e.target.value })}
                  placeholder="••••••••"
                  style={css(CAMPO)}
                />
              </label>

              <button
                onClick={() => router.push(ROTAS.visao)}
                className="hv-bright"
                style={css(PRIMARIO + ";margin-top:2px")}
              >
                {L.entrar}
              </button>
              <button
                onClick={() => a.set({ authView: "esqueci", senha1: "", senha2: "" })}
                className="hv-acc-hi"
                style={css(
                  "align-self:center;background:none;border:none;color:var(--acc);" +
                    "font-size:12.5px;cursor:pointer;padding:0",
                )}
              >
                {L.esqueci}
              </button>
            </div>

            <div style={css("display:flex;justify-content:flex-end;gap:14px;flex-wrap:wrap")}>
              <button
                onClick={() => a.set({ authView: "redefinir", senha1: "", senha2: "" })}
                className="hv-acc"
                style={css(
                  "background:none;border:none;color:var(--tx3);font-size:11.5px;cursor:pointer;" +
                    "padding:0;text-decoration:underline",
                )}
              >
                {L.verRedefinir}
              </button>
            </div>
          </>
        )}

        {s.authView === "redefinir" && (
          <div style={css(CARTAO)}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}>
              <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>
                {titulo}
              </h2>
              <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.5")}>{sub}</p>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.criarSenha}</span>
              <input
                type="password"
                value={s.senha1}
                onChange={(e) => a.set({ senha1: e.target.value })}
                placeholder="••••••••"
                style={css(CAMPO)}
              />
              <div style={css("display:flex;gap:5px;padding-top:2px")}>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={css(
                      "flex:1;height:4px;border-radius:99px;background:" +
                        (nf >= i
                          ? nf === 1
                            ? "var(--bad)"
                            : nf === 2
                              ? "var(--warn)"
                              : "var(--ok)"
                          : "var(--neuLine)"),
                    )}
                  />
                ))}
              </div>
              <span
                style={css(
                  "font-size:11.5px;font-weight:500;color:" +
                    (nf === 0
                      ? "var(--tx3)"
                      : nf === 1
                        ? "var(--bad)"
                        : nf === 2
                          ? "var(--warn)"
                          : "var(--ok)"),
                )}
              >
                {nf === 0
                  ? L.forcaVazia
                  : nf === 1
                    ? L.forcaFraca
                    : nf === 2
                      ? L.forcaMedia
                      : L.forcaForte}
              </span>
            </label>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.confirmarSenha}</span>
              <input
                type="password"
                value={s.senha2}
                onChange={(e) => a.set({ senha2: e.target.value })}
                placeholder="••••••••"
                style={css(CAMPO)}
              />
            </label>

            <button
              onClick={salvarNovaSenha}
              className="hv-bright"
              style={css(PRIMARIO + ";margin-top:2px")}
            >
              {L.salvarSenha}
            </button>
            {voltar}
          </div>
        )}

        {s.authView === "esqueci" && (
          <div style={css(CARTAO)}>
            <div style={css("display:flex;flex-direction:column;gap:5px")}>
              <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>
                {titulo}
              </h2>
              <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.5")}>{sub}</p>
            </div>

            <label style={css("display:flex;flex-direction:column;gap:6px")}>
              <span style={css(ROTULO)}>{L.email}</span>
              <input
                value={s.emailRec}
                onChange={(e) => a.set({ emailRec: e.target.value })}
                placeholder="nome@negocio.com.br"
                style={css(CAMPO)}
              />
            </label>

            <button
              onClick={() => a.set({ authView: "enviado" })}
              className="hv-bright"
              style={css(PRIMARIO)}
            >
              {L.enviarLink}
            </button>
            {voltar}
          </div>
        )}

        {s.authView === "enviado" && (
          <div style={css(cartao("14px"))}>
            <div
              style={css(
                "width:38px;height:38px;border-radius:10px;background:var(--okBg);" +
                  "border:1px solid var(--okLine);color:var(--ok);display:flex;align-items:center;" +
                  "justify-content:center;font-size:16px;font-weight:700",
              )}
            >
              ✓
            </div>
            <h2 style={css("margin:0;font-size:17px;font-weight:600;color:var(--tx)")}>{titulo}</h2>
            <p style={css("margin:0;font-size:12.5px;color:var(--tx2);line-height:1.55")}>
              {L.linkEnviado}
            </p>
            <button
              onClick={() => a.set({ authView: "login", senha1: "", senha2: "", emailRec: "" })}
              className="hv-acc-line"
              style={css(
                "align-self:flex-start;border:1px solid var(--line);background:var(--panel);" +
                  "color:var(--tx2);font-size:12.5px;font-weight:500;padding:9px 14px;" +
                  "border-radius:9px;cursor:pointer",
              )}
            >
              {L.voltarLogin}
            </button>
          </div>
        )}

        <div style={css("display:flex;align-items:center;justify-content:center;gap:12px")}>
          <span style={css("font-size:11.5px;color:var(--tx3)")}>{L.acessoRestrito}</span>
        </div>
      </div>
    </div>
  );
}
