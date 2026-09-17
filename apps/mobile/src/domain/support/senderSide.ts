import { SENDER_SIDE } from '@domain/shared/dbEnums';

/**
 * Leitura de `support_messages.sender_side` pelo lado do cliente.
 *
 * A equipe responde tanto como `'support'` quanto como `'admin'` (o painel da
 * plataforma grava `'admin'`). Comparar só com `'support'` escondia essas
 * respostas: a bolha saía como se fosse do cliente e o badge nunca acendia.
 */
export function isFromSupportTeam(side: string | null | undefined): boolean {
  return side === SENDER_SIDE.support || side === SENDER_SIDE.admin;
}

/** Resposta da equipe que o cliente ainda não abriu — o mesmo critério do portal. */
export function isUnreadForClient(message: {
  sender_side: string | null | undefined;
  read_by_recipient: boolean | null | undefined;
}): boolean {
  return isFromSupportTeam(message.sender_side) && !message.read_by_recipient;
}
