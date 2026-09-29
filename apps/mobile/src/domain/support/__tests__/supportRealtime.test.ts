import {
  closeSupportChannels,
  subscribeToTenantSupport,
  subscribeToTicket,
} from '../supportRealtime';

/**
 * O canal de suporte é um COMBINADO com o Realtime, e a inscrição errada não dá
 * erro: ela simplesmente não recebe o evento. O sintoma é "a resposta não
 * aparece sozinha", que é indistinguível de não ter implementado nada — por
 * isso o que este teste cobra é o contrato inteiro: tabela, evento, filtro, a
 * reconexão que refaz a consulta e o canal que vai embora no fim.
 */

interface Registered {
  /** Sempre `'postgres_changes'`. */
  type: string;
  filter: { event?: string; schema?: string; table?: string; filter?: string };
  callback: (payload: { new: unknown }) => void;
}

/** O mínimo do `RealtimeChannel` que este arquivo usa. */
class MockChannel {
  readonly registered: Registered[] = [];
  onStatus: ((status: string) => void) | null = null;

  constructor(readonly topic: string) {}

  on(type: string, filter: Registered['filter'], callback: Registered['callback']) {
    this.registered.push({ type, filter, callback });
    return this;
  }

  subscribe(callback: (status: string) => void) {
    this.onStatus = callback;
    return this;
  }

  /** O Realtime entregando um evento de uma tabela aos `on` daquela tabela. */
  emit(table: string, row: unknown) {
    for (const r of this.registered) {
      if (r.filter.table === table) r.callback({ new: row });
    }
  }
}

const mockOpened: MockChannel[] = [];
const mockRemoved: MockChannel[] = [];

jest.mock('@services/supabase', () => ({
  supabase: {
    channel: (topic: string) => {
      const channel = new MockChannel(topic);
      mockOpened.push(channel);
      return channel;
    },
    removeChannel: (channel: MockChannel) => {
      mockRemoved.push(channel);
      return Promise.resolve('ok');
    },
  },
}));

/** O último canal aberto — só existe um por inscrição. */
function last(): MockChannel {
  const channel = mockOpened[mockOpened.length - 1];
  if (!channel) throw new Error('nenhum canal foi aberto');
  return channel;
}

beforeEach(() => {
  // `supportRealtime` guarda os canais abertos em estado de MÓDULO (é o que
  // permite ao logout fechá-los). Sem zerar isso, o que um teste deixou aberto
  // aparece na conta do seguinte.
  closeSupportChannels();
  mockOpened.length = 0;
  mockRemoved.length = 0;
});

describe('subscribeToTicket', () => {
  it('ouve só INSERT de mensagem daquele chamado', () => {
    subscribeToTicket('tkt_1', { onEvent: jest.fn() });

    const [registered] = last().registered;
    expect(last().registered).toHaveLength(1);
    expect(registered?.type).toBe('postgres_changes');
    expect(registered?.filter).toEqual({
      event: 'INSERT',
      schema: 'public',
      table: 'support_messages',
      filter: 'ticket_id=eq.tkt_1',
    });
  });

  it('entrega o lado de quem escreveu — é o que decide marcar como lida', () => {
    const onEvent = jest.fn();
    subscribeToTicket('tkt_1', { onEvent });

    last().emit('support_messages', { sender_side: 'admin', body: 'Já verificamos.' });

    expect(onEvent).toHaveBeenCalledWith({ senderSide: 'admin' });
  });

  it('não inventa lado quando o payload vem sem ele', () => {
    const onEvent = jest.fn();
    subscribeToTicket('tkt_1', { onEvent });

    last().emit('support_messages', {});

    expect(onEvent).toHaveBeenCalledWith({ senderSide: null });
  });

  it('cancelar remove o canal', () => {
    const cancel = subscribeToTicket('tkt_1', { onEvent: jest.fn() });
    const channel = last();

    cancel();

    expect(mockRemoved).toHaveLength(1);
    expect(mockRemoved[0]).toBe(channel);
  });

  it('dois canais nunca dividem o mesmo tópico', () => {
    subscribeToTicket('tkt_1', { onEvent: jest.fn() });
    const first = last().topic;
    subscribeToTicket('tkt_1', { onEvent: jest.fn() });

    expect(last().topic).not.toBe(first);
  });
});

describe('subscribeToTenantSupport', () => {
  it('ouve mensagem nova e mudança de chamado, sem filtrar tenant (é o RLS)', () => {
    subscribeToTenantSupport({ onEvent: jest.fn() });

    expect(last().registered.map((r) => r.filter)).toEqual([
      { event: 'INSERT', schema: 'public', table: 'support_messages' },
      { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
    ]);
  });

  it('um único canal para as duas inscrições — a cota é por conexão', () => {
    subscribeToTenantSupport({ onEvent: jest.fn() });

    expect(mockOpened).toHaveLength(1);
  });

  it('o UPDATE do chamado não tem lado', () => {
    const onEvent = jest.fn();
    subscribeToTenantSupport({ onEvent });

    last().emit('support_tickets', { status: 'waiting_client' });

    expect(onEvent).toHaveBeenCalledWith({ senderSide: null });
  });
});

describe('reconexão', () => {
  it('a PRIMEIRA inscrição não refaz a consulta — ela acabou de rodar', () => {
    const onReconnect = jest.fn();
    subscribeToTenantSupport({ onEvent: jest.fn(), onReconnect });

    last().onStatus?.('SUBSCRIBED');

    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('voltar a SUBSCRIBED refaz a consulta — o Realtime não reenvia o perdido', () => {
    const onReconnect = jest.fn();
    subscribeToTenantSupport({ onEvent: jest.fn(), onReconnect });
    const channel = last();

    channel.onStatus?.('SUBSCRIBED');
    channel.onStatus?.('CLOSED');
    channel.onStatus?.('SUBSCRIBED');

    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});

describe('closeSupportChannels', () => {
  it('fecha o que ficou aberto — o logout não deixa canal de pé', () => {
    subscribeToTenantSupport({ onEvent: jest.fn() });
    subscribeToTicket('tkt_1', { onEvent: jest.fn() });
    const abertos = [...mockOpened];

    closeSupportChannels();

    expect(mockRemoved).toHaveLength(2);
    expect(mockRemoved[0]).toBe(abertos[0]);
    expect(mockRemoved[1]).toBe(abertos[1]);
  });

  it('não tenta fechar de novo o que já foi cancelado', () => {
    const cancel = subscribeToTenantSupport({ onEvent: jest.fn() });
    const channel = last();

    cancel();
    closeSupportChannels();

    expect(mockRemoved).toHaveLength(1);
    expect(mockRemoved[0]).toBe(channel);
  });
});
