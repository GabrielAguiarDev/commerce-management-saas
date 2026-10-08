"use client";

import { Button, css, Empty, KpiStrip, NUM, Panel, primaryButton, SANS, ScreenHeader } from "@aguiar/ui";
import { useState } from "react";
import { Checkout } from "@/components/assinatura/Checkout";
import { usePortal } from "@/components/PortalProvider";
import { CHARGE_LABEL, dateBr, METHOD_LABEL, monthLabel } from "@/lib/dados/assinatura";
import { brl } from "@/lib/formato";
import { ROUTES } from "@/lib/rotas";
import { BADGE_DANGER, BADGE_POS, BADGE_WARN, columns } from "@/lib/styleKit";
import type { Charge, ChargeStatus } from "@/types/types";

/** "outubro de 2026" → "Outubro de 2026", para abrir uma linha. */
function titleMonth(month: string): string {
  const label = monthLabel(month);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const STATUS_BADGE: Record<ChargeStatus, string> = {
  paid: BADGE_POS,
  pending: BADGE_WARN,
  overdue: BADGE_DANGER,
};

/**
 * Assinatura — a mensalidade que o negócio paga à Aguiar One.
 *
 * Só o dono chega aqui (o `proxy.ts` barra os demais, e o RLS não devolveria
 * linha nenhuma). A tela tem três partes: a situação, o que está em aberto —
 * com o botão que abre o pagamento ali mesmo — e o histórico.
 */
export function AssinaturaView() {
  const { d, a, isMobile } = usePortal();
  const billing = d.billing;

  // A cobrança em pagamento fica guardada pelo ID: quando ela é quitada o
  // retrato novo a tira da lista de abertas, e a tela de "paga" precisa
  // continuar de pé até a pessoa fechar.
  const [payingId, setPayingId] = useState<string | null>(null);

  if (!billing) {
    return (
      <div>
        <ScreenHeader title="Assinatura" subtitle="A mensalidade do seu plano Aguiar One." />
        <Empty
          standout
          title="Não foi possível carregar sua assinatura"
          text="Tente de novo em instantes. Se continuar assim, fale com a gente pelo Suporte."
          action="Abrir o Suporte"
          onAction={() => a.goTo(ROUTES.support)}
        />
      </div>
    );
  }

  const charges = billing.charges;
  // Da mais antiga para a mais nova: a que venceu primeiro é paga primeiro.
  const open = charges.filter((c) => c.status !== "paid").reverse();
  const paid = charges.filter((c) => c.status === "paid");
  const paying = payingId ? (charges.find((c) => c.id === payingId) ?? null) : null;

  if (billing.monthlyFee <= 0 && charges.length === 0) {
    return (
      <div>
        <ScreenHeader title="Assinatura" subtitle="A mensalidade do seu plano Aguiar One." />
        <Empty
          standout
          title="Seu plano não tem mensalidade"
          text="Não há nada a pagar por aqui. Se o seu plano mudar, as cobranças aparecem nesta tela."
        />
      </div>
    );
  }

  const overdue = open.filter((c) => c.status === "overdue");
  const next = open[0] ?? null;
  const lastPaid = paid[0] ?? null;

  const kpis = [
    {
      label: "Mensalidade",
      value: billing.monthlyFee > 0 ? brl(billing.monthlyFee) : "—",
      note: "Valor do seu plano por mês",
    },
    {
      label: "Situação",
      value: overdue.length ? "Em atraso" : open.length ? "Em aberto" : "Em dia",
      note: overdue.length
        ? `${overdue.length} ${overdue.length === 1 ? "mensalidade vencida" : "mensalidades vencidas"}`
        : open.length
          ? "Aguardando o pagamento do mês"
          : "Nenhuma mensalidade pendente",
      color: overdue.length ? "var(--danger)" : open.length ? "var(--warn)" : "var(--pos)",
    },
    {
      label: next ? "Vencimento" : "Último pagamento",
      value: next ? dateBr(next.dueDate) : dateBr(lastPaid?.paidAt ?? null),
      note: next
        ? `Mensalidade de ${monthLabel(next.month)}`
        : lastPaid
          ? `Mensalidade de ${monthLabel(lastPaid.month)}`
          : "Nenhum pagamento ainda",
    },
  ];

  return (
    <div>
      <ScreenHeader
        title="Assinatura"
        subtitle="A mensalidade do seu plano Aguiar One. Pague por aqui com Pix ou cartão — a confirmação é na hora."
      />

      <KpiStrip kpis={kpis} columns={isMobile ? "1fr" : "repeat(3,minmax(0,1fr))"} />

      <div style={css("display:flex;flex-direction:column;gap:14px")}>
        {paying ? (
          <Checkout key={paying.id} charge={paying} onClose={() => setPayingId(null)} />
        ) : open.length > 0 ? (
          <Panel
            title={open.length === 1 ? "Mensalidade em aberto" : "Mensalidades em aberto"}
            note="Escolha Pix ou cartão no próximo passo."
            flush
          >
            {open.map((c, i) => (
              <OpenCharge key={c.id} charge={c} first={i === 0} mobile={isMobile} onPay={() => setPayingId(c.id)} />
            ))}
          </Panel>
        ) : (
          <div
            style={css(
              "display:flex;align-items:center;gap:12px;padding:16px 18px;border:1px solid var(--pos-line);" +
                "border-radius:15px;background:var(--pos-soft)",
            )}
          >
            <span
              aria-hidden
              style={css(
                "flex:none;width:34px;height:34px;border-radius:50%;background:var(--pos);color:#fff;" +
                  `display:flex;align-items:center;justify-content:center;font:700 16px/1 ${SANS}`,
              )}
            >
              ✓
            </span>
            <div>
              <div style={css(`font:700 14px ${SANS};color:var(--pos)`)}>Tudo em dia</div>
              <div style={css(`margin-top:2px;font:500 12.5px/1.45 ${SANS};color:var(--text2)`)}>
                Não há mensalidade pendente. A próxima aparece aqui no início do mês que vem.
              </div>
            </div>
          </div>
        )}

        <Panel title="Histórico" note="As mensalidades já pagas." flush>
          {paid.length === 0 ? (
            <p style={css(`margin:0;padding:22px 18px;font:500 13px/1.5 ${SANS};color:var(--muted)`)}>
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            paid.map((c, i) => (
              <div
                key={c.id}
                style={css(
                  `display:grid;align-items:center;gap:${isMobile ? "4px 12px" : "12px"};padding:13px 18px;` +
                    `grid-template-columns:${columns(isMobile, "minmax(0,1.6fr) 1fr 1fr 110px", "1fr auto")};` +
                    (i ? "border-top:1px solid var(--border)" : ""),
                )}
              >
                <span style={css(`font:600 13.5px ${SANS};color:var(--text)`)}>
                  {titleMonth(c.month)}
                </span>
                <span style={css(`font:600 13.5px ${SANS};${NUM};${isMobile ? "text-align:right" : ""}`)}>
                  {brl(c.amount)}
                </span>
                <span style={css(`font:500 12px ${SANS};color:var(--muted)`)}>
                  Paga em {dateBr(c.paidAt)}
                </span>
                <span style={css(`font:500 12px ${SANS};color:var(--muted);text-align:right`)}>
                  {c.method ? METHOD_LABEL[c.method] : "Registro manual"}
                </span>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

function OpenCharge({
  charge,
  first,
  mobile,
  onPay,
}: {
  charge: Charge;
  first: boolean;
  mobile: boolean;
  onPay: () => void;
}) {
  return (
    <div
      style={css(
        "display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;" +
          `padding:${mobile ? "15px 16px" : "16px 18px"};` +
          (first ? "" : "border-top:1px solid var(--border)"),
      )}
    >
      <div style={css("min-width:0")}>
        <div style={css("display:flex;align-items:center;gap:8px;flex-wrap:wrap")}>
          <span style={css(`font:700 14px ${SANS};color:var(--text)`)}>
            {titleMonth(charge.month)}
          </span>
          <span style={css(STATUS_BADGE[charge.status])}>{CHARGE_LABEL[charge.status]}</span>
        </div>
        <div style={css(`margin-top:4px;font:500 12px/1.4 ${SANS};color:var(--muted)`)}>
          {charge.status === "overdue" ? "Venceu em " : "Vence em "}
          {dateBr(charge.dueDate)}
        </div>
      </div>
      <div style={css(`display:flex;align-items:center;gap:14px;${mobile ? "width:100%;justify-content:space-between" : ""}`)}>
        <span style={css(`font:700 18px/1 ${SANS};${NUM}`)}>{brl(charge.amount)}</span>
        <Button onClick={onPay} className="hv-glow" cssText={primaryButton("sm")}>
          Pagar agora
        </Button>
      </div>
    </div>
  );
}
