import { useCallback, useMemo, useState } from 'react';

import { SheetVisibilityProvider } from '@components/patterns/sheetContext';
import { useUIStore, type Sheet } from '@store/uiStore';

import { CartSheet } from './CartSheet';
import { TicketSheet } from './TicketSheet';
import { CloseOutSheet } from './CloseOutSheet';
import { ProductSheet } from './ProductSheet';
import { SimpleSheet } from './SimpleSheet';

/**
 * O único ponto de montagem de bottom sheet do app.
 *
 * Um sheet por vez, garantido pelo tipo do `uiStore`. Vive no layout do grupo
 * `(app)`, por cima da pilha inteira — é o que permite abrir o carrinho a
 * partir de qualquer tela e reabri-lo pelo Desfazer do toast.
 *
 * Desde a troca para `@gorhom/bottom-sheet`, montar não é mais o espelho exato
 * da store: `montado` ATRASA em relação a `sheet` na saída, porque o sheet
 * precisa continuar na árvore enquanto desce. Quem manda desmontar é o
 * `onClosed`, no fim da animação. Na entrada os dois andam juntos.
 */
export function SheetHost() {
  const sheet = useUIStore((s) => s.sheet);
  const [montado, setMontado] = useState<Sheet | null>(sheet);

  // Ajuste durante o render, e não em efeito: abrir um sheet não pode custar
  // um quadro a mais. Sem risco de laço — depois do `set`, os dois são a mesma
  // referência, e a store cria um objeto novo a cada `openSheet`.
  if (sheet && sheet !== montado) setMontado(sheet);

  const onClosed = useCallback(() => setMontado(null), []);

  const visibilidade = useMemo(
    () => ({ open: sheet !== null, onClosed }),
    [sheet, onClosed],
  );

  if (!montado) return null;

  return <SheetVisibilityProvider value={visibilidade}>{conteudo(montado)}</SheetVisibilityProvider>;
}

function conteudo(sheet: Sheet) {
  switch (sheet.type) {
    case 'cart':
      return <CartSheet />;
    case 'product':
      return <ProductSheet productId={sheet.productId} />;
    case 'closeOut':
      return <CloseOutSheet />;
    case 'ticket':
      return <TicketSheet />;
    case 'withdrawal':
      return <SimpleSheet type="withdrawal" />;
    case 'topUp':
      return <SimpleSheet type="topUp" />;
    case 'cost':
      return <SimpleSheet type="cost" />;
    case 'movement':
      return (
        <SimpleSheet
          type="movement"
          openingAmount={sheet.productName ?? ''}
          productId={sheet.productId}
        />
      );
  }
}
