import { useConnectionStore } from '@store/connectionStore';

/**
 * O que este teste protege: `syncing` não pode voltar a ser um efeito colateral
 * de ficar online. Foi assim que o banner nasceu — anunciando uma sincronia que
 * nunca aconteceu — e é uma regressão fácil de reintroduzir sem perceber.
 */

const INITIAL = useConnectionStore.getState();

beforeEach(() => {
  useConnectionStore.setState({ online: true, syncing: false }, false);
});

afterAll(() => {
  useConnectionStore.setState(INITIAL, true);
});

describe('setOnline', () => {
  it('registra a queda e a volta da conexão', () => {
    useConnectionStore.getState().setOnline(false);
    expect(useConnectionStore.getState().online).toBe(false);

    useConnectionStore.getState().setOnline(true);
    expect(useConnectionStore.getState().online).toBe(true);
  });

  it('NÃO liga a sincronização ao voltar a conexão', () => {
    useConnectionStore.getState().setOnline(false);
    useConnectionStore.getState().setOnline(true);

    expect(useConnectionStore.getState().syncing).toBe(false);
  });

  it('não mexe no estado quando o valor repete', () => {
    const before = useConnectionStore.getState();
    before.setOnline(true);

    // Mesma referência: nenhum `set` aconteceu, logo nenhum re-render de quem
    // observa o store. O NetInfo repete o mesmo estado ao trocar de rede.
    expect(useConnectionStore.getState()).toBe(before);
  });
});

describe('startSync / finishSync', () => {
  it('só quem sincroniza de verdade liga e desliga a flag', () => {
    useConnectionStore.getState().startSync();
    expect(useConnectionStore.getState().syncing).toBe(true);

    useConnectionStore.getState().finishSync();
    expect(useConnectionStore.getState().syncing).toBe(false);
  });
});
