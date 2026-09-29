import { screen, userEvent } from '@testing-library/react-native';

import { capabilities, renderUI } from '@components/__tests__/renderUI';
import { TabBar } from '@components/patterns/TabBar';
import { ROUTES } from '@domain/navigation/routes';
import { ptBR } from '@i18n/pt-BR';

/**
 * A BARRA DE ABAS por entitlement.
 *
 * As funções puras que decidem a composição (`tabBarItems`,
 * `tabBarSalePlacement`, `tabBarSaleLayout`) já têm teste em
 * `domain/navigation/__tests__/routes.test.ts`. O que só este arquivo alcança é
 * o que a pessoa VÊ e TOCA: o plano virou rótulos na tela, o item da rota atual
 * se anuncia como selecionado ao leitor de tela, e o toque leva à rota certa —
 * ou não leva a lugar nenhum, quando já se está nela.
 *
 * O risco que isto protege: a barra oferecer um destino que o guardião de
 * `(app)/_layout.tsx` bloqueia. Quem toca em "Caixa" num plano sem Caixa é
 * jogado de volta para Início sem explicação, e o bug parece "o app voltou
 * sozinho".
 */

const mockGoToRoot = jest.fn();
jest.mock('@hooks/navigation', () => ({
  goToRoot: (route: string) => mockGoToRoot(route),
}));

let mockPath: string = ROUTES.home;
jest.mock('expo-router', () => ({ usePathname: () => mockPath }));

const mockUseCapabilities = jest.fn();
jest.mock('@domain/tenant', () => ({
  useCapabilities: () => mockUseCapabilities(),
}));

const t = ptBR.nav.tabs;

beforeEach(() => {
  mockGoToRoot.mockClear();
  mockPath = ROUTES.home;
});

/** `caps` no formato que o componente lê do hook. */
function withPlan(...modules: Parameters<typeof capabilities>[0][number][]) {
  mockUseCapabilities.mockReturnValue({ capabilities: capabilities(modules), loading: false });
}

describe('composição por plano', () => {
  it('plano mínimo: Início, Produtos e Mais — sem atalho de módulo', async () => {
    withPlan('app');
    await renderUI(<TabBar />);

    expect(screen.getByLabelText(t.home)).toBeOnTheScreen();
    expect(screen.getByLabelText(t.products)).toBeOnTheScreen();
    expect(screen.getByLabelText(t.more)).toBeOnTheScreen();
    expect(screen.queryByLabelText(t.cash)).toBeNull();
    expect(screen.queryByLabelText(t.costs)).toBeNull();
  });

  it('com Caixa no plano, o atalho é Caixa', async () => {
    withPlan('app', 'cash', 'costs');
    await renderUI(<TabBar />);

    expect(screen.getByLabelText(t.cash)).toBeOnTheScreen();
    // Caixa tem prioridade: os dois no plano não viram dois atalhos.
    expect(screen.queryByLabelText(t.costs)).toBeNull();
  });

  it('sem Caixa, o atalho cai em Custos — o slot não fica vazio', async () => {
    withPlan('app', 'costs');
    await renderUI(<TabBar />);

    expect(screen.getByLabelText(t.costs)).toBeOnTheScreen();
    expect(screen.queryByLabelText(t.cash)).toBeNull();
  });

  it('o papel corta o módulo que o plano tem: funcionário sem caixa não vê Caixa', async () => {
    mockUseCapabilities.mockReturnValue({
      capabilities: capabilities(['app', 'cash'], {
        isOwner: false,
        rolePermissions: ['sales', 'products'],
      }),
      loading: false,
    });
    await renderUI(<TabBar />);

    expect(screen.queryByLabelText(t.cash)).toBeNull();
    expect(screen.getByLabelText(t.products)).toBeOnTheScreen();
  });

  it('com três destinos, Vender entra como item regular antes de Mais', async () => {
    // `app` + `cash` = Início, Produtos, Caixa, Mais → quatro tabs, Vender
    // elevado. Com `costs` no lugar de `cash` o total é o mesmo; o caso de três
    // destinos é o plano mínimo, em que Vender vira a quarta tab.
    withPlan('app');
    await renderUI(<TabBar />);

    expect(screen.getByLabelText(t.sell)).toBeOnTheScreen();
  });

  it('com quatro destinos, Vender NÃO é uma tab — é o botão elevado, que vive fora daqui', async () => {
    withPlan('app', 'cash');
    await renderUI(<TabBar />);

    expect(screen.getByLabelText(t.cash)).toBeOnTheScreen();
    expect(screen.queryByLabelText(t.sell)).toBeNull();
  });
});

describe('estado ativo', () => {
  it('a rota atual se anuncia selecionada, e só ela', async () => {
    withPlan('app', 'cash');
    mockPath = ROUTES.cash;
    await renderUI(<TabBar />);

    expect(screen.getByLabelText(t.cash)).toBeSelected();
    expect(screen.getByLabelText(t.home)).not.toBeSelected();
  });
});

describe('toque', () => {
  it('leva à rota da aba, zerando a pilha', async () => {
    withPlan('app', 'cash');
    await renderUI(<TabBar />);

    await userEvent.press(screen.getByLabelText(t.cash));

    expect(mockGoToRoot).toHaveBeenCalledWith(ROUTES.cash);
  });

  it('na aba ATIVA não navega — senão a pilha seria zerada a cada toque na mesma aba', async () => {
    withPlan('app', 'cash');
    mockPath = ROUTES.cash;
    await renderUI(<TabBar />);

    await userEvent.press(screen.getByLabelText(t.cash));

    expect(mockGoToRoot).not.toHaveBeenCalled();
  });
});
