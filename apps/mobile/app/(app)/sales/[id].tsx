import { router, useLocalSearchParams } from 'expo-router';

import { Box, Button, Card, Divider, EmptyState, Icon, Pill, Screen, Skeleton, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import {
  useRefundSale,
  useSale,
  useUndoRefund,
  type RefundResult,
  type Sale,
} from '@domain/sales';
import { useTranslation } from '@i18n';
import type { Messages } from '@i18n';
import { useCartStore } from '@store/cartStore';
import { useConnectionStore } from '@store/connectionStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';
import { paymentLabel } from '@utils/payment';

/**
 * O DETALHE DE UMA VENDA — e as três coisas que dá para fazer com ela.
 *
 * A tela existe porque a linha do histórico não cabe a venda inteira: ela
 * mostra o resumo dos itens em uma linha, e é aqui que se vê o que foi vendido,
 * por quanto cada coisa saiu e como foi pago.
 *
 * As AÇÕES são as mesmas do portal, e é de propósito: ver, editar e estornar.
 * Um app que só mostra obriga o dono a abrir o computador para corrigir uma
 * venda digitada errada no balcão — que é exatamente o momento em que ele NÃO
 * está no computador.
 *
 * DUAS TRAVAS antes de qualquer uma delas mexer em dinheiro:
 *
 *  - **conexão**: estorno e edição falam com o servidor e com a função de
 *    estoque do banco. Não há caminho offline honesto para eles, então offline
 *    os botões nem aparecem (o aviso, sim);
 *  - **confirmação**: as duas passam pelo diálogo, com o efeito escrito por
 *    extenso — o que sai do faturamento, o que volta para a prateleira;
 *
 * Note que NÃO há trava de entitlement — ver o comentário em `canChange`.
 */
export default function SaleDetailScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: sale, isPending } = useSale(id);
  const online = useConnectionStore((s) => s.online);

  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const startEditing = useCartStore((s) => s.startEditing);

  const { mutate: refund, isPending: refunding } = useRefundSale();
  const { mutate: undo, isPending: undoing } = useUndoRefund();

  const working = refunding || undoing;

  /**
   * A ÚNICA trava é a CONEXÃO — e ela tem aviso na tela, logo acima.
   *
   * Aqui havia também `capabilities.hasSales`, e ele deixava os dois botões
   * mortos: dava para tocar e não acontecia nada, sem uma palavra de
   * explicação. O motivo era real — `hasSales` vem de `tenant.modules`, e há
   * tenant liberado para o app (`has_module('app')` no banco diz sim, e é isso
   * que o guardião consulta) cuja lista de módulos chega vazia. As duas fontes
   * discordam, e quem pagava era este botão.
   *
   * Mas mesmo com as fontes de acordo o gate estava errado: **o app deixa
   * REGISTRAR uma venda sem perguntar capacidade nenhuma** (`sell.tsx` e o
   * `CartSheet` não checam nada). Exigir mais para CORRIGIR do que para criar é
   * incoerente — quem pode lançar uma venda de R$ 219 no balcão tem que poder
   * consertá-la. O portão de entitlement do app já respondeu essa pergunta uma
   * vez, na porta.
   *
   * Fica a regra: **botão morto e mudo não existe nesta tela.** Ou ele age, ou
   * está desabilitado com o aviso do porquê à vista.
   */
  const canChange = online && !working;

  function handleRefund() {
    if (!sale) return;
    requestConfirm({
      title: t.sales.refundConfirm.title,
      text: t.sales.refundConfirm.text,
      buttonLabel: t.sales.refundConfirm.button,
      destructive: true,
      onConfirm: () =>
        refund(sale.id, {
          onSuccess: (result: RefundResult) =>
            showToast(
              result.stockFailures > 0
                ? t.toasts.stockNotReturned(result.stockFailures)
                : t.toasts.saleRefunded,
              { tone: result.stockFailures > 0 ? 'erro' : 'sucesso' },
            ),
          onError: () => showToast(t.errors.sale.network, { tone: 'erro' }),
        }),
    });
  }

  function handleUndoRefund() {
    if (!sale) return;
    requestConfirm({
      title: t.sales.undoConfirm.title,
      text: t.sales.undoConfirm.text,
      buttonLabel: t.sales.undoConfirm.button,
      destructive: false,
      onConfirm: () =>
        undo(sale.id, {
          onSuccess: (result: RefundResult) =>
            showToast(
              result.stockFailures > 0
                ? t.toasts.stockNotRemoved(result.stockFailures)
                : t.toasts.refundUndone,
              { tone: result.stockFailures > 0 ? 'erro' : 'sucesso' },
            ),
          onError: () => showToast(t.errors.sale.network, { tone: 'erro' }),
        }),
    });
  }

  /**
   * Editar NÃO mexe em nada aqui: carrega os itens no carrinho e leva para
   * Vender. O estorno da venda original só acontece quando o carrinho for
   * finalizado — ver `CartSheet`. Desistir no meio não deixa rastro, e é essa
   * a diferença entre este botão e o de estornar.
   */
  function handleEdit() {
    if (!sale) return;
    requestConfirm({
      title: t.sales.editConfirm.title,
      text: t.sales.editConfirm.text,
      buttonLabel: t.sales.editConfirm.button,
      destructive: false,
      onConfirm: () => {
        startEditing(sale);
        router.replace(ROUTES.sell as never);
        showToast(t.toasts.editingSale);
      },
    });
  }

  return (
    <Screen
      title={t.sales.detail.title}
      subtitle={sale ? `${sale.time} · ${paymentLabel(t, sale.paymentMethod)}` : '—'}
      padded
    >
      {isPending ? <DetailSkeleton /> : null}

      {!isPending && !sale ? (
        <EmptyState title={t.sales.detail.notFound.title} text={t.sales.detail.notFound.text} />
      ) : null}

      {sale ? (
        <>
          {sale.refunded ? (
            <Box
              flexDirection="row"
              alignItems="flex-start"
              gap="s10"
              backgroundColor="warningSoft"
              borderColor="warningBorder"
              borderWidth={1}
              borderRadius="r14"
              padding="s14"
            >
              <Icon name="alert" size={18} color="warning" />
              <Box flex={1}>
                <Text variant="caption" color="warning" lineHeight={18}>
                  {t.sales.detail.refundedNotice}
                </Text>
              </Box>
            </Box>
          ) : null}

          <Card gap="s10">
            <Box flexDirection="row" alignItems="center" gap="s8">
              <Text variant="sectionLabel" color="textMuted">
                {t.sales.detail.items}
              </Text>
              {sale.refunded ? (
                <Pill
                  text={t.sales.refundedBadge}
                  backgroundColor="warningSoft"
                  textColor="warning"
                  variant="tag"
                />
              ) : null}
            </Box>

            {sale.items.map((item, index) => (
              <Box key={`${item.productId}-${index}`} flexDirection="row" alignItems="center" gap="s12">
                <Box
                  minWidth={38}
                  height={34}
                  borderRadius="r10"
                  backgroundColor="surface2"
                  alignItems="center"
                  justifyContent="center"
                  paddingHorizontal="s8"
                >
                  <Text variant="tinyBold" color="textMuted">
                    {`${item.quantity}×`}
                  </Text>
                </Box>
                <Box flex={1} minWidth={0}>
                  <Text variant="rowText" numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text variant="hint" color="textMuted" marginTop="s2">
                    {`${formatBRL(item.unitPriceCents)} cada`}
                  </Text>
                </Box>
                <Text variant="moneyBase">
                  {formatBRL(item.unitPriceCents * item.quantity)}
                </Text>
              </Box>
            ))}

            <Divider />

            <Box flexDirection="row" alignItems="baseline" justifyContent="space-between">
              <Text variant="rowLabel" color="textMuted">
                {t.sales.detail.total}
              </Text>
              <Text variant="totalValue" color={sale.refunded ? 'textMuted' : 'textPrimary'}>
                {formatBRL(sale.totalCents)}
              </Text>
            </Box>
          </Card>

          {!online ? (
            <Box
              flexDirection="row"
              alignItems="center"
              gap="s10"
              backgroundColor="warningSoft"
              borderRadius="r14"
              padding="s14"
            >
              <Icon name="alert" size={18} color="warning" />
              <Box flex={1}>
                <Text variant="caption" color="warning" lineHeight={18}>
                  {t.sales.detail.offlineHint}
                </Text>
              </Box>
            </Box>
          ) : null}

          <SaleActions
            sale={sale}
            enabled={canChange}
            working={working}
            t={t}
            onEdit={handleEdit}
            onRefund={handleRefund}
            onUndoRefund={handleUndoRefund}
          />
        </>
      ) : null}
    </Screen>
  );
}

