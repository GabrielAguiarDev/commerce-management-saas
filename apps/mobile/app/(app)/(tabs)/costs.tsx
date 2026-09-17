import { useState } from 'react';

import { Button, Box, Card, Chips, Pill, Screen, Text, Touchable } from '@components';
import type { ChipOption } from '@components';
import { filterCosts, useCosts, useMonthlySummary } from '@domain/costs';
import type { Cost, CostFilter } from '@domain/costs';
import { useCapabilities } from '@domain/tenant';
import { useUIStore } from '@store/uiStore';
import { useTranslation } from '@i18n';
import { formatBRL } from '@utils/money';

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
  const showToast = useUIStore((s) => s.showToast);
  const t = useTranslation();
  // Só quem tem o módulo de custos lança, edita ou exclui. O servidor
  // confere de novo; aqui é para não oferecer o que vai ser recusado.
  const canEdit = useCapabilities().capabilities.hasCosts;

  const filters: ChipOption<CostFilter>[] = [
    { key: 'all', label: t.costs.filters.all },
    { key: 'fixed_only', label: t.costs.filters.fixed },
    { key: 'variable_only', label: t.costs.filters.variable },
  ];

  const [filter, setFilter] = useState<CostFilter>('all');
  const list = filterCosts(costs, filter);

  function openCost(cost: Cost) {
    // Custo de estoque não se edita aqui: explica onde se corrige.
    if (cost.fromStock) return showToast(t.errors.cost.from_stock);
    openSheet({ type: 'cost', costId: cost.id });
  }

  return (
    <Screen title={t.costs.title} subtitle={t.costs.subtitle} padded>
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
          <ColunaDoMes label={t.costs.summary.income} amount={summary?.entrouCentavos ?? 0} />
          <ColunaDoMes label={t.costs.summary.expense} amount={summary?.saiuCentavos ?? 0} color="danger" />
          <ColunaDoMes label={t.costs.summary.left} amount={summary?.sobrouCentavos ?? 0} color="success" />
        </Box>
      </Card>

      <Chips options={filters} selecionada={filter} onSelect={setFilter} method="cash" expandir />

      {list.map((cost) => (
        <Touchable
          key={cost.id}
          accessibilityLabel={t.costs.editRow(cost.name)}
          disabled={!canEdit}
          onPress={() => openCost(cost)}
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
                  text={t.costs.fromStockTag}
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
              {cost.competenceLabel
                ? `${cost.quando} · ${t.costs.competence(cost.competenceLabel)}`
                : cost.quando}
            </Text>
          </Box>
        </Touchable>
      ))}

      {canEdit ? (
        <Button
          title={t.costs.addButton}
          onPress={() => openSheet({ type: 'cost' })}
          variant="tracejado"
          height={52}
          radius={18}
          textVariant="buttonSm"
        />
      ) : null}
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
