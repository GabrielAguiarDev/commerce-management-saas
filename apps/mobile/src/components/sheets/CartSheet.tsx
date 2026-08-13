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
import { useCheckoutSale, useEditSale } from '@domain/sales';
import { SaleError } from '@domain/sales/salesTypes';
import { goToRoot } from '@hooks/navigation';
import { useTranslation } from '@i18n';
import { useCartStore } from '@store/cartStore';
import { activePaymentMethods, usePreferencesStore } from '@store/preferencesStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * "Sua venda": o sheet do carrinho.
 *
 * Concentra o fluxo que fecha a venda, e por isso é o único sheet que:
 *  - lê as formas de pagamento das Preferências (o que estiver desligado lá
 *    não aparece aqui);
 *  - decide, a partir do RESULTADO do checkout, se a venda subiu ou ficou na
 *    fila do aparelho — são dois avisos diferentes, ver `checkout()`.
 *
 * Já teve um Desfazer no toast do checkout. Não tem mais: ver o comentário
 * dentro de `checkout()`.
 */
export function CartSheet() {
  const t = useTranslation();
  const path = usePathname();

  const items = useCartStore((s) => s.items);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const editingSaleId = useCartStore((s) => s.editingSaleId);
  const setMethod = useCartStore((s) => s.setPaymentMethod);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const checkoutCart = useCartStore((s) => s.checkout);
  const cancelCart = useCartStore((s) => s.cancel);

  const acceptedMethods = usePreferencesStore((s) => s.acceptedMethods);

  const closeSheet = useUIStore((s) => s.closeSheet);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const { mutate: record, isPending } = useCheckoutSale();
  const { mutate: saveEdit, isPending: saving } = useEditSale();

  const editing = editingSaleId !== null;
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

  /**
   * SALVAR A EDIÇÃO — estorna a venda antiga e registra esta no lugar.
   *
   * Separado do `checkout()` porque as duas coisas terminam diferente: aqui
   * NÃO se volta para Vender com o carrinho limpo pronto para a próxima venda.
   * Quem estava editando veio do histórico e quer ver o resultado — então volta
   * para lá. Ver `salesService.editSale` para o porquê de editar ser
   * estornar-e-registrar.
   */
  function saveEditedSale() {
    if (!editingSaleId) return;
    const saleTotal = total;

    saveEdit(
      { saleId: editingSaleId, items, paymentMethod: selectedMethod },
      {
        onSuccess: () => {
          checkoutCart();
          closeSheet();
          goToRoot(ROUTES.sales);
          showToast(t.toasts.saleUpdated(formatBRL(saleTotal)), { tone: 'sucesso' });
        },
        onError: (error) => {
          const code = error instanceof SaleError ? error.code : 'unknown';
          showToast(t.errors.sale[code], { tone: 'erro' });
        },
      },
    );
  }

  function checkout() {
    const saleTotal = total;
    const snapshot = items;

    record(
      { items: snapshot, paymentMethod: selectedMethod },
      {
        onSuccess: (result) => {
          checkoutCart();
          closeSheet();
          // Depois de fechar a venda o balconista quase sempre começa outra:
          // o protótipo leva de volta para Vender, e é o certo.
          if (path !== ROUTES.sell) goToRoot(ROUTES.sell);

          // Qual confirmação aparece sai do RESULTADO, não do estado da
          // conexão lido de novo aqui. Entre apertar Finalizar e o toast a
          // conexão pode ter voltado, e o vendedor leria "está salva no
          // aparelho" sobre uma venda que subiu — ou pior, o contrário.
          // SEM Desfazer. O botão existia e era uma MENTIRA: ele só devolvia os
          // itens ao carrinho e reabria este sheet — a venda continuava em
          // `sales`/`sale_items`, e o gatilho do banco já tinha baixado o
          // estoque. Quem tocasse nele e finalizasse de novo criava uma SEGUNDA
          // venda, com receita e baixa em dobro. Estornar de verdade precisa de
          // caminho no banco (marcar a venda como cancelada e devolver o
          // estoque), que não existe. Enquanto não existir, não se oferece.
          // O tom sai do MESMO resultado, pelo mesmo motivo: a venda que subiu é
          // confirmação (visto), a que ficou no aparelho é recado — ainda falta
          // o vendedor lançar, e um visto ali diria que acabou.
          showToast(
            result.queued
              ? t.toasts.saleSavedOffline(formatBRL(saleTotal))
              : t.toasts.saleRecorded(formatBRL(saleTotal)),
            { tone: result.queued ? 'neutral' : 'sucesso' },
          );
        },
        onError: (error) => {
          const code = error instanceof SaleError ? error.code : 'unknown';
          showToast(t.errors.sale[code], { tone: 'erro' });
        },
      },
    );
  }

  // Sem toast aqui, de propósito: nada foi registrado ainda. Este botão
  // descarta um carrinho em montagem, e quem acabou de CONFIRMAR o descarte no
  // diálogo já sabe o que aconteceu — avisar de novo seria eco. O toast (com
  // Desfazer) é do checkout, onde a venda existe de verdade.
  function requestCancel() {
    // Sair da EDIÇÃO é outra pergunta: nada foi tocado na venda original, e o
    // diálogo precisa dizer isso — senão "cancelar" parece desfazer algo.
    const copy = editing ? t.confirms.cancelEdit : t.confirms.cancelSale;

    requestConfirm({
      ...copy,
      buttonLabel: copy.button,
      destructive: true,
      onConfirm: () => {
        cancelCart();
        closeSheet();
      },
    });
  }

  return (
    <BottomSheet title={editing ? t.cart.editTitle : 'Sua venda'} onClose={closeSheet}>
      {editing ? (
        <Box backgroundColor="warningSoft" borderRadius="r12" padding="s12" marginBottom="s4">
          <Text variant="caption" color="warning" lineHeight={18}>
            {t.cart.editHint}
          </Text>
        </Box>
      ) : null}

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
          title={
            editing ? t.cart.saveEdit(formatBRL(total)) : `Finalizar venda · ${formatBRL(total)}`
          }
          onPress={editing ? saveEditedSale : checkout}
          height={56}
          radius={17}
          textVariant="buttonLg"
          loading={isPending || saving}
          disabled={items.length === 0 || options.length === 0}
        />
      </Box>

      <Box marginTop="s8">
        <Button
          title={editing ? t.cart.cancelEdit : 'Cancelar venda'}
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
