import type { TenantAPI } from '../tenantApiTypes';
import { derivarCapacidades, rotularModulos, toTenant } from '../tenantAdapter';
import type { ChaveModulo } from '../tenantTypes';

const base: TenantAPI = {
  id: 'tnt_1',
  name: 'Petshop Amigo',
  segment: 'Pet',
  contact_phone: '(71) 98123-4455',
  status: 'active',
  plan: 'paid',
  plan_name: 'Plano Completo',
  monthly_fee: 189.9,
  renews_at: '2026-08-12T00:00:00.000Z',
  modules: [
    { key: 'sales', name: 'Vendas', is_access: false },
    { key: 'cash', name: 'Caixa', is_access: false },
    { key: 'app', name: 'Aplicativo', is_access: true },
  ],
};

describe('toTenant', () => {
  it('renomeia os campos do banco para o modelo de domínio', () => {
    const t = toTenant(base);
    expect(t.nome).toBe('Petshop Amigo');
    expect(t.telefone).toBe('(71) 98123-4455');
    expect(t.plano.nome).toBe('Plano Completo');
  });

  it('coage renews_at para Date', () => {
    expect(toTenant(base).plano.renovaEm).toBeInstanceOf(Date);
  });

  it('cai na chave do plano quando plan_name é nulo', () => {
    expect(toTenant({ ...base, plan_name: null }).plano.nome).toBe('paid');
  });

  it('vira null — e não Invalid Date — com data inválida do servidor', () => {
    expect(toTenant({ ...base, renews_at: 'ontem' }).plano.renovaEm).toBeNull();
    expect(toTenant({ ...base, renews_at: null }).plano.renovaEm).toBeNull();
  });

  it('descarta chave de módulo que o app não conhece', () => {
    const t = toTenant({
      ...base,
      modules: [...base.modules, { key: 'nfe_futuro', name: 'NF-e', is_access: false }],
    });
    expect(t.modulos).toEqual(['sales', 'cash', 'app']);
  });

  it('não vaza campos que a UI não usa', () => {
    const t = toTenant(base) as unknown as Record<string, unknown>;
    expect(t.monthly_fee).toBeUndefined();
    expect(t.status).toBeUndefined();
  });
});

describe('derivarCapacidades', () => {
  const completo: ChaveModulo[] = [
    'sales',
    'products',
    'cash',
    'stock',
    'costs',
    'reports',
    'support',
    'app',
  ];
  const essencial: ChaveModulo[] = ['sales', 'products', 'costs', 'support', 'app'];

  it('liga tudo no Plano Completo', () => {
    const caps = derivarCapacidades(completo);
    expect(caps).toEqual({
      acessoApp: true,
      temVendas: true,
      temProdutos: true,
      temCaixa: true,
      temEstoque: true,
      temCustos: true,
      temRelatorios: true,
      temSuporte: true,
    });
  });

  it('reproduz a tabela do protótipo para o perfil simples', () => {
    const caps = derivarCapacidades(essencial);
    expect(caps.temCaixa).toBe(false);
    expect(caps.temEstoque).toBe(false);
    expect(caps.temCustos).toBe(true);
    expect(caps.temRelatorios).toBe(false);
  });

  it('sem o módulo `app` o acesso cai — é o gatilho da tela de bloqueio', () => {
    const caps = derivarCapacidades(['sales', 'products', 'costs']);
    expect(caps.acessoApp).toBe(false);
  });

  it('vender e produtos acompanham o acesso ao app (não se vende plano sem tela)', () => {
    const caps = derivarCapacidades(['app']);
    expect(caps.temVendas).toBe(true);
    expect(caps.temProdutos).toBe(true);
  });

  it('plano vazio não liga nada', () => {
    expect(derivarCapacidades([])).toEqual({
      acessoApp: false,
      temVendas: false,
      temProdutos: false,
      temCaixa: false,
      temEstoque: false,
      temCustos: false,
      temRelatorios: false,
      temSuporte: false,
    });
  });
});

describe('rotularModulos', () => {
  it('lista na ordem do menu, com "e" antes do último', () => {
    expect(rotularModulos(['app', 'costs', 'products', 'sales'])).toBe(
      'Vendas, Produtos, Custos e App',
    );
  });

  it('não usa vírgula com um módulo só', () => {
    expect(rotularModulos(['app'])).toBe('App');
  });

  it('degrada com elegância no plano vazio', () => {
    expect(rotularModulos([])).toBe('nenhum');
  });
});
