import { router } from 'expo-router';

import { Button, Box, Icon, Screen, Text, Touchable } from '@components';
import type { IconName } from '@components';
import { ROUTES, moreItems } from '@domain/navigation/routes';
import { countUnread, useTickets } from '@domain/support';
import { useCapabilities } from '@domain/tenant';
import { goTo } from '@hooks/navigation';
import { useTranslation } from '@i18n';
import { useCartStore } from '@store/cartStore';
import { useSessionStore } from '@store/sessionStore';
import { useUIStore } from '@store/uiStore';

/**
 * "Mais": a grade do que o plano inclui.
 *
 * A grade inteira sai de `itensDoMais(capacidades)` — função pura e testada.
 * A tela não sabe o nome de nenhum módulo; só desenha o que a regra devolveu.
 */
export default function MoreScreen() {
  const t = useTranslation();
  const { capabilities } = useCapabilities();
  const { data: tickets = [] } = useTickets();
  const signOut = useSessionStore((s) => s.signOut);
  const cancelCart = useCartStore((s) => s.cancel);
  const requestConfirm = useUIStore((s) => s.requestConfirm);

  const items = moreItems(capabilities, countUnread(tickets));

  function requestSignOut() {
    requestConfirm({
      title: t.confirms.signOut.title,
      text: t.confirms.signOut.text,
      buttonLabel: t.confirms.signOut.button,
      destructive: true,
      onConfirm: () => {
        // Esvaziar o carrinho junto: uma venda em montagem não pode sobreviver
        // à troca de usuário no mesmo aparelho.
        cancelCart();
        void signOut().then(() => router.replace(ROUTES.login as never));
      },
    });
  }

  return (
    <Screen title="Mais" subtitle="Tudo o que seu plano inclui" showBack={false} padded>
      <Box flexDirection="row" flexWrap="wrap" gap="s12">
        {items.map((item) => (
          <Touchable
            key={item.key}
            accessibilityLabel={`${item.name}. ${item.description}${item.badge ? `. ${item.badge} não lida` : ''}`}
            // `goTo`, e não `push`: Caixa e Custos são ABAS, e empilhar sobre
            // uma aba não funciona. Ver o comentário em `goTo`.
            onPress={() => goTo(item.route)}
            flexBasis="47%"
            flexGrow={1}
            minHeight={118}
            borderRadius="r20"
            borderWidth={1}
            borderColor="line"
            backgroundColor="surface"
            padding="s15"
            justifyContent="space-between"
          >
            <Box
              width={40}
              height={40}
              borderRadius="r13"
              backgroundColor="primarySoft"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name={item.icon as IconName} size={21} color="primary" />
            </Box>

            <Box>
              <Text variant="titleSm">{item.name}</Text>
              <Text variant="hint" color="textMuted" marginTop="s3">
                {item.description}
              </Text>
            </Box>

            {item.badge ? (
              <Box
                position="absolute"
                top={13}
                right={13}
                minWidth={20}
                height={20}
                paddingHorizontal="s6"
                borderRadius="full"
                backgroundColor="danger"
                alignItems="center"
                justifyContent="center"
              >
                <Text variant="badge" color="white">
                  {item.badge}
                </Text>
              </Box>
            ) : null}
          </Touchable>
        ))}
      </Box>

      <Box marginTop="s6">
        <Button
          title="Sair da conta"
          onPress={requestSignOut}
          variant="contorno"
          textColor="danger"
          height={50}
          radius={16}
          textVariant="buttonSm"
        />
      </Box>

      <Text variant="hint" color="textMuted" textAlign="center" paddingTop="s4">
        Aguiar One · versão 1.0
      </Text>
    </Screen>
  );
}
