import { usePathname } from 'expo-router';

import { BottomSheet } from '@components/patterns/BottomSheet';
import { Button } from '@components/ui/Button';
import { Box } from '@components/ui/Box';
import { Divider } from '@components/ui/Divider';
import { Select } from '@components/ui/Select';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { ROUTES } from '@domain/navigation/routes';
import { subtotalCents, totalCents } from '@domain/sales/cart';
import { useCheckoutSale } from '@domain/sales';
import { SaleError } from '@domain/sales/salesTypes';
import { goToRoot } from '@hooks/navigation';
import { useTranslation } from '@i18n';
import { useCartStore } from '@store/cartStore';
import { useConnectionStore } from '@store/connectionStore';
import { activePaymentMethods, usePreferencesStore } from '@store/preferencesStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * "Sua venda": o sheet do carrinho.
 *
 * Concentra o fluxo que fecha a venda, e por isso é o único sheet que:
 *  - lê as formas de pagamento das Preferências (o que estiver desligado lá
 *    não aparece aqui);
 *  - dispara um toast com Desfazer que RESTAURA o carrinho e reabre este mesmo
 *    sheet — a rede de segurança do balconista que tocou em Finalizar sem
 *    querer.
 */
export function CartSheet() {
  const t = useTranslation();
  const path = usePathname();

  const items = useCartStore((s) => s.items);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const setMethod = useCartStore((s) => s.setPaymentMethod);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const checkoutCart = useCartStore((s) => s.checkout);
  const cancelCart = useCartStore((s) => s.cancel);
  const undoCart = useCartStore((s) => s.undo);

  const acceptedMethods = usePreferencesStore((s) => s.acceptedMethods);
  const online = useConnectionStore((s) => s.online);

  const openSheet = useUIStore((s) => s.openSheet);
  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const { mutate: record, isPending } = useCheckoutSale();

  const total = totalCents(items);
  // The option's identity is the KEY; the label comes from the catalog, so a
  // sale still records `debit_card` no matter which language is on screen.
  const options = activePaymentMethods(acceptedMethods).map((method) => ({
    value: method,
    label: t.paymentMethods[method],
  }));

  // A forma guardada no carrinho pode ter sido DESLIGADA nas Preferências
  // depois de escolhida. Cair na primeira aceita evita finalizar com uma forma
  // que o negócio não aceita mais.
  const selectedMethod = options.some((o) => o.value === paymentMethod)
    ? paymentMethod
    : (options[0]?.value ?? '');

  function checkout() {
    const saleTotal = total;
    const snapshot = items;

    record(
      { items: snapshot, paymentMethod: selectedMethod },
      {
        onSuccess: () => {
          checkoutCart();
          closeSheet();
          // Depois de fechar a venda o balconista quase sempre começa outra:
          // o protótipo leva de volta para Vender, e é o certo.
          if (path !== ROUTES.sell) goToRoot(ROUTES.sell);

          showToast(
            online
              ? t.toasts.saleRecorded(formatBRL(saleTotal))
              : t.toasts.saleSavedOffline(formatBRL(saleTotal)),
            {
              withUndo: true,
              onUndo: () => {
                undoCart();
                openSheet({ type: 'cart' });
              },
            },
          );
        },
        onError: (error) => {
          const code = error instanceof SaleError ? error.code : 'unknown';
          showToast(t.errors.sale[code], { tone: 'erro' });
        },
      },
    );
  }

  function requestCancel() {
    requestConfirm({
      ...t.confirms.cancelSale,
      buttonLabel: t.confirms.cancelSale.button,
      destructive: true,
      onConfirm: () => {
        cancelCart();
        closeSheet();
        showToast(t.toasts.saleCancelled);
      },
    });
  }

  return (
    <BottomSheet title="Sua venda" onClose={closeSheet}>
      {items.map((item) => (
        <Box key={item.productId}>
          <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s12">
            <Box flex={1} minWidth={0}>
              <Text variant="titleXs">{item.name}</Text>
              <Text variant="captionSm" color="textMuted" marginTop="s3">
                {formatBRL(item.unitPriceCents)} cada
              </Text>
            </Box>

            <Box flexDirection="row" alignItems="center" gap="s8">
              <StepButton
                label={`Diminuir ${item.name}`}
                simbolo="−"
                onPress={() => decrement(item.productId)}
              />
              <Box minWidth={22} alignItems="center">
                <Text variant="moneyMd">{item.quantity}</Text>
              </Box>
              <StepButton
                label={`Aumentar ${item.name}`}
                simbolo="+"
                onPress={() => increment(item.productId)}
              />
            </Box>

            <Box minWidth={74} alignItems="flex-end">
              <Text variant="moneyBase">{formatBRL(subtotalCents(item))}</Text>
            </Box>
          </Box>
          <Divider />
        </Box>
      ))}

      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        paddingTop="s16"
        paddingBottom="s14"
      >
        <Text variant="rowLabel" color="textMuted" fontSize={14}>
          Total
        </Text>
        <Text variant="totalValue">{formatBRL(total)}</Text>
      </Box>

      <Text variant="label" color="textMuted" marginBottom="s7">
        Forma de pagamento
      </Text>
      <Select
        value={selectedMethod}
        options={options}
        onSelect={setMethod}
        accessibilityLabel="Forma de pagamento"
      />

      <Box marginTop="s14">
        <Button
          title={`Finalizar venda · ${formatBRL(total)}`}
          onPress={checkout}
          height={56}
          radius={17}
          textVariant="buttonLg"
          loading={isPending}
          disabled={items.length === 0 || options.length === 0}
        />
      </Box>

      <Box marginTop="s8">
        <Button
          title="Cancelar venda"
          onPress={requestCancel}
          variant="fantasma"
          height={46}
          textColor="danger"
          textVariant="buttonXs"
        />
      </Box>
    </BottomSheet>
  );
}

function StepButton({
  simbolo,
  label,
  onPress,
}: {
  simbolo: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      accessibilityLabel={label}
      onPress={onPress}
      width={36}
      height={36}
      borderRadius="r12"
      borderWidth={1}
      borderColor="line"
      alignItems="center"
      justifyContent="center"
    >
      <Text variant="stepper">{simbolo}</Text>
    </Touchable>
  );
}
