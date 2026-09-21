import { useMemo, useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Box } from '@components/ui/Box';
import { Button } from '@components/ui/Button';
import { Icon } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import {
  MAX_RANGE_DAYS,
  monthTitle,
  normalizeRange,
  rangeLabel,
  type DateRange,
} from '@domain/reports';
import { useTranslation } from '@i18n';
import { usePreferencesStore } from '@store/preferencesStore';
import { useUIStore } from '@store/uiStore';
import { addDaysDateOnly, daysInclusive, parseDateOnly, todayDateOnly } from '@utils/dates';

/**
 * O CALENDÁRIO do período Personalizado.
 *
 * Feito aqui, e não com o picker nativo do sistema, por dois motivos: o nativo
 * escolhe UMA data por vez (seriam dois campos, "de" e "até", abertos um de
 * cada vez), e ele é um módulo nativo — instalá-lo exige gerar o app de novo.
 * Este é só layout: um mês por vez, e o intervalo escolhido em dois toques.
 *
 * O primeiro toque marca o início; o segundo, o fim (se vier antes do início,
 * vira o novo início). Um terceiro toque recomeça. Aplicar só com o início é
 * ver aquele dia. Dias futuros não existem para relatório e ficam apagados.
 */
export function DateRangeSheet({
  initial,
  onApply,
}: {
  initial: DateRange | null;
  onApply: (range: DateRange) => void;
}) {
  const t = useTranslation();
  const tr = t.reports.rangePicker;
  const language = usePreferencesStore((s) => s.language);
  const closeSheet = useUIStore((s) => s.closeSheet);

  const today = todayDateOnly();
  const [start, setStart] = useState<string | null>(initial?.from ?? null);
  const [end, setEnd] = useState<string | null>(initial?.to ?? null);
  // O mês visível abre onde a escolha anterior termina — ou no mês corrente.
  const [month, setMonth] = useState(() => (initial?.to ?? today).slice(0, 7));

  const weeks = useMemo(() => monthGrid(month), [month]);
  const isCurrentMonth = month >= today.slice(0, 7);

  function pick(day: string) {
    if (!start || end) {
      setStart(day);
      setEnd(null);
    } else if (day < start) {
      setStart(day);
    } else {
      setEnd(day);
    }
  }

  function apply() {
    if (!start) return;
    onApply(normalizeRange({ from: start, to: end ?? start }, today));
    closeSheet();
  }

  const tooLong = start && end ? daysInclusive(start, end) > MAX_RANGE_DAYS : false;
  const hint = !start
    ? tr.pickStart
    : !end
      ? tr.pickEnd
      : tooLong
        ? tr.maxRange(MAX_RANGE_DAYS)
        : tr.summary(
            rangeLabel({ from: start, to: start }, today),
            rangeLabel({ from: end, to: end }, today),
          );

  return (
    <BottomSheet title={tr.title} onClose={closeSheet}>
      <Box gap="s14">
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <Touchable
            accessibilityLabel={tr.previousMonth}
            onPress={() => setMonth(shiftMonth(month, -1))}
            width={40}
            height={40}
            borderRadius="r13"
            alignItems="center"
            justifyContent="center"
            backgroundColor="surface2"
          >
            <Box style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevronRight" size={18} color="textPrimary" />
            </Box>
          </Touchable>

          <Text variant="titleSm">{capitalizeFirst(monthTitle(month, language))}</Text>

          <Touchable
            accessibilityLabel={tr.nextMonth}
            onPress={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrentMonth}
            width={40}
            height={40}
            borderRadius="r13"
            alignItems="center"
            justifyContent="center"
            backgroundColor="surface2"
          >
            {/* Apagado pela cor, não por `opacity`: o `Touchable` usa o style
                para o feedback de toque e sobrescreveria a opacidade. */}
            <Icon
              name="chevronRight"
              size={18}
              color={isCurrentMonth ? 'textMuted' : 'textPrimary'}
            />
          </Touchable>
        </Box>

        <Box>
          <Box flexDirection="row" marginBottom="s6">
            {tr.weekdays.map((w, i) => (
              <Box key={i} flex={1} alignItems="center">
                <Text variant="axisLabel" color="textMuted">
                  {w}
                </Text>
              </Box>
            ))}
          </Box>

          {weeks.map((week, wi) => (
            <Box key={wi} flexDirection="row">
              {week.map((day, di) => {
                if (!day) return <Box key={di} flex={1} height={42} />;

                const future = day > today;
                const isEdge = day === start || day === end;
                const inRange = !!start && !!end && day > start && day < end;
                // A faixa do intervalo: uma peça só por célula, da metade à
                // borda nas pontas e de borda a borda no meio. Passa 1px de
                // cada lado para cobrir o arredondamento entre colunas — duas
                // metades lado a lado deixavam frestas visíveis.
                const inBand = !!start && !!end && day >= start && day <= end && start !== end;
                const bandFromLeft = inBand && day !== start;
                const bandToRight = inBand && day !== end;

                return (
                  <Box key={day} flex={1} height={42} justifyContent="center">
                    {inBand && (
                      <Box
                        position="absolute"
                        top={4}
                        bottom={4}
                        left={bandFromLeft ? -1 : '50%'}
                        right={bandToRight ? -1 : '50%'}
                        backgroundColor="primarySoft"
                      />
                    )}
                    <Touchable
                      accessibilityLabel={parseDateOnly(day).toLocaleDateString(language)}
                      accessibilityState={{ selected: isEdge, disabled: future }}
                      disabled={future}
                      onPress={() => pick(day)}
                      alignSelf="center"
                      width={34}
                      height={34}
                      borderRadius="full"
                      alignItems="center"
                      justifyContent="center"
                      backgroundColor={isEdge ? 'primary' : undefined}
                      borderWidth={day === today && !isEdge ? 1 : 0}
                      borderColor="primary"
                    >
                      <Text
                        variant="rowLabel"
                        color={isEdge ? 'white' : future ? 'textMuted' : inRange ? 'primary' : 'textPrimary'}
                        opacity={future ? 0.4 : 1}
                      >
                        {Number(day.slice(8))}
                      </Text>
                    </Touchable>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>

        <Text variant="hint" color={tooLong ? 'warning' : 'textMuted'} textAlign="center">
          {hint}
        </Text>

        <Button title={tr.apply} onPress={apply} disabled={!start} height={52} radius={15} />
      </Box>
    </BottomSheet>
  );
}

/** "setembro de 2026" → "Setembro de 2026" (só a primeira letra). */
function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `YYYY-MM` deslocado N meses. */
function shiftMonth(month: string, delta: number): string {
  const d = parseDateOnly(`${month}-01`);
  d.setMonth(d.getMonth() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** As semanas do mês, domingo primeiro; `null` nos dias de outros meses. */
function monthGrid(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const lead = parseDateOnly(first).getDay();
  const days: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = first; d.startsWith(month); d = addDaysDateOnly(d, 1)) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}
