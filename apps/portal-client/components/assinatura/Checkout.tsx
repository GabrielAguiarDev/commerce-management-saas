"use client";

import {
  Button,
  ChoiceCard,
  css,
  MONO,
  NUM,
  primaryButton,
  SANS,
  secondaryButton,
  Spinner,
  toneBackground,
} from "@aguiar/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { payWithCard, startPix, syncAttempt, type CardInput } from "@/app/assinatura/actions";
import { CardBrick, MP_PUBLIC_KEY } from "@/components/assinatura/CardBrick";
import { usePortal } from "@/components/PortalProvider";
import { monthLabel, rejectionMessage } from "@/lib/dados/assinatura";
import { brl } from "@/lib/formato";
import type { Charge, PaymentAttempt } from "@/types/types";

/**
 * O fluxo de pagamento de UMA mensalidade.
 *
 *   escolher a forma → Pix (QR + copia e cola, esperando cair)
 *                    → cartão (formulário do Mercado Pago)
 *                    → em análise (o banco ainda não respondeu)
 *                    → paga
 *
 * O estado vive aqui, e não no `PortalProvider`: é uma conversa curta, de uma
 * tela só, e nada fora dela precisa saber em que passo a pessoa está.
 *
 * A TELA NÃO DECIDE QUE FOI PAGO. Quem diz é o servidor (`syncAttempt`), que
 * pergunta ao Mercado Pago. Aqui só se desenha a resposta.
 */

type Step = "method" | "pix" | "card" | "review" | "done";

/** De quanto em quanto tempo a tela pergunta se o pagamento caiu. */
const POLL_MS = 5000;

