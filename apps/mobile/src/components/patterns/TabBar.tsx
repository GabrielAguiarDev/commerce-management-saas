import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@components/ui/Box';
import { Icon, type IconName } from '@components/ui/Icon';
import { Text } from '@components/ui/Text';
import { Touchable } from '@components/ui/Touchable';
import { tabBarItems } from '@domain/navigation/routes';
import { useCapabilities } from '@domain/tenant';
import { goToRoot } from '@hooks/navigation';

/** 88px é a altura do design. A safe area entra POR CIMA, não no lugar dela. */
export const ALTURA_TAB_BAR = 88;

export function TabBar() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { capabilities, loading } = useCapabilities();

  // Enquanto o plano não chegou, todas as capacidades são falsas e o 3º item
  // seria "Custos" mesmo num Plano Completo. Segurar a barra por esse instante
  // é melhor que mostrá-la trocando de rótulo na cara do usuário.
  if (loading) return null;

  const items = tabBarItems(capabilities);

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      backgroundColor="surface"
      borderTopWidth={1}
      borderTopColor="line"
      flexDirection="row"
      alignItems="flex-start"
      paddingTop="s9"
      paddingHorizontal="s8"
      style={{ height: ALTURA_TAB_BAR + insets.bottom, paddingBottom: insets.bottom }}
      accessibilityRole="tablist"
    >
      {items.map((item) => {
        const active = path === item.route;
        return (
          <Touchable
            key={item.key}
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              // As quatro abas ZERAM a pilha, como o `go()` do protótipo.
              goToRoot(item.route);
            }}
            flex={1}
            alignItems="center"
            gap="s5"
            paddingVertical="s6"
          >
            <Icon
              name={item.icon as IconName}
              size={22}
              color={active ? 'primary' : 'textMuted'}
            />
            <Text variant="tabLabel" color={active ? 'primary' : 'textMuted'}>
              {item.label}
            </Text>
          </Touchable>
        );
      })}
    </Box>
  );
}
