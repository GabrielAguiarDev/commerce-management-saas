import { useUIStore } from '@store/uiStore';

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
 */
export function SheetHost() {
  const sheet = useUIStore((s) => s.sheet);

  if (!sheet) return null;

  switch (sheet.type) {
    case 'cart':
      return <CartSheet />;
    case 'product':
      return <ProductSheet />;
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
