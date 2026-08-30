/** CONTRATO DO BACKEND do suporte. */

export interface TicketAPI {
  id: string;
  tenant_id: string;
  subject: string;
  summary: string | null;
  /** 'answered' | 'in_progress' | 'resolved' */
  status: string;
  has_unread: boolean | null;
  updated_at: string;
}

export interface TicketMessageAPI {
  id: string;
  ticket_id: string;
  body: string;
  /** `true` = veio do time de suporte; `false` = escrita pelo cliente. */
  from_support: boolean;
  /** Caminho no bucket `support-attachments`, ou `null`. */
  attachment_path: string | null;
  created_label: string;
}

export interface TicketCreateAPI {
  tenant_id: string;
  subject: string;
  category: string;
  body: string;
  /** Vai para `support_messages.attachment_url`. `null` = sem anexo. */
  attachment_path: string | null;
}

export interface TicketReplyAPI {
  ticket_id: string;
  body: string;
}
