import { useState } from 'react';

import {
  Avatar,
  Button,
  Box,
  Field,
  Card,
  Divider,
  Switch,
  Screen,
  Text,
  Touchable,
} from '@components';
import { ROUTES } from '@domain/navigation/routes';
import {
  labelModules,
  useActivities,
  useTeam,
  useSaveBusinessDetails,
  useCurrentTenant,
} from '@domain/tenant';
import { LANGUAGES, useTranslation } from '@i18n';
import { router } from 'expo-router';
import { PAYMENT_METHODS, usePreferencesStore } from '@store/preferencesStore';
import { useUIStore } from '@store/uiStore';

type Tab = 'negocio' | 'prefs' | 'equipe' | 'plano';

const TABS: { key: Tab; label: string }[] = [
  { key: 'negocio', label: 'Negócio' },
  { key: 'prefs', label: 'Preferências' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'plano', label: 'Conta e plano' },
];

export default function SettingsScreen() {
  const [tab, setTab] = useState<Tab>('negocio');

  return (
    <Screen title="Configurações" subtitle="Seu negócio do seu jeito">
      <Box
        flexDirection="row"
        gap="s6"
        backgroundColor="surface2"
        borderRadius="r14"
        padding="s4"
        accessibilityRole="tablist"
      >
        {TABS.map((a) => {
          const isActive = a.key === tab;
          return (
            <Touchable
              key={a.key}
              accessibilityLabel={a.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => setTab(a.key)}
              flex={1}
              height={38}
              borderRadius="r11"
              backgroundColor={isActive ? 'surface' : 'transparent'}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                variant="chipLabel"
                color={isActive ? 'textPrimary' : 'textMuted'}
                numberOfLines={1}
                // As quatro abas não cabem lado a lado em tela pequena; o
                // protótipo rolava na horizontal. Encolher a fonte mantém as
                // quatro visíveis, que é melhor para uma tela de ajustes.
                adjustsFontSizeToFit
              >
                {a.label}
              </Text>
            </Touchable>
          );
        })}
      </Box>

      {tab === 'negocio' ? <BusinessTab /> : null}
      {tab === 'prefs' ? <PreferencesTab /> : null}
      {tab === 'equipe' ? <TeamTab /> : null}
      {tab === 'plano' ? <PlanTab /> : null}
    </Screen>
  );
}

function BusinessTab() {
  const t = useTranslation();
  const { data: tenant } = useCurrentTenant();
  const { mutate: save, isPending } = useSaveBusinessDetails();
  const showToast = useUIStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [filledWith, setFilledWith] = useState<string | null>(null);

  /**
   * O tenant chega DEPOIS do primeiro render (react-query), então
   * `useState(tenant?.nome)` nasceria vazio para sempre.
   *
   * O ajuste é feito DURANTE O RENDER e guardado por id, não num `useEffect`:
   * é o padrão que a documentação do React recomenda para "estado derivado de
   * prop que mudou" e evita o render extra com o campo em branco. Com effect,
   * o usuário vê o formulário vazio por um frame — e se estiver digitando
   * quando a query revalidar, perde o que digitou.
   */
  if (tenant && filledWith !== tenant.id) {
    setFilledWith(tenant.id);
    setName(tenant.name);
    setPhone(tenant.phone ?? '');
  }

  return (
    <Card padding="s18" gap="s14">
      <Field label="Nome do negócio" value={name} onChangeText={setName} height={48} radius={13} />
      <Field
        label="Telefone / WhatsApp"
        value={phone}
        onChangeText={setPhone}
        height={48}
        radius={13}
        keyboardType="phone-pad"
      />
      <Button
        title="Salvar"
        onPress={() =>
          save(
            { name, phone },
            { onSuccess: () => showToast(t.toasts.businessSaved) },
          )
        }
        height={50}
        radius={14}
        textVariant="buttonSm"
        loading={isPending}
      />
    </Card>
  );
}

function PreferencesTab() {
  const t = useTranslation();
  const acceptedMethods = usePreferencesStore((s) => s.acceptedMethods);
  const toggleMethod = usePreferencesStore((s) => s.toggleMethod);
  const darkTheme = usePreferencesStore((s) => s.darkTheme);
  const toggleTheme = usePreferencesStore((s) => s.toggleTheme);
  const language = usePreferencesStore((s) => s.language);
  const setLanguage = usePreferencesStore((s) => s.setLanguage);

  return (
    <>
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
    </>
  );
}

function TeamTab() {
  const { data: team = [] } = useTeam();
  const { data: activities = [] } = useActivities();

  return (
    <>
      {team.map((member) => (
        <Box
          key={member.id}
          backgroundColor="surface"
          borderColor="line"
          borderWidth={1}
          borderRadius="r18"
          padding="s14"
          flexDirection="row"
          alignItems="center"
          gap="s12"
        >
          <Avatar initials={member.initials} />
          <Box flex={1}>
            <Text variant="titleXs">{member.name}</Text>
            <Text variant="captionSm" color="textMuted" marginTop="s2">
              {member.papel}
            </Text>
          </Box>
          <Text variant="hint" color="textMuted">
            {member.acesso}
          </Text>
        </Box>
      ))}

      <Card paddingVertical="s6" paddingHorizontal="s16">
        <Text variant="sectionTitle" paddingTop="s13" paddingBottom="s6">
          Quem fez o quê
        </Text>
        {activities.map((a) => (
          <Box key={a.id}>
            <Divider />
            <Box paddingVertical="s11">
              <Text variant="rowText">{a.text}</Text>
              <Text variant="hint" color="textMuted" marginTop="s3">
                {a.quando}
              </Text>
            </Box>
          </Box>
        ))}
      </Card>
    </>
  );
}

function PlanTab() {
  const { data: tenant } = useCurrentTenant();

  return (
    <>
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
    </>
  );
}
