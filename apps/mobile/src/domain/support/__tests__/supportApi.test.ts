import { markAsRead } from '../supportApi';

const mockCalls: [string, unknown[]][] = [];

jest.mock('@services/supabase', () => {
  const builder: Record<string, unknown> = {};
  for (const name of ['from', 'update', 'eq', 'neq', 'select', 'order']) {
    builder[name] = (...args: unknown[]) => {
      mockCalls.push([name, args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null });
  return { supabase: builder };
});

jest.mock('@domain/shared/activityLog', () => ({ logActivity: jest.fn() }));

describe('markAsRead', () => {
  beforeEach(() => {
    mockCalls.length = 0;
  });

  it('marca tudo que não é do cliente e só envia read_by_recipient', async () => {
    await markAsRead('tnt_1', 'tkt_1');

    expect(mockCalls).toEqual([
      ['from', ['support_messages']],
      ['update', [{ read_by_recipient: true }]],
      ['eq', ['ticket_id', 'tkt_1']],
      ['neq', ['sender_side', 'client']],
      ['eq', ['read_by_recipient', false]],
    ]);
  });
});
