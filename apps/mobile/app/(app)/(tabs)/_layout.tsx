import { Tabs } from 'expo-router/js-tabs';

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
 * POR QUE A BARRA DESTE NAVEGADOR É `null`. A barra que aparece na tela é a
 * `TabBar` do design system, e ela vive um nível ACIMA, como overlay absoluto
 * em `(app)/_layout.tsx`. Tem que ser lá: é o único lugar de onde ela cobre
 * TAMBÉM as telas empilhadas (Estoque, Suporte, Configurações), que é o que o
 * protótipo desenha. Se a barra fosse deste navegador, sumiria assim que
 * qualquer tela fosse empilhada por cima.
 *
 * Consequência: este navegador é puramente estrutural. Ele guarda o estado das
 * abas; quem desenha e quem escuta o toque é a `TabBar`.
 */
export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      tabBar={() => null}
      // `backBehavior` padrão é `firstRoute`, e ele MENTIRIA para o `Screen`:
      // estando em Produtos, o navegador passaria a tratar "voltar" como "ir
      // para Início", `router.canGoBack()` viraria `true` e todo cabeçalho de
      // aba ganharia um botão voltar que o protótipo não tem. `none` deixa o
      // voltar subir para a pilha de fora — que numa aba raiz não tem para
      // onde ir, exatamente como antes destas abas existirem.
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.bg },
        // Sem transição entre abas — é o comportamento do protótipo, e é o que
        // faz a troca ser instantânea de verdade.
        animation: 'none',
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="products" />
      {/* Caixa e Custos: o 3º item da barra é um OU o outro conforme o plano
          (ver `tabBarShortcut`). Os dois moram aqui porque os dois são destino
          de raiz — o que o plano não contratou simplesmente nunca é alcançado,
          e o que ele contratou mas não está na barra continua acessível pela
          grade do "Mais", como aba, sem empilhar. */}
      <Tabs.Screen name="cash" />
      <Tabs.Screen name="costs" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
