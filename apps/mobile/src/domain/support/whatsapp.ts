/**
 * O CANAL EXTERNO de suporte — WhatsApp.
 *
 * POR QUE EXISTE, e por que fica fora do resto do domínio `support`: o suporte
 * in-app (chamados, mensagens) é um MÓDULO do plano. A tela de bloqueio é
 * justamente para quem NÃO tem o app liberado — mandá-la abrir um chamado
 * interno seria trancar a porta por dentro: a pessoa precisa falar com a gente
 * exatamente para destravar o que a impede de falar com a gente.
 *
 * Daí o canal externo. Tudo aqui é função PURA e testada: montar um link errado
 * manda o cliente para um número que não existe, e isso é invisível em revisão
 * de código.
 */

/**
 * A mensagem que já vai digitada. Primeira pessoa, direta ao ponto — quem
 * recebe do outro lado precisa saber em uma linha o que fazer.
 */
export const UPGRADE_MESSAGE = 'Olá! Quero ativar o aplicativo do Aguiar One para o meu negócio.';

/**
 * Deixa só os dígitos e recusa o que não pode ser telefone.
 *
 * O `wa.me` exige o número em formato internacional SEM `+`, espaço, parêntese
 * ou traço — `wa.me/+55 73 99993-5628` simplesmente não abre conversa nenhuma.
 * Como o valor vem de um campo de texto preenchido à mão no painel admin, ele
 * chega em qualquer formatação.
 *
 * O piso de 10 dígitos é uma peneira grossa contra lixo (string vazia, `"-"`,
 * um número local sem DDI). Não valida país nem operadora de propósito: uma
 * validação esperta demais recusaria um número estrangeiro legítimo no dia em
 * que a plataforma atender fora do Brasil.
 */
export function sanitizePhone(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

/**
 * `https://wa.me/<numero>?text=<mensagem>`.
 *
 * `encodeURIComponent` é obrigatório: a mensagem tem espaços, `!` e acento em
 * "aplicativo do Aguiar One". Sem codificar, o link quebra no primeiro espaço e
 * o WhatsApp abre com o texto pela metade — ou não abre.
 */
export function whatsappLink(phone: string, message = UPGRADE_MESSAGE): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
