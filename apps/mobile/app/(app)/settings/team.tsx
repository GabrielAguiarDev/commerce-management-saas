import { Avatar, Box, Card, Divider, TabPane, Text } from '@components';
import { useActivities, useTeam } from '@domain/tenant';
import { useTranslation } from '@i18n';

/** Configurações › Equipe. */
export default function TeamTab() {
  const t = useTranslation();
  const { data: team = [] } = useTeam();
  const { data: activities = [] } = useActivities();

  return (
    <TabPane>
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
          {t.settings.team.activity}
        </Text>
        {activities.length === 0 && (
          <Box paddingVertical="s11">
            <Text variant="hint" color="textMuted">
              {t.activity.empty}
            </Text>
          </Box>
        )}

        {activities.map((a) => (
          <Box key={a.id}>
            <Divider />
            <Box paddingVertical="s11">
              {/* A chave crua quando o rótulo não existe: o portal pode gravar
                  uma ação que este app ainda não conhece, e esconder a linha
                  seria pior do que mostrá-la feia. */}
              <Text variant="rowText">{t.activity.actions[a.action] ?? a.action}</Text>
              {a.detalhe !== '' && (
                <Text variant="captionSm" color="textMuted" marginTop="s2">
                  {a.detalhe}
                </Text>
              )}
              <Text variant="hint" color="textMuted" marginTop="s3">
                {a.autor} · {a.quando}
              </Text>
            </Box>
          </Box>
        ))}
      </Card>
    </TabPane>
  );
}
