import { useState } from 'react';
import { Modal } from 'react-native';

import { Box } from './Box';
import { Text } from './Text';
import { Touchable } from './Touchable';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: readonly SelectOption[];
  onSelect: (amount: string) => void;
  accessibilityLabel: string;
  height?: number;
}

/**
 * O equivalente ao `<select>` do protótipo.
 *
 * React Native não tem select nativo multiplataforma: no iOS ele é uma roda,
 * no Android um diálogo. Em vez de importar um Picker que fica diferente em
 * cada plataforma (e que não aceita o tema), o campo abre uma lista simples em
 * `Modal` — visualmente igual nos dois lados e usando os mesmos tokens.
 *
 * `Modal` do RN, e não um overlay absoluto, porque este seletor é aberto de
 * DENTRO de um bottom sheet: um overlay comum ficaria embaixo do sheet.
 */
export function Select({
  value,
  options,
  onSelect,
  accessibilityLabel,
  height = 52,
}: SelectProps) {
  const [isOpen, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Touchable
        accessibilityLabel={`${accessibilityLabel}: ${current?.label ?? 'nenhuma'}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        height={height}
        borderRadius="r15"
        borderWidth={1}
        borderColor="line"
        backgroundColor="surface2"
        paddingHorizontal="s13"
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text variant="fieldValue">{current?.label ?? '—'}</Text>
        <Text variant="fieldValue" color="textMuted">
          ⌄
        </Text>
      </Touchable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Touchable
          accessibilityLabel="Fechar lista"
          onPress={() => setOpen(false)}
          flex={1}
          backgroundColor="scrimDialog"
          justifyContent="center"
          padding="s26"
        >
          <Box backgroundColor="surface" borderRadius="r20" overflow="hidden">
            {options.map((o, index) => (
              <Touchable
                key={o.value}
                accessibilityLabel={o.label}
                accessibilityState={{ selected: o.value === value }}
                onPress={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                paddingVertical="s16"
                paddingHorizontal="s18"
                borderTopWidth={index === 0 ? 0 : 1}
                borderTopColor="line"
              >
                <Text variant="fieldValue" color={o.value === value ? 'primary' : 'textPrimary'}>
                  {o.label}
                </Text>
              </Touchable>
            ))}
          </Box>
        </Touchable>
      </Modal>
    </>
  );
}
