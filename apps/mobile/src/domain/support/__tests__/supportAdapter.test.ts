import type { TicketAPI, TicketMessageAPI } from '../supportApiTypes';
import { countUnread, toTicket, toMessage } from '../supportAdapter';

const base: TicketAPI = {
  id: 'tkt_1',
  tenant_id: 'tnt_1',
  subject: 'Como estornar uma venda errada?',
  summary: 'Suporte respondeu há 2 horas',
  status: 'answered',
  has_unread: true,
  updated_at: '2026-07-26T09:55:00.000-03:00',
};

describe('toChamado', () => {
  it('traduz os três status conhecidos', () => {
    expect(toTicket(base).statusRotulo).toBe('Respondido');
    expect(toTicket({ ...base, status: 'in_progress' }).statusRotulo).toBe('Em andamento');
    expect(toTicket({ ...base, status: 'resolved' }).statusRotulo).toBe('Resolvido');
  });

  it('status novo no servidor não some da lista: cai em "Em andamento"', () => {
    expect(toTicket({ ...base, status: 'escalated' }).status).toBe('in_progress');
  });

  it('has_unread nulo conta como lido', () => {
    expect(toTicket({ ...base, has_unread: null }).naoLida).toBe(false);
  });

  it('resumo nulo vira string vazia, não "null" na tela', () => {
    expect(toTicket({ ...base, summary: null }).summary).toBe('');
  });
});

describe('toMensagem', () => {
  const message: TicketMessageAPI = {
    id: 'msg_1',
    ticket_id: 'tkt_1',
    body: 'Deu certo, obrigada!',
    from_support: false,
    created_label: 'hoje, 10:02',
  };

  it('inverte from_support para "minha" — a pergunta que a bolha faz', () => {
    expect(toMessage(message).minha).toBe(true);
    expect(toMessage({ ...message, from_support: true }).minha).toBe(false);
  });
});

describe('contarNaoLidos', () => {
  it('conta só os não lidos — é o número do badge da tela Mais', () => {
    const tickets = [
      toTicket(base),
      toTicket({ ...base, id: 'tkt_2', has_unread: false }),
      toTicket({ ...base, id: 'tkt_3', has_unread: true }),
    ];
    expect(countUnread(tickets)).toBe(2);
  });

  it('lista vazia conta zero (e o badge não aparece)', () => {
    expect(countUnread([])).toBe(0);
  });
});
