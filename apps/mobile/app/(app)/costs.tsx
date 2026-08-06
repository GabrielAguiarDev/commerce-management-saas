import { useState } from 'react';

import { Button, Box, Card, Chips, Pill, Screen, Text } from '@components';
import type { ChipOption } from '@components';
import { filterCosts, useCosts, useMonthlySummary } from '@domain/costs';
import type { CostFilter } from '@domain/costs';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

const FILTERS: ChipOption<CostFilter>[] = [
  { key: 'all', label: 'Todos' },
  { key: 'fixed_only', label: 'Fixos' },
  { key: 'variable_only', label: 'Variáveis' },
];

/**
 * Custos — "O que sai do seu bolso".
 *
 * O card do topo mostra entrou / saiu / sobrou. "Sobrou" é derivado no adapter
 * (entrou − saiu) justamente para não existirem duas contas para o mesmo
 * número.
 */
export default function CostsScreen() {
  const { data: summary } = useMonthlySummary();
  const { data: costs = [] } = useCosts();
  const openSheet = useUIStore((s) => s.openSheet);

  const [filter, setFilter] = useState<CostFilter>('all');
  const list = filterCosts(costs, filter);

  return (
    <Screen title="Custos" subtitle="O que sai do seu bolso">
      <Card borderRadius="r22" padding="s18">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginBottom="s14"
        >
          <Text variant="titleXs">{summary?.mes ?? '—'}</Text>
          <Text variant="captionSm" color="textMuted">
            {summary?.period ?? '—'}
          </Text>
        </Box>

        <Box flexDirection="row" gap="s12">
          <ColunaDoMes label="Entrou" amount={summary?.entrouCentavos ?? 0} />
          <ColunaDoMes label="Saiu" amount={summary?.saiuCentavos ?? 0} color="danger" />
          <ColunaDoMes label="Sobrou" amount={summary?.sobrouCentavos ?? 0} color="success" />
        </Box>
      </Card>

      <Chips options={FILTERS} selecionada={filter} onSelect={setFilter} method="cash" expandir />

      {list.map((cost) => (
        <Box
          key={cost.id}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s14"
          flexDirection="row"
          alignItems="center"
          gap="s12"
        >
          <Box flex={1} minWidth={0}>
            <Text variant="titleXs">{cost.name}</Text>
            <Box flexDirection="row" gap="s6" marginTop="s6" flexWrap="wrap">
              <Pill text={cost.typeLabel} variant="tag" />
              {cost.fromStock ? (
                <Pill
                  text="veio do estoque"
                  backgroundColor="primarySoft"
                  textColor="primary"
                  variant="tag"
                />
              ) : null}
            </Box>
          </Box>
          <Box alignItems="flex-end">
            <Text variant="moneyBase">{formatBRL(cost.amountCents)}</Text>
            <Text variant="hint" color="textMuted" marginTop="s3">
              {cost.quando}
            </Text>
          </Box>
        </Box>
      ))}

      <Button
        title="+ Registrar custo"
        onPress={() => openSheet({ type: 'cost' })}
        variant="tracejado"
        height={52}
        radius={18}
        textVariant="buttonSm"
      />
    </Screen>
  );
}

function ColunaDoMes({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color?: 'danger' | 'success';
}) {
  return (
    <Box flex={1}>
      <Text variant="hint" color="textMuted">
        {label}
      </Text>
      <Text variant="moneyLg" color={color ?? 'textPrimary'} marginTop="s4">
        {formatBRL(amount)}
      </Text>
    </Box>
  );
}
