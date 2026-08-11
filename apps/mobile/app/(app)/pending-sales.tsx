import { Box, Button, Card, Divider, EmptyState, Icon, Pill, Screen, Text } from '@components';
import {
  useDiscardPendingSale,
  usePendingSales,
  useSyncPendingSales,
  type PendingSale,
  type SyncSummary,
} from '@domain/sales';
import { useTranslation } from '@i18n';
import type { Messages } from '@i18n';
import { useConnectionStore } from '@store/connectionStore';
import { useUIStore } from '@store/uiStore';
import { formatBRL } from '@utils/money';

/**
 * VENDAS PENDENTES — a fila que o aparelho guardou.
 *
 * A tela existe para responder três perguntas, nesta ordem: o que está
 * guardado, o que eu faço com isso, e por que aquela ali não entrou. Toda
 * decisão de layout abaixo serve a essa ordem.
 *
 * O botão de lançar é a ÚNICA forma de as vendas subirem. Não há sincronização
 * automática ao voltar a conexão, e isso é escolha de produto: quem responde
 * pelo dinheiro do dia é o dono do negócio, e ele lança depois de olhar a
 * lista — não enquanto o celular está no bolso.
 */
export default function PendingSalesScreen() {
  const t = useTranslation();
  const online = useConnectionStore((s) => s.online);
  const showToast = useUIStore((s) => s.showToast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const { data: pending = [], isPending: loading } = usePendingSales();
  const { mutate: sync, isPending: syncing } = useSyncPendingSales();
  const { mutate: discard } = useDiscardPendingSale();

  function handleSync() {
    sync(undefined, {
      onSuccess: (summary) => showToast(summarize(summary, t), { tone: tone(summary) }),
      // Chegar aqui é a fila nem ter conseguido ser lida — não é uma venda
      // recusada. As vendas continuam guardadas; só a tentativa não saiu do
      // lugar.
      onError: () => showToast(t.errors.sale.network, { tone: 'erro' }),
    });
  }

  function handleDiscard(sale: PendingSale) {
    requestConfirm({
      title: t.pendingSales.discard.title,
      text: t.pendingSales.discard.text,
      buttonLabel: t.pendingSales.discard.button,
      destructive: true,
      onConfirm: () => discard(sale.localId),
    });
  }

  return (
    <Screen title={t.pendingSales.title} subtitle={t.pendingSales.subtitle}>
      {!loading && pending.length === 0 ? (
        <EmptyState title={t.pendingSales.empty.title} text={t.pendingSales.empty.text} />
      ) : null}

      {pending.length > 0 ? (
        <>
          <Text variant="sectionLabel" color="textMuted">
            {t.pendingSales.heading(pending.length)}
          </Text>

          {pending.map((sale) => (
            <PendingSaleCard
              key={sale.localId}
              sale={sale}
              onDiscard={() => handleDiscard(sale)}
              t={t}
            />
          ))}

          {/* A ação fica no FIM da lista, não no topo: o desenho pede que se
              role a fila inteira antes de lançar. É a última chance de ver uma
              venda estranha antes que ela entre no sistema. */}
          {online ? (
            <Button
              title={syncing ? t.pendingSales.syncingButton : t.pendingSales.syncButton(pending.length)}
              onPress={handleSync}
              height={56}
              radius={17}
              textVariant="buttonLg"
              loading={syncing}
            />
          ) : (
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
                  {t.pendingSales.offlineHint}
                </Text>
              </Box>
            </Box>
          )}
        </>
      ) : null}
    </Screen>
  );
}

function PendingSaleCard({
  sale,
  onDiscard,
  t,
}: {
  sale: PendingSale;
  onDiscard: () => void;
  t: Messages;
}) {
  const failed = sale.status === 'error';

  // `payment_method` vem do banco como chave (`debit_card`), e o catálogo do
  // i18n cobre as quatro conhecidas. Uma forma de pagamento que o portal criar
  // amanhã cai no próprio identificador em vez de sumir da linha.
  const paymentLabel =
    (t.paymentMethods as Record<string, string | undefined>)[sale.paymentMethod] ??
    sale.paymentMethod;

  return (
    <Card
      paddingVertical="s14"
      paddingHorizontal="s16"
      borderColor={failed ? 'danger' : 'line'}
    >
      <Box flexDirection="row" alignItems="center" gap="s10">
        <Box flex={1} minWidth={0}>
          <Text variant="titleXs" numberOfLines={2}>
            {sale.itemsSummary}
          </Text>
          <Text variant="hint" color="textMuted" marginTop="s3">
            {`${sale.day} · ${sale.time} · ${paymentLabel}`}
          </Text>
        </Box>
        <Text variant="moneyBase">{formatBRL(sale.totalCents)}</Text>
      </Box>

      {failed ? (
        <>
          <Box marginTop="s12">
            <Pill
              text={t.pendingSales.errorLabel}
              backgroundColor="dangerSoft"
              textColor="danger"
            />
          </Box>

          <Text variant="caption" color="danger" marginTop="s7" lineHeight={18}>
            {t.pendingSales.errors[sale.failure?.code ?? 'unknown']}
          </Text>

          {/* O texto cru do servidor só aparece quando NÃO soubemos traduzir.
              Mostrá-lo sempre encheria a tela de jargão de banco de dados; não
              mostrá-lo nunca deixaria o dono sem nada para relatar ao suporte
              justamente no caso que ninguém previu. */}
          {sale.failure?.code === 'unknown' && sale.failure.detail ? (
            <Text variant="hint" color="textMuted" marginTop="s4" lineHeight={16}>
              {sale.failure.detail}
            </Text>
          ) : null}

          <Divider />

          {/* Descartar só aparece na venda que FALHOU. Numa venda pendente que
              nunca foi tentada, esse botão seria um jeito de perder dinheiro
              por engano. */}
          <Box marginTop="s4">
            <Button
              title={t.pendingSales.discard.label}
              onPress={onDiscard}
              variant="fantasma"
              height={42}
              textColor="danger"
              textVariant="buttonXs"
            />
          </Box>
        </>
      ) : null}
    </Card>
  );
}

/**
 * O resumo do fim, escolhido pelo BALANÇO e não pela contagem.
 *
 * Sempre começa pelo que deu certo. Quem acabou de lançar 12 vendas e viu 1
 * falhar precisa saber, na primeira palavra, que as outras 11 entraram.
 */
function summarize(summary: SyncSummary, t: Messages): string {
  if (summary.failed === 0) return t.pendingSales.summary.allSynced(summary.synced);
  if (summary.synced === 0) return t.pendingSales.summary.allFailed(summary.failed);
  return t.pendingSales.summary.partial(summary.synced, summary.failed);
}

function tone(summary: SyncSummary): 'neutral' | 'erro' {
  // Erro só quando NADA subiu. Uma sincronização parcial é, sobretudo, um
  // sucesso parcial — e a tela abaixo já está mostrando o que faltou.
  return summary.synced === 0 && summary.failed > 0 ? 'erro' : 'neutral';
}
