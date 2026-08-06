import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CHAVES_ARMAZENAMENTO } from '@services/storageAdapter';

/**
 * As formas de pagamento que o negócio aceita.
 *
 * Não é enfeite de tela: o que estiver ligado aqui é o que aparece no seletor
 * do carrinho. Desligar "Cartão de crédito" nas Preferências some com a opção
 * na hora de fechar a venda — é o vínculo que o protótipo estabelece entre as
 * duas telas (`formasAceitas`, linha 1094).
 */
export const FORMAS_DE_PAGAMENTO = [
  'Dinheiro',
  'Pix',
  'Cartão de débito',
  'Cartão de crédito',
] as const;

export type FormaDePagamento = (typeof FORMAS_DE_PAGAMENTO)[number];

interface EstadoPreferencias {
  temaEscuro: boolean;
  formasAceitas: Record<FormaDePagamento, boolean>;
  hidratado: boolean;

  alternarTema: () => void;
  alternarForma: (forma: FormaDePagamento) => void;
}

const TODAS_ACEITAS = Object.fromEntries(FORMAS_DE_PAGAMENTO.map((f) => [f, true])) as Record<
  FormaDePagamento,
  boolean
>;

export const usePreferenciasStore = create<EstadoPreferencias>()(
  persist(
    (set) => ({
      // Padrão claro, como o protótipo. O tema é decisão do usuário nas
      // Preferências, não do modo do sistema — ver DEVELOPMENT.md › Decisões.
      temaEscuro: false,
      formasAceitas: TODAS_ACEITAS,
      hidratado: false,

      alternarTema: () => set((s) => ({ temaEscuro: !s.temaEscuro })),

      alternarForma: (forma) =>
        set((s) => ({ formasAceitas: { ...s.formasAceitas, [forma]: !s.formasAceitas[forma] } })),
    }),
    {
      name: CHAVES_ARMAZENAMENTO.preferencias,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ temaEscuro: s.temaEscuro, formasAceitas: s.formasAceitas }),
      // Merge defensivo: uma forma de pagamento NOVA numa versão futura do app
      // não existe no objeto gravado. Sem este merge ela viria `undefined` e
      // sumiria do seletor para quem já usava o app — bug invisível em QA,
      // porque instalação nova nunca reproduz.
      merge: (persistido, atual) => {
        const p = (persistido ?? {}) as Partial<EstadoPreferencias>;
        return {
          ...atual,
          ...p,
          formasAceitas: { ...TODAS_ACEITAS, ...(p.formasAceitas ?? {}) },
        };
      },
      onRehydrateStorage: () => () => {
        usePreferenciasStore.setState({ hidratado: true });
      },
    },
  ),
);

/** Só as formas ligadas, na ordem canônica — alimenta o seletor do carrinho. */
export function formasAceitasAtivas(
  formas: Record<FormaDePagamento, boolean>,
): FormaDePagamento[] {
  return FORMAS_DE_PAGAMENTO.filter((f) => formas[f]);
}
