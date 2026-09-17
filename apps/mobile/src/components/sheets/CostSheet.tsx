import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Chips, type ChipOption } from '@components/ui/Chips';
import { Field } from '@components/ui/Field';
import { Skeleton } from '@components/ui/Skeleton';
import { Switch } from '@components/ui/Switch';
import { Text } from '@components/ui/Text';
import { useCosts, useDeleteCost, useRecordCost, useUpdateCost } from '@domain/costs';
import { CostError, type Cost, type CostType } from '@domain/costs/costsTypes';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { formatAmount, parseCents } from '@utils/money';

/**
 * Registrar, editar e excluir um custo manual.
 *
 * Espelha o `CustoModal` do portal: em série mensal a data não é editável, o
 * texto do "Repetir todo mês" explica o alcance do salvar, e a exclusão de
 * uma série ativa encerra a repetição. Quem decide o alcance de verdade é a
 * RPC `save_manual_cost` / `delete_manual_cost`; aqui só se escolhe a copy.
 */
export function CostSheet({ costId }: { costId?: string }) {
  const t = useTranslation();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const { data: costs = [], isPending } = useCosts();

  const cost = costId ? (costs.find((c) => c.id === costId) ?? null) : null;

  // Editar exige o custo em mãos: sem ele, salvar apagaria nome e valor.
  if (costId && !cost) {
    return (
      <BottomSheet title={t.costs.editTitle} onClose={closeSheet}>
        <Box gap="s13">
          {isPending ? (
            <Skeleton height={70} borderRadius="r14" />
          ) : (
            <Text variant="captionSm" color="textMuted">
              {t.errors.cost.not_found}
            </Text>
          )}
        </Box>
      </BottomSheet>
    );
  }

  return <CostForm key={cost?.id ?? 'new'} cost={cost} />;
}

function CostForm({ cost }: { cost: Cost | null }) {
  const t = useTranslation();
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const record = useRecordCost();
  const update = useUpdateCost();
  const remove = useDeleteCost();

  const editing = cost != null;
  const editingSeries = cost?.recurring === true;
  const seriesActive = cost?.repeating === true;

  const [name, setName] = useState(cost?.name ?? '');
  const [amount, setAmount] = useState(cost ? formatAmount(cost.amountCents) : '');
  const [costType, setCostType] = useState<CostType>(cost?.type ?? 'variable');
  const [recurring, setRecurring] = useState(cost?.recurring ?? false);

  const costTypes: ChipOption<CostType>[] = [
    { key: 'variable', label: t.costs.variable },
    { key: 'fixed', label: t.costs.fixed },
  ];
  const repeating = costType === 'fixed' && recurring;
  const busy = record.isPending || update.isPending || remove.isPending;

  function errorToast(error: unknown) {
    const code = error instanceof CostError ? error.code : 'network';
    showToast(t.errors.cost[code], { tone: 'erro' });
  }

  function done(message: string) {
    closeSheet();
    showToast(message, { tone: 'sucesso' });
  }

  function repeatHint(): string {
    if (!editing) return t.costs.repeatMonthlyHint;
    if (!editingSeries) return t.costs.editHint.startRepeating;
    if (!recurring) return t.costs.editHint.stop;
    return seriesActive ? t.costs.editHint.active : t.costs.editHint.ended;
  }

  function save() {
    const amountCents = parseCents(amount) ?? 0;

    if (!cost) {
      return record.mutate(
        { name, amountCents, type: costType, recurring: repeating },
        {
          onSuccess: () =>
            done(repeating ? t.toasts.costRecordedRepeating : t.toasts.costRecorded),
          onError: errorToast,
        },
      );
    }

    const toast = editingSeries
      ? !repeating
        ? t.costs.toasts.stoppedRepeating
        : seriesActive
          ? t.costs.toasts.updatedForward
          : t.costs.toasts.updated
      : repeating
        ? t.costs.toasts.startsRepeating
        : t.costs.toasts.updated;

    return update.mutate(
      { cost, changes: { name, amountCents, type: costType, recurring: repeating } },
      { onSuccess: () => done(toast), onError: errorToast },
    );
  }

  function requestDelete() {
    if (!cost) return;
    const copy = seriesActive
      ? t.costs.confirmDelete.repeating
      : editingSeries
        ? t.costs.confirmDelete.endedSeries
        : t.costs.confirmDelete.oneOff;

    requestConfirm({
      title: copy.title,
      text: copy.text,
      buttonLabel: copy.button,
      destructive: true,
      onConfirm: () =>
        remove.mutate(cost, {
          onSuccess: () =>
            done(seriesActive ? t.costs.toasts.deletedAndStopped : t.costs.toasts.deleted),
          onError: errorToast,
        }),
    });
  }

  if (cost?.fromStock) {
    return (
      <BottomSheet title={t.costs.editTitle} onClose={closeSheet}>
        <Text variant="bodyRelaxed" color="textMuted">
          {t.errors.cost.from_stock}
        </Text>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet title={editing ? t.costs.editTitle : t.costs.newTitle} onClose={closeSheet}>
      <Box gap="s13">
        {editing ? null : (
          <Text variant="bodyRelaxed" color="textMuted">
            {t.costs.sheetText}
          </Text>
        )}

        <Box gap="s10">
          <Text variant="fieldLabel" color="textMuted">
            {t.costs.typeLabel}
          </Text>
          <Chips
            options={costTypes}
            selecionada={costType}
            onSelect={(next) => {
              setCostType(next);
              if (next === 'variable') setRecurring(false);
            }}
            method="cash"
            expandir
          />
          {costType === 'fixed' ? (
            <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s12">
              <Box flex={1}>
                <Text variant="bodyMd">{t.costs.repeatMonthly}</Text>
                <Text variant="hint" color="textMuted" marginTop="s3">
                  {repeatHint()}
                </Text>
              </Box>
              <Switch
                on={recurring}
                onToggle={() => setRecurring((value) => !value)}
                label={t.costs.repeatMonthly}
              />
            </Box>
          ) : editingSeries ? (
            <Text variant="hint" color="textMuted">
              {t.costs.editHint.toVariable}
            </Text>
          ) : null}
        </Box>

        <Field
          label={t.costs.nameLabel}
          value={name}
          onChangeText={setName}
          placeholder={t.costs.namePlaceholder}
        />

        <Field
          label={t.costs.amountLabel}
          value={amount}
          onChangeText={setAmount}
          placeholder={t.costs.amountPlaceholder}
          keyboardType="decimal-pad"
        />

        {cost && editingSeries ? (
          <Text variant="hint" color="textMuted">
            {t.costs.entryMonth(
              cost.competenceLabel ?? cost.costDate,
              Number(cost.costDate.slice(8, 10)),
            )}
          </Text>
        ) : null}

        <Button
          title={editing ? t.costs.saveChanges : t.costs.save}
          onPress={save}
          height={54}
          textVariant="buttonMd"
          loading={record.isPending || update.isPending}
          disabled={busy}
        />

        {editing ? (
          <Button
            title={seriesActive ? t.costs.deleteAndStop : t.costs.delete}
            onPress={requestDelete}
            variant="destrutivo"
            height={48}
            textVariant="buttonSm"
            loading={remove.isPending}
            disabled={busy}
          />
        ) : null}
      </Box>
    </BottomSheet>
  );
}
