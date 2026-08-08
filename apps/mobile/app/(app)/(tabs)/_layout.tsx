import { Tabs } from 'expo-router/js-tabs';

import { Box, NewSaleButton, TabBar } from '@components';
import { useAppTheme } from '@hooks/useAppTheme';

/** Início é a aba de partida — o redirect de entrada cai nela. */
export const unstable_settings = { anchor: 'home' };

/**
 * AS ABAS — e por que elas existem agora.
 *
 * Antes, as cinco raízes eram telas de uma `Stack` e a tab bar trocava entre
 * elas com `dismissAll` + `replace`. Funcionava, mas `replace` DESMONTA a tela
 * que sai: voltar para Início remontava a tela, refazia o render inteiro e
 * perdia posição de rolagem e estado de busca. Era isso que fazia a troca de
 * aba parecer um recarregamento.
 *
 * Um `Tabs` de verdade resolve na raiz: cada aba é montada na primeira visita e
 * PERMANECE montada. Trocar de aba vira um `jumpTo` — sem desmontar, sem
 * remontar, sem refetch. Instantâneo, e com a rolagem onde o usuário deixou.
 *
 * `freezeOnBlur` mantém as inativas montadas mas SUSPENSAS: elas não
 * re-renderizam de fundo, então cinco abas montadas não custam cinco telas
 * trabalhando.
 *
 * AQUI MORA A TAB BAR — e este é o limite exato de onde ela aparece.
 *
 * Ela já morou um nível acima, como overlay absoluto em `(app)/_layout.tsx`.
 * Dali ela cobria a pilha inteira, e o efeito era que Configurações, Suporte e
 * Vender — telas INTERNAS, de detalhe — apareciam com a barra de navegação
 * principal embaixo, como se fossem destinos de topo. Vender era o pior caso:
 * a grade de produtos perdia 88px de altura para uma barra que ela não usa.
 *
 * Descendo para cá, a barra passa a pertencer à tela `(tabs)`. Qualquer push da
 * pilha de fora sobe POR CIMA dela e a cobre, sem nenhuma lógica de "mostrar ou
 * não" espalhada por tela — a estrutura da navegação é que responde.
 *
 * Ela continua sendo um overlay ABSOLUTO (irmã do `<Tabs>` dentro deste `Box`),
 * e não a `tabBar` do navegador, por dois motivos: o desenho pede a barra
 * flutuando sobre o conteúdo rolável, e o botão Vender precisa transbordar para
 * fora dela. `tabBar={() => null}` segue sendo o certo — este navegador não
 * desenha barra nenhuma.
 *
 * E ela não pisca ao trocar de aba: este layout monta uma vez, quando o
 * guardião libera, e trocar de aba não o remonta.
 *
 * Consequência: o navegador é puramente estrutural. Ele guarda o estado das
 * abas; quem desenha e quem escuta o toque é a `TabBar`.
 */
export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <Box flex={1} backgroundColor="bg">
      <Tabs
        tabBar={() => null}
        // `backBehavior` padrão é `firstRoute`, e ele MENTIRIA para o `Screen`:
        // estando em Produtos, o navegador passaria a tratar "voltar" como "ir
        // para Início", `router.canGoBack()` viraria `true` e todo cabeçalho de
        // aba ganharia um botão voltar que o protótipo não tem. `none` deixa o
        // voltar subir para a pilha de fora — que numa aba raiz não tem para
        // onde ir, exatamente como antes destas abas existirem.
        //
        // É também o que faz o botão voltar aparecer SÓ nas telas internas: nas
        // abas `canGoBack()` é `false`, na pilha de fora é `true`.
        backBehavior="none"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: theme.colors.bg },
          // Sem transição entre abas — é o comportamento do protótipo, e é o
          // que faz a troca ser instantânea de verdade.
          animation: 'none',
          freezeOnBlur: true,
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="products" />
        {/* Caixa e Custos: o 3º item da barra é um OU o outro conforme o plano
            (ver `tabBarShortcut`). Os dois moram aqui porque os dois são
            destino de raiz — o que o plano não contratou simplesmente nunca é
            alcançado, e o que ele contratou mas não está na barra continua
            acessível pela grade do "Mais", como aba, sem empilhar. */}
        <Tabs.Screen name="cash" />
        <Tabs.Screen name="costs" />
        <Tabs.Screen name="more" />
      </Tabs>

      {/* A barra e o botão Vender, sobrepostos às abas e SÓ a elas. O botão vem
          depois para ficar por cima do vão de 84px que a barra reserva. */}
      <TabBar />
      <NewSaleButton />
    </Box>
  );
}
