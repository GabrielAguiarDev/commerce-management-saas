import { useUIStore } from '@store/uiStore';

import { SheetCarrinho } from './SheetCarrinho';
import { SheetChamado } from './SheetChamado';
import { SheetFechamento } from './SheetFechamento';
import { SheetProduto } from './SheetProduto';
import { SheetSimples } from './SheetSimples';

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

  switch (sheet.tipo) {
    case 'carrinho':
      return <SheetCarrinho />;
    case 'produto':
      return <SheetProduto />;
    case 'fechamento':
      return <SheetFechamento />;
    case 'chamado':
      return <SheetChamado />;
    case 'sangria':
      return <SheetSimples tipo="sangria" />;
    case 'reforco':
      return <SheetSimples tipo="reforco" />;
    case 'custo':
      return <SheetSimples tipo="custo" />;
    case 'movimento':
      return (
        <SheetSimples
          tipo="movimento"
          valorInicial={sheet.produtoNome ?? ''}
          produtoId={sheet.produtoId}
        />
      );
  }
}
