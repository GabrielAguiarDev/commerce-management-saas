export type {
  TicketCategory,
  Ticket,
  TicketMessage,
  NewTicket,
  TicketStatus,
} from './supportTypes';
export { TICKET_CATEGORIES, SupportError } from './supportTypes';
export { countUnread } from './supportAdapter';
export { UPGRADE_MESSAGE, sanitizePhone, whatsappLink } from './whatsapp';
export {
  suporteKeys,
  useOpenTicket,
  useTickets,
  useMarkAsRead,
  useTicketMessages,
  useReplyToTicket,
  useSupportWhatsApp,
} from './useCases/useSupport';
