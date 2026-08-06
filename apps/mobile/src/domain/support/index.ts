export type {
  TicketCategory,
  Ticket,
  TicketMessage,
  NewTicket,
  TicketStatus,
} from './supportTypes';
export { TICKET_CATEGORIES, SupportError } from './supportTypes';
export { countUnread } from './supportAdapter';
export {
  suporteKeys,
  useOpenTicket,
  useTickets,
  useMarkAsRead,
  useTicketMessages,
  useReplyToTicket,
} from './useCases/useSupport';
