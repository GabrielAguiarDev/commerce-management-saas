import { TopTabs } from 'expo-router/js-top-tabs';
import { StyleSheet } from 'react-native';

import { Screen } from '@components';
import { useAppTheme } from '@hooks/useAppTheme';
import { fontFamily } from '@theme';

/**
 * AS ABAS SUPERIORES DE CONFIGURAÇÕES.
 *
 * Antes as quatro seções eram BOTÕES que trocavam `useState` — sem deslizar,
 * sem indicador, e com as quatro seções desmontando a cada toque. Agora são um
 * NAVEGADOR de verdade: cada seção é uma rota (`/settings`,
 * `/settings/preferences`, …), o gesto horizontal troca de aba, o indicador
 * desliza junto com o dedo e cada aba guarda a própria rolagem.
 *
 * `expo-router/js-top-tabs` é o Material Top Tabs do react-navigation que o
 * expo-router já EMBARCA — o mesmo caminho de `expo-router/js-tabs`, usado pela
 * barra de baixo. Não instalamos `@react-navigation/material-top-tabs`: ele
 * vem vendorizado. O que precisou entrar no `package.json` foram os dois peers
 * de runtime que ele carrega por `require` dinâmico — `react-native-tab-view` e
 * `react-native-pager-view` (este é NATIVO: exige rebuild do dev client, não
 * basta recarregar o bundle).
 *
 * ISTO NÃO É A TAB BAR DE BAIXO. Configurações continua sendo tela INTERNA da
 * pilha de `(app)`: entra empilhada, cobre a barra principal e volta pelo botão
 * do header que o `Screen` desenha. Estas abas são a sub-navegação de DENTRO
 * dela — por isso vivem aqui, sob o `Screen`, e não no layout de `(tabs)`.
 */
export default function SettingsLayout() {
  const theme = useAppTheme();

  return (
    <Screen title="Configurações" subtitle="Seu negócio do seu jeito" noScroll>
      <TopTabs
        // Mesma razão do navegador de abas de baixo (ver `(tabs)/_layout.tsx`):
        // com o padrão `firstRoute`, o voltar do Android andaria PARA TRÁS pelas
        // abas antes de sair de Configurações. `none` deixa o voltar subir
        // direto para a pilha, que é de onde o usuário veio.
        backBehavior="none"
        screenOptions={{
          // "Conta e plano" e "Preferências" não cabem lado a lado em tela de
          // 375pt. Rolar na horizontal é o que o design pedia e o que o
          // `adjustsFontSizeToFit` do botão antigo mascarava encolhendo a fonte.
          tabBarScrollEnabled: true,

          // OBRIGATÓRIO junto de `tabBarScrollEnabled`: sem `width: 'auto'` a
          // biblioteca dá a CADA aba 40% da largura da tela (`layout.width/5*2`)
          // em vez de medi-la pelo texto — quatro abas viram uma régua de duas
          // telas de comprimento.
          tabBarItemStyle: { width: 'auto', paddingHorizontal: 14 },

          // O GUTTER DA BARRA, no content container e não na raiz da tela.
          //
          // A barra é um ScrollView horizontal por dentro. Com o padding no
          // container raiz do `Screen`, ela era recortada 16px antes da borda
          // do aparelho: "Conta e plano" sumia numa faixa morta em vez de
          // deslizar até o fim da tela, e o fio de baixo virava um traço solto
          // no meio da tela em vez de atravessá-la.
          //
          // Aqui o padding vai para DENTRO da rolagem: a primeira aba nasce no
          // mesmo prumo dos cartões de baixo, e a última desliza até a borda de
          // verdade. Ver `padding-layout.md`.
          //
          // Só `paddingHorizontal` — nunca `paddingLeft`/`Right` separados: a
          // biblioteca troca a ordem de `paddingStart`/`paddingEnd` num dos dois
          // pontos onde calcula a largura da aba, e com padding assimétrico o
          // indicador sairia do lugar.
          tabBarContentContainerStyle: { paddingHorizontal: theme.spacing.screen },

          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary, height: 2 },
          tabBarLabelStyle: {
            fontFamily: fontFamily.bold,
            fontSize: 13,
            // O padrão do Material é MAIÚSCULAS. O app não grita em lugar
            // nenhum — nem a barra de baixo, nem os títulos de seção.
            textTransform: 'none',
          },
          tabBarPressColor: theme.colors.primarySoft,

          // A barra vem do Material com fundo azul, elevação e sombra. Aqui ela
          // é só o fundo da tela com um fio embaixo, que é o que separa as abas
          // do conteúdo sem desenhar uma caixa.
          tabBarStyle: {
            backgroundColor: theme.colors.bg,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.line,
          },
          sceneStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        {/* A ORDEM das abas é a ordem destas linhas. `title` é o rótulo. */}
        <TopTabs.Screen name="index" options={{ title: 'Negócio' }} />
        <TopTabs.Screen name="preferences" options={{ title: 'Preferências' }} />
        <TopTabs.Screen name="team" options={{ title: 'Equipe' }} />
        <TopTabs.Screen name="plan" options={{ title: 'Conta e plano' }} />
      </TopTabs>
    </Screen>
  );
}
