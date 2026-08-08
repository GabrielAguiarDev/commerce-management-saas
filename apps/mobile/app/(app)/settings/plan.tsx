import { router } from 'expo-router';

import { Button, Card, TabPane, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { labelModules, useCurrentTenant } from '@domain/tenant';

/** Configurações › Conta e plano. */
export default function PlanTab() {
  const { data: tenant } = useCurrentTenant();

  return (
    <TabPane>
      <Card padding="s18">
        <Text variant="moneyMd">{tenant?.plano.name ?? '—'}</Text>
        <Text variant="caption" color="textMuted" marginTop="s6" lineHeight={19}>
          Módulos ativos: {labelModules(tenant?.modules ?? [])}
        </Text>
        <Text variant="caption" color="textMuted" marginTop="s4">
          {tenant?.plano.renovaEm
            ? `Renova em ${tenant.plano.renovaEm.toLocaleDateString('pt-BR')}`
            : 'Sem data de renovação'}
        </Text>
      </Card>

      <Button
        title="Quero mudar meu plano"
        onPress={() => router.push(ROUTES.support as never)}
        variant="contorno"
        height={52}
        radius={16}
        textVariant="buttonSm"
      />
    </TabPane>
  );
}
