import { screen, userEvent } from '@testing-library/react-native';

import { renderUI } from '@components/__tests__/renderUI';
import { CrashScreen } from '@components/patterns/CrashScreen';
import { ptBR } from '@i18n/pt-BR';

/**
 * A TELA DE QUEDA do `ErrorBoundary` de `(app)`.
 *
 * O que importa é que a pessoa nunca fique sem saída depois de um crash: a
 * mensagem aparece como título para o leitor de tela e os dois botões levam
 * cada um ao seu caminho — sem trocar um pelo outro.
 */

const t = ptBR.crash;

it('explains the failure and offers retry and home as separate ways out', async () => {
  const onRetry = jest.fn();
  const onGoHome = jest.fn();
  await renderUI(<CrashScreen onRetry={onRetry} onGoHome={onGoHome} />);

  expect(screen.getByRole('header', { name: t.title })).toBeOnTheScreen();
  expect(screen.getByText(t.text)).toBeOnTheScreen();

  const user = userEvent.setup();
  await user.press(screen.getByText(t.retry));
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(onGoHome).not.toHaveBeenCalled();

  await user.press(screen.getByText(t.goHome));
  expect(onGoHome).toHaveBeenCalledTimes(1);
  expect(onRetry).toHaveBeenCalledTimes(1);
});
