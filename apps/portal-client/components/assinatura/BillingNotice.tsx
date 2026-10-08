"use client";

import { css, SANS } from "@aguiar/ui";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import { usePortal } from "@/components/PortalProvider";
import { dateBr, todayBr } from "@/lib/dados/assinatura";
import { ROUTES } from "@/lib/rotas";
import { platformPaymentsEnabled } from "@/lib/platformPayments";

/** A partir de quantos dias antes do vencimento o aviso aparece. */
const WARN_DAYS = 5;

function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}

/**
 * A tarja da mensalidade, em qualquer tela — só para o dono.
 *
 * Aparece quando há mensalidade vencida ou vencendo nos próximos dias, e some
 * na própria tela de Assinatura (lá a cobrança já é o assunto). É um lembrete,
 * não uma trava: o portal segue funcionando com a mensalidade em aberto.
 */
export function BillingNotice() {
  const { d, isMobile } = usePortal();
  const pathname = usePathname();

  const charges = d.billing?.charges ?? [];
  if (!platformPaymentsEnabled() || pathname === ROUTES.billing || charges.length === 0) return null;

  const open = charges.filter((c) => c.status !== "paid");
  const overdue = open.filter((c) => c.status === "overdue");
  // A que vence primeiro entre as que ainda estão no prazo.
  const upcoming = open
    .filter((c) => c.status === "pending" && c.dueDate)
    .sort((x, y) => (x.dueDate! < y.dueDate! ? -1 : 1))[0];

  const late = overdue.length > 0;
  if (!late && (!upcoming || daysUntil(upcoming.dueDate!, todayBr()) > WARN_DAYS)) return null;

  const tone = late ? "danger" : "warn";
  const text = late
    ? overdue.length === 1
      ? "Sua mensalidade está vencida."
      : `Você tem ${overdue.length} mensalidades vencidas.`
    : `Sua mensalidade vence em ${dateBr(upcoming!.dueDate)}.`;

  return (
    <div
      role="status"
      style={css(
        `margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:${isMobile ? "11px 13px" : "12px 15px"};` +
          `border:1px solid var(--${tone}-line);border-radius:12px;background:var(--${tone}-soft);` +
          `font:600 12.5px/1.5 ${SANS};color:var(--${tone})`,
      )}
    >
      <span aria-hidden style={css(`flex:none;width:8px;height:8px;border-radius:50%;background:var(--${tone})`)} />
      <span style={css("flex:1;min-width:180px")}>{text} Pague por aqui com Pix ou cartão.</span>
      <NavLink
        href={ROUTES.billing}
        style={css(
          `flex:none;padding:7px 13px;border-radius:9px;background:var(--${tone});color:#fff;font:700 12px ${SANS};text-decoration:none`,
        )}
      >
        Pagar agora
      </NavLink>
    </div>
  );
}
