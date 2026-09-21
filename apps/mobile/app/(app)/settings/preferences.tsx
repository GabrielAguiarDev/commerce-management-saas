import { Box, Card, Divider, Switch, TabPane, Text, Touchable } from '@components';
import { useSaveAcceptedPaymentMethods } from '@domain/tenant';
import { LANGUAGES, useTranslation } from '@i18n';
import {
  PAYMENT_METHODS,
  activePaymentMethods,
  usePreferencesStore,
  type PaymentMethod,
} from '@store/preferencesStore';
import { useUIStore } from '@store/uiStore';

/** Configurações › Preferências. */
export default function PreferencesTab() {
  const t = useTranslation();
  const acceptedMethods = usePreferencesStore((s) => s.acceptedMethods);
  const savePaymentMethods = useSaveAcceptedPaymentMethods();
  const showToast = useUIStore((s) => s.showToast);
  const darkTheme = usePreferencesStore((s) => s.darkTheme);
  const toggleTheme = usePreferencesStore((s) => s.toggleTheme);
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

  function togglePaymentMethod(method: PaymentMethod) {
    if (savePaymentMethods.isPending) return;

    const next = { ...acceptedMethods, [method]: !acceptedMethods[method] };
    const enabled = activePaymentMethods(next);
    if (enabled.length === 0) {
      showToast(t.toasts.paymentMethodRequired, { tone: 'erro' });
      return;
    }

    savePaymentMethods.mutate(enabled, {
      onSuccess: () => showToast(t.toasts.paymentPreferencesSaved, { tone: 'sucesso' }),
      onError: () => showToast(t.toasts.paymentPreferencesFailed, { tone: 'erro' }),
    });
  }

  return (
    <TabPane>
      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s6">
          {t.settings.preferences.paymentMethods}
        </Text>
        {PAYMENT_METHODS.map((method) => (
          <Box key={method}>
            <Divider />
            <Box flexDirection="row" alignItems="center" gap="s10" paddingVertical="s11">
              <Box flex={1}>
                <Text variant="rowLabel">{t.paymentMethods[method]}</Text>
              </Box>
              <Switch
                on={acceptedMethods[method]}
                onToggle={() => togglePaymentMethod(method)}
                label={t.settings.preferences.accept(t.paymentMethods[method])}
              />
            </Box>
          </Box>
        ))}
      </Card>

      {/*
        Language is a radio list, not a Switch: a toggle only reads as
        "on/off", and with more than two languages it stops working at all.
        Each option is written IN its own language, so someone who landed in
        the wrong one can still find the way back.
      */}
      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s6">
          {t.language.label}
        </Text>
        {LANGUAGES.map((tag) => (
          <Box key={tag}>
            <Divider />
            <Touchable
              accessibilityRole="radio"
              accessibilityState={{ selected: tag === language }}
              accessibilityLabel={t.language.names[tag]}
              onPress={() => setLanguage(tag)}
              flexDirection="row"
              alignItems="center"
              gap="s10"
              paddingVertical="s13"
            >
              <Box flex={1}>
                <Text variant="rowLabel">{t.language.names[tag]}</Text>
              </Box>
              {tag === language ? (
                <Text variant="rowLabel" color="primaryText">
                  ✓
                </Text>
              ) : null}
            </Touchable>
          </Box>
        ))}
      </Card>

      <Card padding="s16" flexDirection="row" alignItems="center" gap="s12">
        <Box flex={1}>
          <Text variant="rowLabel">{t.settings.preferences.darkTheme}</Text>
        </Box>
        <Switch on={darkTheme} onToggle={toggleTheme} label={t.settings.preferences.darkTheme} />
      </Card>
    </TabPane>
  );
}
