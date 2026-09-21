export type {
  TicketCategory,
  Ticket,
  TicketMessage,
  NewTicket,
  TicketStatus,
} from './supportTypes';
export { TICKET_CATEGORIES, SupportError } from './supportTypes';
export { countUnread } from './supportAdapter';
export { sanitizePhone, upgradeMessage, whatsappLink } from './whatsapp';
export {
  suporteKeys,
  useOpenTicket,
  useTickets,
  useMarkAsRead,
  useTicketMessages,
  useReplyToTicket,
  useSupportWhatsApp,
} from './useCases/useSupport';
export {
  attachmentName,
  isStoragePath,
  openAttachment,
  pickAndUploadAttachment,
  type AttachResult,
} from './supportAttachment';