/**
 * As ações, e o que cada estado da venda oferece.
 *
 * A venda ESTORNADA só oferece desfazer: editar uma venda que já saiu do
 * faturamento criaria uma terceira linha para consertar a segunda, e ninguém
 * consegue explicar isso depois. A venda normal oferece as duas.
 */
function SaleActions({
  sale,
  enabled,
  working,
  t,
  onEdit,
  onRefund,
  onUndoRefund,
}: {
  sale: Sale;
  enabled: boolean;
  working: boolean;
  t: Messages;
  onEdit: () => void;
  onRefund: () => void;
  onUndoRefund: () => void;
}) {
  if (sale.refunded) {
    return (
      <Button
        title={t.sales.detail.undoRefund}
        onPress={onUndoRefund}
        variant="secundario"
        height={50}
        radius={16}
        textVariant="buttonXs"
        textColor="warning"
        disabled={!enabled}
        loading={working}
      />
    );
  }

  return (
    <Box gap="s8">
      <Button
        title={t.sales.detail.edit}
        onPress={onEdit}
        variant="secundario"
        height={50}
        radius={16}
        textVariant="buttonXs"
        disabled={!enabled}
      />
      <Button
        title={t.sales.detail.refund}
        onPress={onRefund}
        variant="fantasma"
        height={46}
        textColor="danger"
        textVariant="buttonXs"
        disabled={!enabled}
        loading={working}
      />
    </Box>
  );
}

function DetailSkeleton() {
  return (
    <Card gap="s14">
      <Skeleton height={15} width="30%" borderRadius="r8" />
      {[0, 1, 2].map((i) => (
        <Box key={i} flexDirection="row" alignItems="center" gap="s12">
          <Skeleton height={34} width={38} borderRadius="r10" />
          <Box flex={1}>
            <Skeleton height={13} width="70%" borderRadius="r6" />
          </Box>
          <Skeleton height={14} width={60} borderRadius="r6" />
        </Box>
      ))}
    </Card>
  );
}
