import { Avatar, Box, Card, Divider, TabPane, Text } from '@components';
import { useActivities, useTeam } from '@domain/tenant';

/** Configurações › Equipe. */
export default function TeamTab() {
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
    </TabPane>
  );
}
