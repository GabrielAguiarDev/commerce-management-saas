import { appendMessage } from '../supportService';
import type { TicketMessage } from '../supportTypes';

jest.mock('@services/supabase', () => ({ supabase: {} }));

/**
 * A mesma mensagem chega duas vezes à conversa em cache: a resposta do cliente
 * volta pela mutação E pelo broadcast do banco. `appendMessage` é o que impede
 * a bolha repetida.
 */

const msg = (id: string): TicketMessage => ({ id, text: id, minha: true, anexo: '', quando: 'agora' });

describe('appendMessage', () => {
  it('acrescenta a mensagem nova no fim da conversa', () => {
    expect(appendMessage([msg('a')], msg('b'))?.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('ignora o eco da mensagem que já está na conversa, sem trocar a referência', () => {
    const conversation = [msg('a'), msg('b')];
    expect(appendMessage(conversation, msg('b'))).toBe(conversation);
  });

  it('não cria conversa que ainda não foi carregada — a consulta em andamento traz tudo', () => {
    expect(appendMessage(undefined, msg('a'))).toBeUndefined();
  });
});
