import { router } from 'expo-router';

import { Box, Card, Divider, Icon, Pill, Screen, Skeleton, Text, Touchable } from '@components';
import { lowStockProducts, useCatalog } from '@domain/catalog';
import { useOpenShift } from '@domain/cash';
import { ROUTES } from '@domain/navigation/routes';
import { useDailySummary, usePendingSalesCount, useRecentSales } from '@domain/sales';
import { useCapabilities, useCurrentTenant } from '@domain/tenant';
import { goTo } from '@hooks/navigation';
import { useSessionStore } from '@store/sessionStore';
import type { Messages } from '@i18n';
import { useTranslation } from '@i18n';
import { formatBRL } from '@utils/money';

/**
 * Início.
 *
 * Quais cards aparecem é decisão do PLANO: o atalho de caixa só existe com o
 * módulo `cash`, o alerta de estoque só com `stock`. É a mesma capacidade que
 * governa a tab bar e a grade de "Mais" — nada aqui pergunta pela chave do
 * módulo diretamente.
 *
 * O carregamento dos DADOS acontece dentro do corpo, com header e tab bar já
 * desenhados: `summaryPending` troca só os números por esqueletos. A tela
 * inteira nunca some — isso é reservado ao guardião, que roda uma vez na
 * entrada do app.
 */
