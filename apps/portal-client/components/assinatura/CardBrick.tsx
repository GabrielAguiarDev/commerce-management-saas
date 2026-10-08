"use client";

import { css, SANS, Spinner } from "@aguiar/ui";
import { useEffect, useId, useRef, useState } from "react";
import type { CardInput } from "@/app/assinatura/actions";

/**
 * O formulário de cartão do Mercado Pago (Card Payment Brick).
 *
 * POR QUE NÃO É UM FORMULÁRIO NOSSO: número, validade e CVV não podem tocar o
 * nosso servidor — isso nos colocaria dentro do PCI-DSS. O Brick desenha os
 * campos, manda o cartão direto para o Mercado Pago e devolve só um `token` de
 * uso único. É esse token que segue para a Edge Function.
 *
 * A chave pública (`NEXT_PUBLIC_MP_PUBLIC_KEY`) é pública de verdade: só
 * serve para tokenizar. Sem ela o portal não oferece cartão — só Pix.
 */

export const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";

const SDK_URL = "https://sdk.mercadopago.com/js/v2";

interface BrickFormData {
  token?: string;
  issuer_id?: string | number;
  payment_method_id?: string;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
}

interface BrickController {
  unmount: () => void;
}

interface MercadoPagoInstance {
  bricks: () => {
    create: (
      brick: "cardPayment",
      containerId: string,
      settings: unknown,
    ) => Promise<BrickController>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}

/** Uma promessa só para a página inteira: o script entra uma vez. */
let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        // Falhou (sem internet, bloqueador): a próxima montagem tenta de novo.
        sdkPromise = null;
        script.remove();
        reject(new Error("sdk"));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
}

export function CardBrick({
  amount,
  dark,
  onPay,
}: {
  amount: number;
  dark: boolean;
  /**
   * Cobra o cartão. Devolve `true` quando o formulário pode dar o envio por
   * encerrado, e `false` para o Brick liberar o botão para outra tentativa.
   */
  onPay: (card: CardInput) => Promise<boolean>;
}) {
  const containerId = "mp-card-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // O Brick guarda o callback da montagem; a ref o mantém apontando para a
  // versão atual sem remontar o formulário (e apagar o que foi digitado).
  const onPayRef = useRef(onPay);
  useEffect(() => {
    onPayRef.current = onPay;
  }, [onPay]);

  useEffect(() => {
    let cancelled = false;
    let controller: BrickController | null = null;

    loadSdk()
      .then(async () => {
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });

        const created = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount },
          customization: {
            visual: { hideFormTitle: true, style: { theme: dark ? "dark" : "default" } },
            // Mensalidade é à vista.
            paymentMethods: { minInstallments: 1, maxInstallments: 1 },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setState("ready");
            },
            onSubmit: (data: BrickFormData) =>
              new Promise<void>((resolve, reject) => {
                onPayRef
                  .current({
                    token: data.token ?? "",
                    paymentMethodId: data.payment_method_id ?? "",
                    issuerId: data.issuer_id == null ? "" : String(data.issuer_id),
                    payerEmail: data.payer?.email ?? "",
                    docType: data.payer?.identification?.type ?? "",
                    docNumber: data.payer?.identification?.number ?? "",
                  })
                  .then((done) => (done ? resolve() : reject()))
                  .catch(() => reject());
              }),
            onError: () => {
              // Erro de campo o próprio Brick mostra. Só vira tela de erro se
              // ele nem chegou a ficar pronto.
              if (!cancelled) setState((current) => (current === "loading" ? "error" : current));
            },
          },
        });

        // Desmontou enquanto o Brick nascia (troca de tela, Strict Mode).
        if (cancelled) created.unmount();
        else controller = created;
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
      controller?.unmount();
    };
  }, [amount, containerId, dark]);

  return (
    <div>
      {state === "loading" && (
        <div
          style={css(
            `display:flex;align-items:center;justify-content:center;gap:10px;padding:34px 0;font:500 13px ${SANS};color:var(--muted)`,
          )}
        >
          <Spinner /> Carregando o formulário seguro…
        </div>
      )}
      {state === "error" && (
        <p
          role="alert"
          style={css(
            "margin:0;padding:13px 15px;border:1px solid var(--warn-line);border-radius:12px;" +
              `background:var(--warn-soft);font:600 12.5px/1.5 ${SANS};color:var(--warn)`,
          )}
        >
          Não foi possível carregar o formulário do cartão. Verifique sua conexão (ou um
          bloqueador de anúncios) e tente de novo — ou pague com Pix.
        </p>
      )}
      <div id={containerId} />
    </div>
  );
}
