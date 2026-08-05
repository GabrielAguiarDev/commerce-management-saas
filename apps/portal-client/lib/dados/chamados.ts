import type { MessageAuthor, Ticket, TicketStatus } from "@/types/types";

export const SP_STATUS: Record<
  TicketStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  open: {
    label: "Aberto",
    bg: "var(--surface3)",
    color: "var(--text2)",
    dot: "var(--border2)",
  },
  inProgress: {
    label: "Em andamento",
    bg: "var(--accent-soft)",
    color: "var(--accent)",
    dot: "var(--accent)",
  },
  waiting: {
    label: "Aguardando você",
    bg: "var(--warn-soft)",
    color: "var(--warn)",
    dot: "var(--warn)",
  },
  resolved: {
    label: "Resolvido",
    bg: "var(--pos-soft)",
    color: "var(--pos)",
    dot: "var(--pos)",
  },
};

/** As quatro portas de entrada do chamado, com o exemplo que explica cada uma. */
export const SP_CATEGORIES: [string, string][] = [
  ["Dúvida", "Não sei como fazer algo no portal"],
  ["Problema técnico", "Algo travou, sumiu ou deu erro"],
  ["Financeiro", "Cobrança, plano ou nota fiscal"],
  ["Sugestão", "Uma ideia para melhorar o sistema"],
];

/** `support_tickets.status` — as mesmas chaves que o painel admin lê e escreve. */
export const STATUS_DB: Record<TicketStatus, string> = {
  open: "open",
  inProgress: "in_progress",
  waiting: "waiting_client",
  resolved: "resolved",
};

const DB_TO_PORTAL: Record<string, TicketStatus> = Object.fromEntries(
  Object.entries(STATUS_DB).map(([pt, db]) => [db, pt as TicketStatus]),
) as Record<string, TicketStatus>;

export function statusFromDb(v: string | null): TicketStatus {
  return DB_TO_PORTAL[v ?? ""] ?? "open";
}

/** `support_messages.sender_side`. */
export function authorFromDb(v: string | null): MessageAuthor {
  if (v === "support" || v === "admin") return "support";
  if (v === "system") return "system";
  return "customer";
}

export const AUTHOR_DB: Record<MessageAuthor, string> = {
  customer: "client",
  support: "support",
  system: "system",
};

/** Chamado resolvido é histórico: só volta a aceitar resposta se for reaberto. */
export function canReply(c: Ticket): boolean {
  return c.status !== "resolved";
}

/** Protocolo curto e estável a partir do uuid — o que o cliente cita ao ligar. */
export function protocolOf(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
