import { Box } from '@components/ui/Box';
import { Skeleton } from '@components/ui/Skeleton';
import { Text } from '@components/ui/Text';
import { useTranslation } from '@i18n';

/**
 * O RODAPÉ da lista que carrega mais ao rolar — o mesmo do histórico de vendas.
 *
 *  - carregando: linhas fantasmas no lugar exato dos itens que vêm, e não um
 *    spinner solto — elas dizem "vêm mais itens aqui";
 *  - acabou: o fim dito em voz alta. Sem isto, quem rolou até embaixo não sabe
 *    se a lista terminou ou se o app parou de carregar.
 *
 * Nada enquanto ainda há página por vir e ninguém pediu: é a rolagem que pede.
 */
export function InfiniteListFooter({
  loadingMore,
  done,
  doneText,
  rowHeight = 64,
}: {
  loadingMore: boolean;
  /** Não há mais páginas E a lista tem ao menos um item. */
  done: boolean;
  doneText: string;
  rowHeight?: number;
}) {
  const t = useTranslation();

  if (loadingMore) {
    return (
      <Box gap="s10" marginTop="s2" accessibilityRole="progressbar" accessibilityLabel={t.common.loadingMore}>
        {[0, 1].map((i) => (
          <Skeleton key={i} height={rowHeight} borderRadius="r18" />
        ))}
        <Text variant="hint" color="textMuted" textAlign="center">
          {t.common.loadingMore}
        </Text>
      </Box>
    );
  }

  if (done) {
    return (
      <Text variant="hint" color="textMuted" textAlign="center" marginTop="s4">
        {doneText}
      </Text>
    );
  }

  return null;
}
