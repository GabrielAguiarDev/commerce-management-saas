import type { AutorMensagem, Chamado, StatusChamado } from "@/types/types";

export const SP_STATUS: Record<
  StatusChamado,
  { rotulo: string; bg: string; cor: string; ponto: string }
> = {
  aberto: {
    rotulo: "Aberto",
    bg: "var(--surface3)",
    cor: "var(--text2)",
    ponto: "var(--border2)",
  },
  andamento: {
    rotulo: "Em andamento",
    bg: "var(--accent-soft)",
    cor: "var(--accent)",
    ponto: "var(--accent)",
  },
  aguardando: {
    rotulo: "Aguardando você",
    bg: "var(--warn-soft)",
    cor: "var(--warn)",
    ponto: "var(--warn)",
  },
  resolvido: {
    rotulo: "Resolvido",
    bg: "var(--pos-soft)",
    cor: "var(--pos)",
    ponto: "var(--pos)",
  },
};

/** As quatro portas de entrada do chamado, com o exemplo que explica cada uma. */
export const SP_CATS: [string, string][] = [
  ["Dúvida", "Não sei como fazer algo no portal"],
  ["Problema técnico", "Algo travou, sumiu ou deu erro"],
  ["Financeiro", "Cobrança, plano ou nota fiscal"],
  ["Sugestão", "Uma ideia para melhorar o sistema"],
];

/** `support_tickets.status` — as mesmas chaves que o painel admin lê e escreve. */
export const STATUS_DB: Record<StatusChamado, string> = {
  aberto: "open",
  andamento: "in_progress",
  aguardando: "waiting_client",
  resolvido: "resolved",
};

const DB_PARA_PORTAL: Record<string, StatusChamado> = Object.fromEntries(
  Object.entries(STATUS_DB).map(([pt, db]) => [db, pt as StatusChamado]),
) as Record<string, StatusChamado>;

export function statusDoBanco(v: string | null): StatusChamado {
  return DB_PARA_PORTAL[v ?? ""] ?? "aberto";
}

/** `support_messages.sender_side`. */
export function autorDoBanco(v: string | null): AutorMensagem {
  if (v === "support" || v === "admin") return "suporte";
  if (v === "system") return "sistema";
  return "cliente";
}

export const AUTOR_DB: Record<AutorMensagem, string> = {
  cliente: "client",
  suporte: "support",
  sistema: "system",
};

/** Chamado resolvido é histórico: só volta a aceitar resposta se for reaberto. */
export function podeResponder(c: Chamado): boolean {
  return c.status !== "resolvido";
}

/** Protocolo curto e estável a partir do uuid — o que o cliente cita ao ligar. */
export function protocoloDe(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
