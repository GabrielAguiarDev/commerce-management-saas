import { router } from 'expo-router';

import { Button, Card, TabPane, Text } from '@components';
import { ROUTES } from '@domain/navigation/routes';
import { labelModules, useCurrentTenant } from '@domain/tenant';
import { useTranslation } from '@i18n';
import { usePreferencesStore } from '@store/preferencesStore';

/** Configurações › Conta e plano. */
export default function PlanTab() {
  const { data: tenant } = useCurrentTenant();
  const t = useTranslation();
  const language = usePreferencesStore((s) => s.language);

  return (
    <TabPane>
      <Card padding="s18">
        <Text variant="moneyMd">{tenant?.plano.name ?? '—'}</Text>
        <Text variant="caption" color="textMuted" marginTop="s6" lineHeight={19}>
          {t.settings.plan.activeModules(labelModules(tenant?.modules ?? [], t))}
        </Text>
        <Text variant="caption" color="textMuted" marginTop="s4">
          {tenant?.plano.renovaEm
            ? t.settings.plan.renewsOn(tenant.plano.renovaEm.toLocaleDateString(language))
            : t.settings.plan.noRenewal}
        </Text>
      </Card>

      <Button
        title={t.settings.plan.changePlan}
        onPress={() => router.push(ROUTES.support as never)}
        variant="contorno"
        height={52}
        radius={16}
        textVariant="buttonSm"
      />
    </TabPane>
  );
}
