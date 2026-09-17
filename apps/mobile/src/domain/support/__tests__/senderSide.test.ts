import { isFromSupportTeam, isUnreadForClient } from '../senderSide';

describe('isFromSupportTeam', () => {
  it('reconhece suporte e equipe da plataforma', () => {
    expect(isFromSupportTeam('support')).toBe(true);
    expect(isFromSupportTeam('admin')).toBe(true);
  });

  it('não trata cliente, sistema ou vazio como equipe', () => {
    expect(isFromSupportTeam('client')).toBe(false);
    expect(isFromSupportTeam('system')).toBe(false);
    expect(isFromSupportTeam(null)).toBe(false);
    expect(isFromSupportTeam(undefined)).toBe(false);
  });
});

describe('isUnreadForClient', () => {
  it('conta resposta do admin não lida', () => {
    expect(isUnreadForClient({ sender_side: 'admin', read_by_recipient: false })).toBe(true);
  });

  it('conta resposta do suporte não lida', () => {
    expect(isUnreadForClient({ sender_side: 'support', read_by_recipient: null })).toBe(true);
  });

  it('ignora o que já foi lido', () => {
    expect(isUnreadForClient({ sender_side: 'admin', read_by_recipient: true })).toBe(false);
  });

  it('ignora as mensagens do próprio cliente', () => {
    expect(isUnreadForClient({ sender_side: 'client', read_by_recipient: false })).toBe(false);
  });
});
