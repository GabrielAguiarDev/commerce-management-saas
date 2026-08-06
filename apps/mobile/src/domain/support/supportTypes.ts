/** MODELO DE DOMÍNIO do suporte. */

export type TicketStatus = 'answered' | 'in_progress' | 'resolved';

export interface Ticket {
  id: string;
  assunto: string;
  summary: string;
  status: TicketStatus;
  /** "Respondido" / "Em andamento" / "Resolvido". */
  statusRotulo: string;
  naoLida: boolean;
}

export interface TicketMessage {
  id: string;
  text: string;
  /** `true` = escrita pelo dono do negócio (bolha teal, à direita). */
  minha: boolean;
  quando: string;
}

export const TICKET_CATEGORIES = [
  { key: 'duvida', label: 'Dúvida' },
  { key: 'problema', label: 'Algo não funcionou' },
  { key: 'plano', label: 'Plano e módulos' },
  { key: 'sugestao', label: 'Sugestão' },
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]['key'];

export interface NewTicket {
  assunto: string;
  category: TicketCategory;
  description: string;
}

export type SupportErrorCode = 'subject_required' | 'description_required' | 'network';

export class SupportError extends Error {
  constructor(readonly code: SupportErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SuporteError';
  }
}
