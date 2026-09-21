import { Box } from '../ui/Box';
import { Icon } from '../ui/Icon';
import { Pill } from '../ui/Pill';
import { Text } from '../ui/Text';
import { Touchable } from '../ui/Touchable';

import type { Sale } from '@domain/sales';
import { useTranslation } from '@i18n';
import { formatBRL } from '@utils/money';
import { paymentLabel } from '@utils/payment';

interface SaleListRowProps {
  sale: Sale;
  /** Ausente = linha informativa, sem affordance nem anúncio de botão. */
  onPress?: () => void;
}

/**
 * Linha de venda compartilhada pelo histórico e pelo recorte de hoje.
 *
 * O callback é opcional porque quem pode acompanhar o resumo diário nem sempre
 * tem a permissão `sales`, necessária para abrir os detalhes e operar a venda.
 * Nesse caso a linha continua legível, mas não promete uma navegação que o
 * guardião recusaria.
 */
export function SaleListRow({ sale, onPress }: SaleListRowProps) {
  const t = useTranslation();

  const content = (
    <>
      <Box
        minWidth={52}
        height={34}
        borderRadius="r11"
        backgroundColor="surface2"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="s8"
      >
        <Text variant="tinyBold" color="textMuted">
          {sale.time}
        </Text>
      </Box>

      <Box flex={1} minWidth={0}>
        <Text
          variant="rowText"
          numberOfLines={1}
          color={sale.refunded ? 'textMuted' : 'textPrimary'}
          style={sale.refunded ? { textDecorationLine: 'line-through' } : undefined}
        >
          {sale.itemsSummary}
        </Text>
        <Box flexDirection="row" alignItems="center" gap="s6" marginTop="s3">
          <Text variant="hint" color="textMuted">
            {paymentLabel(t, sale.paymentMethod)}
          </Text>
          {sale.refunded ? (
            <Pill
              text={t.sales.refundedBadge}
              backgroundColor="warningSoft"
              textColor="warning"
              variant="tag"
              paddingX={7}
              paddingY={2}
            />
          ) : null}
        </Box>
      </Box>

      <Text
        variant="titleXs"
        color={sale.refunded ? 'textMuted' : 'textPrimary'}
        style={sale.refunded ? { textDecorationLine: 'line-through' } : undefined}
      >
        {formatBRL(sale.totalCents)}
      </Text>

      {onPress ? <Icon name="chevronRight" size={16} color="textMuted" /> : null}
    </>
  );

  if (!onPress) {
    return (
      <Box flexDirection="row" alignItems="center" gap="s12" paddingVertical="s12">
        {content}
      </Box>
    );
  }

  return (
    <Touchable
      accessibilityLabel={`${sale.time}, ${sale.itemsSummary}, ${formatBRL(sale.totalCents)}`}
      onPress={onPress}
      flexDirection="row"
      alignItems="center"
      gap="s12"
      paddingVertical="s12"
    >
      {content}
    </Touchable>
  );
}
