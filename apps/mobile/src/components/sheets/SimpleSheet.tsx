import { useState } from 'react';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Field } from '@components/ui/Field';
import { Text } from '@components/ui/Text';
import { useRecordAdjustment, useOpenShift } from '@domain/cash';
import { CashError } from '@domain/cash/cashTypes';
import { useRecordCost } from '@domain/costs';
import { CostError } from '@domain/costs/costsTypes';
import { parseMovementQuantity, useRecordStockMovement } from '@domain/stock';
import { StockError } from '@domain/stock/stockTypes';
import { useTranslation } from '@i18n';
import { useUIStore } from '@store/uiStore';
import { parseCents } from '@utils/money';

/**
 * O sheet de DOIS CAMPOS, usado por quatro fluxos diferentes.
 *
 * No protótipo era um único bloco `sheetSimples` com os rótulos trocando por
 * `sheetTipo`. Mantivemos a ideia — o desenho é literalmente o mesmo — mas com
 * a configuração numa tabela (`CONFIGURACAO`) em vez de quatro ternários
 * aninhados, que era como o protótipo resolvia e é onde um rótulo errado passa
 * despercebido.
 */

type SimpleSheetType = 'withdrawal' | 'topUp' | 'movement' | 'cost';

interface SheetConfig {
  title: string;
  text: string;
  label1: string;
  placeholder1: string;
  label2: string;
  placeholder2: string;
  button: string;
  keyboard1: 'decimal-pad' | 'default';
  keyboard2: 'decimal-pad' | 'default' | 'numbers-and-punctuation';
}

const SHEET_CONFIG: Record<SimpleSheetType, SheetConfig> = {
  withdrawal: {
    title: 'Retirar dinheiro',
    text: 'Retirada de dinheiro da gaveta. Fica registrado no turno.',
    label1: 'Valor',
    placeholder1: 'R$ 0,00',
    label2: 'Motivo',
    placeholder2: 'Ex: pagamento do gás',
    button: 'Registrar retirada',
    keyboard1: 'decimal-pad',
    keyboard2: 'default',
  },
  topUp: {
    title: 'Colocar dinheiro',
    text: 'Dinheiro colocado na gaveta para troco.',
    label1: 'Valor',
    placeholder1: 'R$ 0,00',
    label2: 'Motivo',
    placeholder2: 'Ex: pagamento do gás',
    button: 'Registrar entrada',
    keyboard1: 'decimal-pad',
    keyboard2: 'default',
  },
  movement: {
    title: 'Movimentar estoque',
    text: 'Entradas viram custo variável automaticamente.',
    label1: 'Produto',
    placeholder1: 'Ração premium 15kg',
    label2: 'Quantidade (use − para saída)',
    placeholder2: '+10',
    button: 'Salvar movimentação',
    keyboard1: 'default',
    keyboard2: 'numbers-and-punctuation',
  },
  cost: {
    title: 'Novo custo',
    text: 'Custos fixos se repetem todo mês.',
    label1: 'Nome do custo',
    placeholder1: 'Ex: aluguel',
    label2: 'Valor',
    placeholder2: 'R$ 0,00',
    button: 'Salvar custo',
    keyboard1: 'default',
    keyboard2: 'decimal-pad',
  },
};

interface SimpleSheetProps {
  type: SimpleSheetType;
  /** Pré-preenchimento do campo 1 (o "Movimentar" de um item de estoque). */
  openingAmount?: string;
  productId?: string;
}

export function SimpleSheet({ type, openingAmount = '', productId }: SimpleSheetProps) {
  const t = useTranslation();
  const conf = SHEET_CONFIG[type];

  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);

  const { data: shift } = useOpenShift();
  const ajuste = useRecordAdjustment();
  const stockMovement = useRecordStockMovement();
  const cost = useRecordCost();

  const [campo1, setCampo1] = useState(openingAmount);
  const [campo2, setCampo2] = useState('');

  const ocupado = ajuste.isPending || stockMovement.isPending || cost.isPending;

  function errorToast(error: unknown) {
    if (error instanceof CashError) return showToast(t.errors.cash[error.code], { tone: 'erro' });
    if (error instanceof StockError)
      return showToast(t.errors.stock[error.code], { tone: 'erro' });
    if (error instanceof CostError) return showToast(t.errors.cost[error.code], { tone: 'erro' });
    return showToast('Não deu para salvar agora.', { tone: 'erro' });
  }

  function confirmar() {
    const sucesso = (message: string) => () => {
      closeSheet();
      showToast(message, { tone: 'sucesso' });
    };

    if (type === 'withdrawal' || type === 'topUp') {
      if (!shift) return showToast(t.errors.cash.cash_closed, { tone: 'erro' });
      return ajuste.mutate(
        {
          shiftId: shift.id,
          type,
          amountCents: parseCents(campo1) ?? 0,
          motivo: campo2,
        },
        {
          onSuccess: sucesso(
            type === 'withdrawal' ? t.toasts.withdrawalRecorded : t.toasts.topUpRecorded,
          ),
          onError: errorToast,
        },
      );
    }

    if (type === 'movement') {
      return stockMovement.mutate(
        {
          productId: productId ?? null,
          productName: campo1,
          delta: parseMovementQuantity(campo2) ?? 0,
        },
        { onSuccess: sucesso(t.toasts.stockUpdated), onError: errorToast },
      );
    }

    return cost.mutate(
      { name: campo1, amountCents: parseCents(campo2) ?? 0 },
      { onSuccess: sucesso(t.toasts.costRecorded), onError: errorToast },
    );
  }

  return (
    <BottomSheet title={conf.title} onClose={closeSheet}>
      <Box gap="s13">
        <Text variant="bodyRelaxed" color="textMuted">
          {conf.text}
        </Text>

        <Field
          label={conf.label1}
          value={campo1}
          onChangeText={setCampo1}
          placeholder={conf.placeholder1}
          keyboardType={conf.keyboard1}
        />

        <Field
          label={conf.label2}
          value={campo2}
          onChangeText={setCampo2}
          placeholder={conf.placeholder2}
          keyboardType={conf.keyboard2}
        />

        <Button
          title={conf.button}
          onPress={confirmar}
          height={54}
          textVariant="buttonMd"
          loading={ocupado}
        />
      </Box>
    </BottomSheet>
  );
}
