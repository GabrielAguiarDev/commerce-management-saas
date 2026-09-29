import { ThemeProvider } from '@shopify/restyle';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { SheetVisibilityProvider } from '@components/patterns/sheetContext';
import { deriveCapabilities } from '@domain/tenant/tenantAdapter';
import type { Capabilities, ChaveModulo } from '@domain/tenant/tenantTypes';
import { lightTheme } from '@theme';

/**
 * A ÁRVORE MÍNIMA em que um componente deste app consegue renderizar.
 *
 * Não é o `AppProviders`: aquele é a composição do app de verdade (gesto,
 * toast, sheet, sessão) e arrastá-lo para cá faria cada teste de componente
 * depender da montagem inteira. Aqui ficam só os dois contextos sem os quais
 * QUALQUER componente do design system explode:
 *
 *  - `ThemeProvider`, porque `Box`, `Text` e `Touchable` são do restyle e leem
 *    os tokens do contexto;
 *  - `QueryClientProvider`, porque vários componentes chamam um `useCases/` que
 *    é react-query por dentro — mesmo quando o teste dubla o hook, um irmão na
 *    árvore pode não estar dublado.
 *
 * Tema CLARO fixo, de propósito: a aparência não é o que esta suíte verifica, e
 * um tema que variasse por teste tornaria uma falha de cor indistinguível de
 * uma falha de lógica.
 *
 * ⚠️ É `async`, e o `await` não é opcional: no RNTL 14 o próprio `render` é
 * assíncrono (ele embrulha a montagem num `act`). Sem esperar, `screen` ainda
 * não está ligado ao resultado e a primeira busca falha com "`render` function
 * has not been called" — que parece um erro de configuração e não é.
 */
export async function renderUI(ui: ReactElement) {
  return render(ui, { wrapper: Providers });
}

function Providers({ children }: { children: ReactNode }) {
  // Um client por render: `retry: false` para um erro dublado falhar na hora, e
  // `gcTime: Infinity` porque nenhum teste daqui vive o suficiente para a
  // coleta importar — e um timer pendente deixa o Jest reclamando de handle
  // aberto depois que o teste passou.
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={lightTheme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Um BOTTOM SHEET, montado como o `SheetHost` o monta.
 *
 * O `SheetVisibilityProvider` não é conveniência de teste: sem ele
 * `useSheetVisibility` LANÇA, porque um sheet do produto só existe dentro do
 * host (é o host que sabe quando apresentar e quando desmontar, e a lib é
 * imperativa). O valor é o mesmo que ele passa com o sheet aberto.
 *
 * Renderizar o `SheetHost` de verdade seria ainda mais fiel, e foi descartado:
 * ele importa os OITO sheets do app, então cada teste de um sheet passaria a
 * carregar — e a ter de dublar — as dependências dos outros sete.
 */
export async function renderSheet(ui: ReactElement) {
  return renderUI(
    <SheetVisibilityProvider value={{ open: true, onClosed: () => {} }}>
      {ui}
    </SheetVisibilityProvider>,
  );
}

/**
 * As capacidades do teste, montadas pela MESMA derivação da produção.
 *
 * O teste diz o plano no vocabulário do banco (`['app', 'cash']`) e o papel, e
 * `deriveCapabilities` responde o resto. Escrever as oito flags à mão seria
 * mais curto e valeria menos: um teste com `hasCash: true` num plano que não
 * tem o módulo passaria descrevendo um estado que o app nunca produz — e a
 * regra de que suporte acompanha o acesso, ou de que o papel corta o módulo,
 * ficaria de fora.
 */
export function capabilities(
  modules: readonly ChaveModulo[],
  { rolePermissions = [], isOwner = true }: { rolePermissions?: readonly string[]; isOwner?: boolean } = {},
): Capabilities {
  return deriveCapabilities(modules, rolePermissions, isOwner);
}