/** O relógio da contagem regressiva — só anda enquanto `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const NOTICE = `margin:0;padding:12px 14px;border-radius:11px;font:600 12.5px/1.5 ${SANS}`;

export function Checkout({ charge, onClose }: { charge: Charge; onClose: () => void }) {
  const { a, s, isMobile } = usePortal();
  const router = useRouter();

  const [step, setStep] = useState<Step>("method");
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cardAvailable = MP_PUBLIC_KEY !== "";

  /** Leva para a tela o que o servidor acabou de responder sobre a tentativa. */
  const apply = useCallback(
    (next: PaymentAttempt) => {
      setAttempt(next);
      if (next.status === "approved") {
        setError(null);
        setStep("done");
        // O retrato do layout (menu, aviso de mensalidade) precisa ser relido.
        router.refresh();
      }
    },
    [router],
  );

  const waiting = (step === "pix" || step === "review") && attempt?.status === "pending";
  const attemptId = attempt?.id;

  useEffect(() => {
    if (!waiting || !attemptId) return;
    const id = setInterval(async () => {
      const result = await syncAttempt(attemptId);
      if (result.ok) apply(result.attempt);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [waiting, attemptId, apply]);

  const now = useNow(step === "pix" && attempt?.status === "pending");
  // Sem prazo conhecido a tela não inventa um vencimento: quem encerra é o servidor.
  const remaining = attempt?.expiresAt ? Date.parse(attempt.expiresAt) - now : null;
  const pixExpired =
    step === "pix" && !!attempt && (attempt.status === "expired" ||
      attempt.status === "cancelled" ||
      (remaining !== null && remaining <= 0));

  const openPix = async () => {
    setError(null);
    const result = await startPix(charge.id);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep("pix");
    apply(result.attempt);
  };

  const checkNow = async () => {
    if (!attempt) return;
    const result = await syncAttempt(attempt.id);
    if (!result.ok) {
      a.notify(result.message, "warn");
      return;
    }
    apply(result.attempt);
    if (result.attempt.status === "pending") {
      a.notify("Ainda não recebemos o pagamento. Pode levar alguns segundos.", "warn");
    }
  };

  const copyPix = async () => {
    if (!attempt?.pixCode) return;
    try {
      await navigator.clipboard.writeText(attempt.pixCode);
      a.notify("Código Pix copiado");
    } catch {
      a.notify("Não foi possível copiar. Selecione o código e copie manualmente.", "warn");
    }
  };

  const payCard = useCallback(
    async (card: CardInput): Promise<boolean> => {
      setError(null);
      const result = await payWithCard(charge.id, card);
      if (!result.ok) {
        setError(result.message);
        return false;
      }
      if (result.attempt.status === "approved") {
        apply(result.attempt);
        return true;
      }
      if (result.attempt.status === "pending") {
        setAttempt(result.attempt);
        setStep("review");
        return true;
      }
      setError(rejectionMessage(result.attempt.detail));
      return false;
    },
    [charge.id, apply],
  );

  const title =
    step === "done"
      ? "Pagamento confirmado"
      : step === "pix"
        ? "Pague com Pix"
        : step === "card"
          ? "Pague com cartão"
          : step === "review"
            ? "Pagamento em análise"
            : "Como você quer pagar?";

  return (
    <div
      style={css(
        "border:1px solid var(--border);border-radius:15px;background:var(--surface);" +
          "box-shadow:var(--shadow);overflow:hidden;animation:fadein .2s ease",
      )}
    >
      {/* Cabeçalho: o que está sendo pago, e a saída. */}
      <div
        style={css(
          "display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;" +
            "padding:15px 18px;border-bottom:1px solid var(--border)",
        )}
      >
        <div>
          <h2 style={css(`margin:0;font:700 15.5px ${SANS}`)}>{title}</h2>
          <p style={css(`margin:3px 0 0;font:400 12px/1.45 ${SANS};color:var(--muted)`)}>
            Mensalidade de {monthLabel(charge.month)} ·{" "}
            <span style={css(`font-weight:700;color:var(--text);${NUM}`)}>{brl(charge.amount)}</span>
          </p>
        </div>
        {step !== "done" && (
          <Button onClick={onClose} cssText={secondaryButton("sm")}>
            {step === "method" ? "Cancelar" : "Fechar"}
          </Button>
        )}
      </div>

      <div style={css(`padding:${isMobile ? "16px" : "20px"}`)}>
        {error && (
          <p role="alert" style={css(`${NOTICE};margin-bottom:14px;${toneBackground("danger", true)}`)}>
            {error}
          </p>
        )}

        {/* ─── 1. Forma de pagamento ───────────────────────────────── */}
        {step === "method" && (
          <div style={css("display:flex;flex-direction:column;gap:14px")}>
            <div
              style={css(
                `display:grid;gap:10px;grid-template-columns:${isMobile || !cardAvailable ? "1fr" : "1fr 1fr"}`,
              )}
            >
              <ChoiceCard
                name="Pix"
                note="Aprovação na hora. Pague com o QR code ou o copia e cola no app do seu banco."
                active={false}
                onClick={openPix}
              />
              {cardAvailable && (
                <ChoiceCard
                  name="Cartão de crédito"
                  note="À vista. Os dados do cartão vão direto para o Mercado Pago."
                  active={false}
                  onClick={() => {
                    setError(null);
                    setStep("card");
                  }}
                />
              )}
            </div>
            <p style={css(`margin:0;font:500 11.5px/1.5 ${SANS};color:var(--muted)`)}>
              Pagamento processado pelo Mercado Pago. A confirmação aparece aqui assim que ele
              for aprovado.
            </p>
          </div>
        )}

        {/* ─── 2a. Pix ─────────────────────────────────────────────── */}
        {step === "pix" && attempt && !pixExpired && (
          <div
            style={css(
              `display:flex;gap:${isMobile ? "16px" : "24px"};` +
                (isMobile ? "flex-direction:column;align-items:center" : "align-items:flex-start"),
            )}
          >
            {attempt.pixQr && (
              // O QR vem pronto do Mercado Pago, como PNG em base64: não há o
              // que o otimizador do `next/image` fazer com ele.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${attempt.pixQr}`}
                alt="QR code do Pix"
                width={196}
                height={196}
                style={css(
                  "flex:none;width:196px;height:196px;padding:8px;border:1px solid var(--border);" +
                    "border-radius:12px;background:#fff",
                )}
              />
            )}

            <div style={css("flex:1;min-width:0;width:100%;display:flex;flex-direction:column;gap:12px")}>
              <ol
                style={css(
                  `margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px;font:500 13px/1.5 ${SANS};color:var(--text2)`,
                )}
              >
                <li>Abra o app do seu banco e escolha pagar com Pix.</li>
                <li>Aponte a câmera para o QR code ou cole o código abaixo.</li>
                <li>Confirme o valor de {brl(attempt.amount)}. Pronto: esta tela se atualiza sozinha.</li>
              </ol>

              <div>
                <div style={css(`margin-bottom:6px;font:600 11px ${SANS};color:var(--text2)`)}>
                  Pix copia e cola
                </div>
                <div style={css("display:flex;gap:8px;align-items:stretch")}>
                  <input
                    readOnly
                    value={attempt.pixCode ?? ""}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Código Pix copia e cola"
                    style={css(
                      "flex:1;min-width:0;padding:11px 12px;border:1px solid var(--border2);border-radius:10px;" +
                        `background:var(--surface2);color:var(--text2);font:500 12px ${MONO}`,
                    )}
                  />
                  <Button onClick={copyPix} cssText={`flex:none;${primaryButton("sm")}`}>
                    Copiar
                  </Button>
                </div>
              </div>

              <div
                role="status"
                style={css(
                  `display:flex;align-items:center;gap:10px;flex-wrap:wrap;${NOTICE};${toneBackground("acc", true)}`,
                )}
              >
                <Spinner />
                <span style={css("flex:1;min-width:140px")}>Aguardando o pagamento…</span>
                {remaining !== null && (
                  <span style={css(`font:600 12px ${MONO};${NUM}`)}>expira em {clock(remaining)}</span>
                )}
              </div>

              <div style={css("display:flex;gap:8px;flex-wrap:wrap")}>
                <Button onClick={checkNow} cssText={secondaryButton("sm")}>
                  Já paguei
                </Button>
                {cardAvailable && (
                  <Button
                    onClick={() => {
                      setError(null);
                      setStep("card");
                    }}
                    cssText={secondaryButton("sm")}
                  >
                    Pagar com cartão
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === "pix" && pixExpired && (
          <div style={css("display:flex;flex-direction:column;align-items:flex-start;gap:12px")}>
            <p style={css(`${NOTICE};${toneBackground("warn", true)}`)}>
              Este código Pix expirou. Se você já pagou, toque em “Já paguei”; se não, gere um novo.
            </p>
            <div style={css("display:flex;gap:8px;flex-wrap:wrap")}>
              <Button onClick={openPix} cssText={primaryButton("sm")}>
                Gerar novo Pix
              </Button>
              <Button onClick={checkNow} cssText={secondaryButton("sm")}>
                Já paguei
              </Button>
            </div>
          </div>
        )}

        {/* ─── 2b. Cartão ──────────────────────────────────────────── */}
        {step === "card" && (
          <div style={css("display:flex;flex-direction:column;gap:12px;max-width:520px")}>
            <CardBrick amount={charge.amount} dark={s.theme === "dark"} onPay={payCard} />
            <div>
              <Button
                onClick={() => {
                  setError(null);
                  setStep("method");
                }}
                cssText={secondaryButton("sm")}
              >
                Escolher outra forma
              </Button>
            </div>
          </div>
        )}

        {/* ─── 3. Em análise ───────────────────────────────────────── */}
        {step === "review" && (
          <div style={css("display:flex;flex-direction:column;align-items:flex-start;gap:12px")}>
            <div
              role="status"
              style={css(`display:flex;align-items:center;gap:10px;${NOTICE};${toneBackground("acc", true)}`)}
            >
              <Spinner />
              <span>
                O banco ainda está analisando o pagamento. Isso costuma levar poucos minutos — você
                pode sair desta tela, a mensalidade é quitada sozinha quando ele aprovar.
              </span>
            </div>
            <Button onClick={checkNow} cssText={secondaryButton("sm")}>
              Verificar agora
            </Button>
          </div>
        )}

        {/* ─── 4. Paga ─────────────────────────────────────────────── */}
        {step === "done" && (
          <div
            style={css(
              "display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:14px 0 6px",
            )}
          >
            <span
              aria-hidden
              style={css(
                "width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
                  `${toneBackground("pos", true)};font:700 24px/1 ${SANS};animation:pop .25s ease`,
              )}
            >
              ✓
            </span>
            <div style={css(`margin-top:4px;font:700 17px ${SANS}`)}>
              Mensalidade de {monthLabel(charge.month)} paga
            </div>
            <p style={css(`margin:0;max-width:400px;font:400 13px/1.5 ${SANS};color:var(--muted)`)}>
              Recebemos {brl(attempt?.amount ?? charge.amount)}
              {attempt?.method === "pix"
                ? " por Pix"
                : attempt?.cardLast4
                  ? ` no cartão final ${attempt.cardLast4}`
                  : " no cartão"}
              . O comprovante fica no histórico abaixo. Obrigado!
            </p>
            <Button onClick={onClose} cssText={`margin-top:10px;${primaryButton("sm")}`}>
              Concluir
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