export default function HomeScreen() {
  const user = useSessionStore((s) => s.user);
  const { data: tenant } = useCurrentTenant();
  const { capabilities } = useCapabilities();
  const { data: summary, isPending: summaryPending } = useDailySummary();
  const { data: sales = [] } = useRecentSales();
  const { data: shift } = useOpenShift();
  const { data: products = [] } = useCatalog();
  const pendingCount = usePendingSalesCount();

  const t = useTranslation();

  const alerts = capabilities.hasStock ? lowStockProducts(products) : [];

  return (
    <Screen
      title={`Bom dia, ${firstName(user?.name)}`}
      subtitle={`${tenant?.name ?? '—'} · ${longDate()}`}
      showBack={false}
    >
      <Box backgroundColor="secondary" borderRadius="r22" padding="s20">
        <Text variant="chipLabel" color="onPetrol" opacity={0.65}>
          Vendas de hoje
        </Text>
        {/* Sem esqueleto, este número aparecia como R$ 0,00 e depois pulava
            para o valor real — pior que esperar: por um instante o app AFIRMA
            que não se vendeu nada hoje. O card em volta não muda de tamanho, e
            a tab bar segue lá: o carregamento cabe dentro do conteúdo. */}
        {summaryPending ? (
          <>
            <Skeleton
              height={38}
              width="62%"
              borderRadius="r12"
              marginTop="s6"
              marginBottom="s12"
              backgroundColor="pillOnPetrol"
            />
            <Skeleton height={24} width="80%" borderRadius="full" backgroundColor="pillOnPetrol" />
          </>
        ) : (
          <>
            <Text variant="heroValue" color="onPetrol" marginTop="s6" marginBottom="s12">
              {formatBRL(summary?.totalCents ?? 0)}
            </Text>
            <Box flexDirection="row" flexWrap="wrap" gap="s8">
              <Pill
                text={t.home.counters.sales(summary?.saleCount ?? 0)}
                backgroundColor="pillOnPetrol"
                textColor="onPetrol"
                variant="tinyBold"
                paddingX={11}
                paddingY={6}
              />
              <Pill
                text={t.home.counters.items(summary?.soldItems ?? 0)}
                backgroundColor="pillOnPetrol"
                textColor="onPetrol"
                variant="tinyBold"
                paddingX={11}
                paddingY={6}
              />
              <Pill
                text={`ticket ${formatBRL(summary?.averageTicketCents ?? 0)}`}
                backgroundColor="pillOnPetrol"
                textColor="onPetrol"
                variant="tinyBold"
                paddingX={11}
                paddingY={6}
              />
            </Box>
          </>
        )}
      </Box>

      <Box flexDirection="row" gap="s12">
        <Card flex={1}>
          <Text variant="label" color="textMuted">
            Sobrou hoje
          </Text>
          {summaryPending ? (
            <Skeleton height={22} width="70%" marginTop="s6" />
          ) : (
            <Text variant="cardValue" color="success" marginTop="s6">
              {formatBRL(summary?.profitCents ?? 0)}
            </Text>
          )}
          <Text variant="hint" color="textMuted" marginTop="s4">
            depois dos custos
          </Text>
        </Card>

        <Card flex={1}>
          <Text variant="label" color="textMuted">
            Mais vendido
          </Text>
          {summaryPending ? (
            <Skeleton height={19} width="85%" marginTop="s6" />
          ) : (
            <Text variant="titleSm" marginTop="s6">
              {summary?.maisVendido?.name ?? '—'}
            </Text>
          )}
          <Text variant="hint" color="textMuted" marginTop="s4">
            {summary?.maisVendido
              ? t.units.soldToday(summary.maisVendido.quantity)
              : t.home.noSalesYet}
          </Text>
        </Card>
      </Box>

      {capabilities.hasCash ? (
        <Touchable
          accessibilityLabel={shift ? 'Ver caixa aberto' : 'Abrir o caixa'}
          // Caixa é uma ABA: `goTo` faz o jumpTo, `push` não teria pilha onde
          // empilhar. Estoque, logo abaixo, continua sendo `push`.
          onPress={() => goTo(ROUTES.cash)}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r20"
          padding="s16"
          flexDirection="row"
          alignItems="center"
          gap="s13"
        >
          <Box
            width={42}
            height={42}
            borderRadius="r14"
            backgroundColor="primarySoft"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="cash" size={20} color="primary" />
          </Box>
          <Box flex={1}>
            <Text variant="titleSm">{shift ? 'Caixa aberto' : 'Caixa fechado'}</Text>
            <Text variant="caption" color="textMuted" marginTop="s3">
              {shift
                ? `Na gaveta agora: ${formatBRL(shift.gavetaCentavos)}`
                : 'Abra para começar o turno'}
            </Text>
          </Box>
          <Text variant="sectionLabel" color="primary">
            Ver
          </Text>
        </Touchable>
      ) : null}

      {/* A fila offline. Fica ACIMA do alerta de estoque de propósito: um
          produto acabando é um problema de amanhã; venda que ainda não entrou
          no sistema é dinheiro de hoje fora do lugar. O card só existe quando
          há algo na fila — é ele quem torna a tela de pendentes alcançável. */}
      {pendingCount > 0 ? (
        <Touchable
          accessibilityLabel={t.pendingSales.homeCard.title(pendingCount)}
          onPress={() => router.push(ROUTES.pendingSales as never)}
          backgroundColor="surface"
          borderColor="warningBorder"
          borderWidth={1}
          borderRadius="r20"
          padding="s16"
          flexDirection="row"
          alignItems="center"
          gap="s13"
        >
          <Box
            width={42}
            height={42}
            borderRadius="r14"
            backgroundColor="warningIconBg"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="cart" size={20} color="warning" />
          </Box>
          <Box flex={1}>
            <Text variant="titleSm">{t.pendingSales.homeCard.title(pendingCount)}</Text>
            <Text variant="caption" color="textMuted" marginTop="s3">
              {t.pendingSales.homeCard.text}
            </Text>
          </Box>
          <Icon name="chevronRight" size={18} color="textMuted" />
        </Touchable>
      ) : null}

      {alerts.length > 0 ? (
        <Touchable
          accessibilityLabel={t.stockAlert.heading(alerts.length)}
          onPress={() => router.push(ROUTES.stock as never)}
          backgroundColor="warningSoft"
          borderColor="warningBorder"
          borderWidth={1}
          borderRadius="r20"
          padding="s16"
          flexDirection="row"
          alignItems="center"
          gap="s13"
        >
          <Box
            width={42}
            height={42}
            borderRadius="r14"
            backgroundColor="warningIconBg"
            alignItems="center"
            justifyContent="center"
          >
            <Icon name="alert" size={20} color="warning" />
          </Box>
          <Box flex={1}>
            <Text variant="titleSm" color="warning">
              {t.stockAlert.heading(alerts.length)}
            </Text>
            <Text variant="caption" color="warning" opacity={0.8} marginTop="s3">
              {summarizeAlerts(alerts, t)}
            </Text>
          </Box>
        </Touchable>
      ) : null}

      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s12" paddingBottom="s4">
          Últimas vendas
        </Text>
        {sales.map((sale) => (
          <Box key={sale.id}>
            <Divider />
            <Box flexDirection="row" alignItems="center" gap="s12" paddingVertical="s11">
              <Box
                width={34}
                height={34}
                borderRadius="r11"
                backgroundColor="surface2"
                alignItems="center"
                justifyContent="center"
              >
                <Text variant="tinyBold" color="textMuted">
                  {sale.time}
                </Text>
              </Box>
              <Box flex={1} minWidth={0}>
                <Text variant="rowText" numberOfLines={1}>
                  {sale.itemsSummary}
                </Text>
                <Text variant="hint" color="textMuted" marginTop="s2">
                  {sale.paymentMethod}
                </Text>
              </Box>
              <Text variant="titleXs">{formatBRL(sale.totalCents)}</Text>
            </Box>
          </Box>
        ))}
      </Card>
    </Screen>
  );
}

function firstName(name: string | undefined): string {
  return (name ?? 'você').trim().split(/\s+/)[0] ?? 'você';
}

/** "domingo, 26 de julho" — como o subtítulo do protótipo. */
function longDate(): string {
  const today = new Date();
  const dia = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const mes = today.toLocaleDateString('pt-BR', { month: 'long' });
  return `${dia}, ${today.getDate()} de ${mes}`;
}

function summarizeAlerts(
  alerts: { name: string; stock: { status: string } | null }[],
  t: Messages,
): string {
  return alerts
    .slice(0, 2)
    .map((p) => p.stock?.status === 'out' ? t.stockAlert.out(p.name) : t.stockAlert.low(p.name))
    .join(' · ');
}
