import { createContext, useContext } from 'react';

/**
 * As duas pontas soltas que a troca para `@gorhom/bottom-sheet` criou.
 *
 * A lib é IMPERATIVA (`present()` / `dismiss()`) e a store é DECLARATIVA
 * (`uiStore.sheet` é ou não é). Conciliar as duas é o assunto deste arquivo —
 * e a regra que guiou o desenho foi: os cinco sheets do produto não podem
 * precisar saber de nada disso.
 */

//#region visibilidade

interface SheetVisibility {
  /** A store ainda quer este sheet aberto? */
  open: boolean;
  /** Chamado quando a animação de saída terminou: agora pode desmontar. */
  onClosed: () => void;
}

const VisibilityContext = createContext<SheetVisibility | null>(null);

export const SheetVisibilityProvider = VisibilityContext.Provider;

/**
 * Lido pelo `BottomSheet` para saber quando apresentar e quando dispensar.
 *
 * Fechar deixou de ser "desmontar o componente": a lib precisa animar a saída
 * ANTES de o React tirar o nó da árvore. Por isso o `SheetHost` mantém o sheet
 * montado depois que a store já o esqueceu, e desmonta só no `onClosed`.
 */
export function useSheetVisibility(): SheetVisibility {
  const contexto = useContext(VisibilityContext);

  if (!contexto) {
    throw new Error('<BottomSheet> precisa ser renderizado pelo SheetHost.');
  }

  return contexto;
}

//#endregion

//#region "estou dentro de um sheet?"

const InsideSheetContext = createContext(false);

export const InsideSheetProvider = InsideSheetContext.Provider;

/**
 * Usado pelo `Field` para trocar o `TextInput` pelo `BottomSheetTextInput` —
 * é esse componente que avisa a lib que o teclado vai abrir a partir de dentro
 * do sheet. Descobrir por contexto evita passar uma prop por todas as telas.
 *
 * O Provider correspondente fica DENTRO do `<BottomSheetModal>`, não em volta
 * dele: o conteúdo é renderizado por um portal (`@gorhom/portal`) e o contexto
 * do React segue a árvore de renderização, que para um nó portado é a do host.
 */
export function useIsInsideSheet(): boolean {
  return useContext(InsideSheetContext);
}

//#endregion
