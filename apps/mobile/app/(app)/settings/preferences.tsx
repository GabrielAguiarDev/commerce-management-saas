import { Box, Card, Divider, Switch, TabPane, Text, Touchable } from '@components';
import { LANGUAGES, useTranslation } from '@i18n';
import { PAYMENT_METHODS, usePreferencesStore } from '@store/preferencesStore';

/** Configurações › Preferências. */
export default function PreferencesTab() {
  const t = useTranslation();
  const acceptedMethods = usePreferencesStore((s) => s.acceptedMethods);
  const toggleMethod = usePreferencesStore((s) => s.toggleMethod);
  const darkTheme = usePreferencesStore((s) => s.darkTheme);
  const toggleTheme = usePreferencesStore((s) => s.toggleTheme);
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

  return (
    <TabPane>
      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s6">
          Formas de pagamento aceitas
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
                onToggle={() => toggleMethod(method)}
                label={`Aceitar ${t.paymentMethods[method]}`}
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
                <Text variant="rowLabel" color="primary">
                  ✓
                </Text>
              ) : null}
            </Touchable>
          </Box>
        ))}
      </Card>

      <Card padding="s16" flexDirection="row" alignItems="center" gap="s12">
        <Box flex={1}>
          <Text variant="rowLabel">Tema escuro</Text>
        </Box>
        <Switch on={darkTheme} onToggle={toggleTheme} label="Tema escuro" />
      </Card>
    </TabPane>
  );
}
