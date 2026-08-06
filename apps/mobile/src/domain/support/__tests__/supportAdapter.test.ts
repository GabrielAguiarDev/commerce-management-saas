import type { TicketAPI, TicketMessageAPI } from '../supportApiTypes';
import { contarNaoLidos, toChamado, toMensagem } from '../supportAdapter';

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
    expect(toChamado(base).statusRotulo).toBe('Respondido');
    expect(toChamado({ ...base, status: 'in_progress' }).statusRotulo).toBe('Em andamento');
    expect(toChamado({ ...base, status: 'resolved' }).statusRotulo).toBe('Resolvido');
  });

  it('status novo no servidor não some da lista: cai em "Em andamento"', () => {
    expect(toChamado({ ...base, status: 'escalated' }).status).toBe('em_andamento');
  });

  it('has_unread nulo conta como lido', () => {
    expect(toChamado({ ...base, has_unread: null }).naoLida).toBe(false);
  });

  it('resumo nulo vira string vazia, não "null" na tela', () => {
    expect(toChamado({ ...base, summary: null }).resumo).toBe('');
  });
});

describe('toMensagem', () => {
  const mensagem: TicketMessageAPI = {
    id: 'msg_1',
    ticket_id: 'tkt_1',
    body: 'Deu certo, obrigada!',
    from_support: false,
    created_label: 'hoje, 10:02',
  };

  it('inverte from_support para "minha" — a pergunta que a bolha faz', () => {
    expect(toMensagem(mensagem).minha).toBe(true);
    expect(toMensagem({ ...mensagem, from_support: true }).minha).toBe(false);
  });
});

describe('contarNaoLidos', () => {
  it('conta só os não lidos — é o número do badge da tela Mais', () => {
    const chamados = [
      toChamado(base),
      toChamado({ ...base, id: 'tkt_2', has_unread: false }),
      toChamado({ ...base, id: 'tkt_3', has_unread: true }),
    ];
    expect(contarNaoLidos(chamados)).toBe(2);
  });

  it('lista vazia conta zero (e o badge não aparece)', () => {
    expect(contarNaoLidos([])).toBe(0);
  });
});
