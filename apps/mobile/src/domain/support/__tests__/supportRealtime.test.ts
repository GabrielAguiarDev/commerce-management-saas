import {
  closeSupportChannels,
  subscribeToSupport,
  supportTopic,
} from '../supportRealtime';

/**
 * O canal de suporte é um COMBINADO com o banco (o trigger de
 * `20260929000000_support_broadcast.sql` publica; a policy autoriza), e a
 * inscrição errada não dá erro: ela simplesmente não recebe nada. O sintoma é
 * "a resposta não aparece sozinha", indistinguível de não ter implementado —
 * por isso este teste cobra o contrato inteiro: tópico privado, eventos, a
 * mensagem traduzida do payload, o canal único compartilhado e o fim dele.
 */

interface Registered {
  type: string;
  filter: { event?: string };
  callback: (message: { payload: unknown }) => void;
}

/** O mínimo do `RealtimeChannel` que o módulo usa. */
class MockChannel {
  readonly registered: Registered[] = [];
  onStatus: ((status: string) => void) | null = null;

  constructor(
    readonly topic: string,
    readonly params: unknown,
  ) {}

  on(type: string, filter: Registered['filter'], callback: Registered['callback']) {
    this.registered.push({ type, filter, callback });
    return this;
  }

  subscribe(callback: (status: string) => void) {
    this.onStatus = callback;
    return this;
  }

  /** O Realtime entregando um broadcast aos `on` daquele evento. */
  emit(event: string, payload: unknown) {
    for (const r of this.registered) {
      if (r.type === 'broadcast' && r.filter.event === event) r.callback({ payload });
    }
  }
}

const mockOpened: MockChannel[] = [];
const mockRemoved: MockChannel[] = [];

jest.mock('@services/supabase', () => ({
  supabase: {
    channel: (topic: string, params: unknown) => {
      const channel = new MockChannel(topic, params);
      mockOpened.push(channel);
      return channel;
    },
    removeChannel: (channel: MockChannel) => {
      mockRemoved.push(channel);
      return Promise.resolve('ok');
    },
  },
}));

function only(): MockChannel {
  expect(mockOpened).toHaveLength(1);
  return mockOpened[0] as MockChannel;
}

const row = {
  id: 'msg_1',
  ticket_id: 'tkt_1',
  tenant_id: 'ten_1',
  sender_side: 'admin',
  body: 'Já verificamos.',
  attachment_url: null,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  // O canal compartilhado é estado de MÓDULO (é o que permite ao logout
  // fechá-lo). Sem zerar, o que um teste deixou aberto vaza para o seguinte.
  closeSupportChannels();
  mockOpened.length = 0;
  mockRemoved.length = 0;
});

describe('subscribeToSupport', () => {
  it('entra no tópico PRIVADO do negócio, ouvindo os três eventos do banco', () => {
    subscribeToSupport('ten_1', {});

    const channel = only();
    expect(channel.topic).toBe('support:tenant:ten_1');
    expect(channel.topic).toBe(supportTopic('ten_1'));
    expect(channel.params).toEqual({ config: { private: true } });
    expect(channel.registered.map((r) => [r.type, r.filter.event])).toEqual([
      ['broadcast', 'message_created'],
      ['broadcast', 'ticket_created'],
      ['broadcast', 'ticket_updated'],
    ]);
  });

  it('entrega a mensagem do payload já no contrato do app', () => {
    const onMessage = jest.fn();
    subscribeToSupport('ten_1', { onMessage });

    only().emit('message_created', row);

    expect(onMessage).toHaveBeenCalledWith({
      ticketId: 'tkt_1',
      senderSide: 'admin',
      message: expect.objectContaining({
        id: 'msg_1',
        ticket_id: 'tkt_1',
        body: 'Já verificamos.',
        from_support: true,
        attachment_path: null,
      }),
    });
  });

  it('descarta payload malformado em vez de montar mensagem pela metade', () => {
    const onMessage = jest.fn();
    subscribeToSupport('ten_1', { onMessage });

    only().emit('message_created', { id: 'msg_1' });
    only().emit('message_created', null);

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('avisa mudança de chamado nos dois eventos de chamado', () => {
    const onTicketChange = jest.fn();
    subscribeToSupport('ten_1', { onTicketChange });

    only().emit('ticket_created', { id: 'tkt_2' });
    only().emit('ticket_updated', { id: 'tkt_1', status: 'resolved' });

    expect(onTicketChange).toHaveBeenCalledTimes(2);
  });

  it('um canal só para o shell e a conversa — e ele fica enquanto houver ouvinte', () => {
    const shell = jest.fn();
    const conversation = jest.fn();
    const stopShell = subscribeToSupport('ten_1', { onMessage: shell });
    const stopConversation = subscribeToSupport('ten_1', { onMessage: conversation });

    only().emit('message_created', row);
    expect(shell).toHaveBeenCalledTimes(1);
    expect(conversation).toHaveBeenCalledTimes(1);

    // Fechar a conversa NÃO derruba o canal do shell.
    stopConversation();
    expect(mockRemoved).toHaveLength(0);
    only().emit('message_created', row);
    expect(shell).toHaveBeenCalledTimes(2);
    expect(conversation).toHaveBeenCalledTimes(1);

    stopShell();
    expect(mockRemoved).toEqual([only()]);
  });

  it('reconexão relê; a primeira inscrição não', () => {
    const onReconnect = jest.fn();
    subscribeToSupport('ten_1', { onReconnect });

    only().onStatus?.('SUBSCRIBED');
    expect(onReconnect).not.toHaveBeenCalled();

    only().onStatus?.('CHANNEL_ERROR');
    only().onStatus?.('SUBSCRIBED');
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('outro negócio na mesma sessão fecha o canal anterior', () => {
    subscribeToSupport('ten_1', {});
    subscribeToSupport('ten_2', {});

    expect(mockOpened.map((c) => c.topic)).toEqual(['support:tenant:ten_1', 'support:tenant:ten_2']);
    expect(mockRemoved.map((c) => c.topic)).toEqual(['support:tenant:ten_1']);
  });
});

describe('closeSupportChannels', () => {
  it('fecha o canal no logout, e fechar de novo não faz nada', () => {
    const onMessage = jest.fn();
    subscribeToSupport('ten_1', { onMessage });
    const channel = only();

    closeSupportChannels();
    closeSupportChannels();

    expect(mockRemoved).toEqual([channel]);
    channel.emit('message_created', row);
    expect(onMessage).not.toHaveBeenCalled();
  });
});
