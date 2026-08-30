import { isValidEmail } from './sessionRules';
import * as api from './recoveryApi';
import { RecoveryError, mascararEmail, validarCodigo, validarNovaSenha } from './recoveryRules';

/**
 * A RECUPERAÇÃO DE SENHA, em três passos.
 *
 * Este arquivo era uma SIMULAÇÃO com `setTimeout` e um código fixo. Agora fala
 * com o Supabase de verdade: o código sai por e-mail, é conferido no servidor e
 * a senha muda.
 *
 * ┌─ O E-MAIL FICA AQUI DENTRO, E NÃO NA ROTA ─────────────────────────────┐
 * │ O passo 3 precisa saber para quem foi o código, e o expo-router         │
 * │ serializa parâmetro de rota — o endereço inteiro apareceria na URL da   │
 * │ navegação. A tela 2 recebe só a versão MASCARADA, para exibir; o        │
 * │ endereço de verdade mora nesta variável, viva enquanto o app estiver    │
 * │ aberto.                                                                │
 * │                                                                        │
 * │ Se o app for recarregado no meio do fluxo, ela se perde — e é por isso  │
 * │ que existe o erro `expired_flow`, que manda recomeçar do passo 1 em vez │
 * │ de tentar adivinhar. Recomeçar custa um e-mail; adivinhar custaria      │
 * │ trocar a senha da conta errada.                                        │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * NÃO É UMA STORE de propósito: é uma conversa de três telas que termina em si
 * mesma, e estado global sobreviveria a ela sem ninguém para limpá-lo.
 */
let emailEmAndamento: string | null = null;

/**
 * Passo 1 — pede o código. Devolve o e-mail mascarado, que é o que a tela
 * seguinte mostra.
 *
 * UM E-MAIL QUE NÃO EXISTE PASSA IGUAL A UM QUE EXISTE, e isso é deliberado:
 * responder "não temos essa conta" transformaria a tela num verificador de
 * quem é cliente. É a mesma decisão do login (ver `sessionApi.signIn`).
 *
 * Por isso, também, falha de rede aqui NÃO derruba o fluxo: o `catch` engole.
 * Distinguir "não mandei porque o e-mail não existe" de "não mandei porque a
 * rede caiu" é justamente a diferença que não queremos anunciar. Quem não
 * receber nada tem o botão de reenviar na tela seguinte.
 */
export async function pedirCodigo(email: string): Promise<string> {
  if (!isValidEmail(email)) throw new RecoveryError('invalid_email');

  const limpo = email.trim().toLowerCase();
  emailEmAndamento = limpo;

  try {
    await api.sendRecoveryCode(limpo);
  } catch {
    // Silêncio proposital — ver o cabeçalho.
  }

  return mascararEmail(limpo);
}

/** Reenviar é pedir de novo para o mesmo endereço, sem passar pela tela 1. */
export async function reenviarCodigo(): Promise<void> {
  if (!emailEmAndamento) throw new RecoveryError('expired_flow');
  try {
    await api.sendRecoveryCode(emailEmAndamento);
  } catch {
    // Idem.
  }
}

/**
 * Passo 2 — confere o código no servidor.
 *
 * Um código errado e um código VENCIDO chegam com a mesma cara do Supabase, e
 * viram o mesmo `invalid_code`: a mensagem da tela cobre os dois casos, porque
 * a saída para ambos é a mesma — pedir outro.
 */
export async function conferirCodigo(code: string): Promise<void> {
  const invalido = validarCodigo(code);
  if (invalido) throw invalido;

  if (!emailEmAndamento) throw new RecoveryError('expired_flow');

  try {
    await api.verifyRecoveryCode(emailEmAndamento, code);
  } catch (e) {
    throw new RecoveryError(offline(e) ? 'network' : 'invalid_code');
  }
}

/**
 * Passo 3 — grava a senha nova e DERRUBA a sessão.
 *
 * O `signOut` no fim não é excesso de zelo. O passo 2 deixou o aparelho logado
 * (ver `recoveryApi.verifyRecoveryCode`); sem derrubar, a pessoa terminaria a
 * recuperação já dentro do app e nunca digitaria a senha que acabou de criar —
 * que é a única forma de ela descobrir hoje, e não amanhã, que digitou algo de
 * que não vai lembrar.
 *
 * Ele vem DEPOIS da troca, e nunca antes: sem sessão não há a quem trocar a
 * senha.
 */
export async function redefinirSenha(senha: string, confirmacao: string): Promise<void> {
  const invalida = validarNovaSenha(senha, confirmacao);
  if (invalida) throw invalida;

  try {
    await api.updatePassword(senha);
  } catch (e) {
    if (mesmaSenha(e)) throw new RecoveryError('same_password');
    // Sem sessão significa que o passo 2 não aconteceu, ou venceu esperando.
    if (semSessao(e)) throw new RecoveryError('expired_flow');
    throw new RecoveryError('network');
  }

  emailEmAndamento = null;
  await api.discardRecoverySession();
}

/**
 * Desistiu no meio.
 *
 * A tela do código chama isto ao ser abandonada: se o passo 2 já tinha
 * acontecido, existe uma sessão aberta com a senha ANTIGA ainda valendo, e
 * deixá-la de pé transformaria "esqueci minha senha" em "entrei sem ela".
 */
export async function cancelarRecuperacao(): Promise<void> {
  emailEmAndamento = null;
  try {
    await api.discardRecoverySession();
  } catch {
    // Sair é local: se o servidor não respondeu, a sessão vai embora daqui
    // do mesmo jeito.
  }
}

/** O Supabase responde em inglês; estas duas frases mudam a saída da tela. */
const mesmaSenha = (e: unknown) => /should be different/i.test(mensagem(e));
const semSessao = (e: unknown) => /session|logged in|jwt/i.test(mensagem(e));
const offline = (e: unknown) => /network|fetch|timeout/i.test(mensagem(e));
const mensagem = (e: unknown) => (e instanceof Error ? e.message : String(e ?? ''));
