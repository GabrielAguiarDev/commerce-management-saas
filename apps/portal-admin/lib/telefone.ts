/**
 * O telefone de WhatsApp da plataforma: como aceitar, como guardar, como mostrar.
 *
 * São duas formas do mesmo número, e confundir uma com a outra quebra coisas
 * diferentes:
 *
 * - A GUARDADA — internacional, só dígitos ("5573999935628"). É a que o app
 *   mobile lê (`platform_whatsapp_contact()`) para montar `https://wa.me/...`,
 *   e o `wa.me` não abre conversa nenhuma com parêntese, traço ou `+` no meio.
 * - A EXIBIDA — "+55 (73) 99999-5628". Ninguém confere treze dígitos colados
 *   para saber se o número do suporte está certo.
 *
 * Tudo aqui é função pura, sem `server-only`: a Server Action normaliza o que
 * foi digitado e a tela formata o que voltou do banco, e as duas precisam
 * concordar sobre o que é um número válido.
 */

/** DDI do Brasil. Único país atendido hoje — ver a nota em `normalizeWhatsapp`. */
const BRAZIL_CODE = "55";

/** DDD (2) + celular com o nono dígito (9). */
const NATIONAL_DIGITS = 11;

export type NormalizedPhone = { ok: true; value: string } | { ok: false; message: string };

/**
 * Passa de qualquer formatação comum para a forma guardada.
 *
 * Aceita "(73) 99999-5628", "73 99999-5628", "73999935628", "+55 73 99999-5628"
 * e "5573999935628" — todos viram "5573999935628".
 *
 * O DDI só é retirado quando sobram 12 ou 13 dígitos, e não sempre que o número
 * começa com "55": **55 também é o DDD de Santa Maria (RS)**. Um "5599999XXXX"
 * de onze dígitos é um número de lá, não um número já internacionalizado — cortar
 * o prefixo pelo texto, e não pelo comprimento, mandaria o suporte para um
 * telefone inexistente.
 */
export function normalizeWhatsapp(raw: unknown): NormalizedPhone {
  const digits = String(raw ?? "").replace(/\D/g, "");

  if (!digits) {
    return { ok: false, message: "Informe o número de WhatsApp." };
  }

  // "0" de operadora ("073 9...") e o DDI, quando vierem. O que resta é sempre
  // a forma nacional: DDD + número.
  const withoutTrunk = digits.replace(/^0+/, "");
  const national =
    withoutTrunk.length > NATIONAL_DIGITS && withoutTrunk.startsWith(BRAZIL_CODE)
      ? withoutTrunk.slice(BRAZIL_CODE.length)
      : withoutTrunk;

  if (national.length !== NATIONAL_DIGITS) {
    return {
      ok: false,
      message: "Número inválido. Informe DDD + celular com 9 dígitos — ex.: (73) 99999-5628.",
    };
  }

  // Não existe DDD começando em 0 ou 1: a menor faixa em uso é 11 (São Paulo).
  if (Number(national.slice(0, 2)) < 11) {
    return { ok: false, message: "DDD inválido. Informe o DDD com 2 dígitos — ex.: (73)." };
  }

  // Todo celular brasileiro começa com 9 depois do DDD. Sem esta conferência,
  // um fixo de oito dígitos digitado com um dígito a mais passaria batido — e o
  // erro só apareceria para o cliente, no link de contato que não abre.
  if (national[2] !== "9") {
    return { ok: false, message: "Informe um celular: o número deve começar com 9 após o DDD." };
  }

  return { ok: true, value: BRAZIL_CODE + national };
}

/**
 * Forma legível do que está guardado.
 *
 * Devolve o valor cru quando ele não tem o formato esperado (uma chave gravada
 * à mão no banco, por exemplo). Mostrar o que existe é mais útil do que esconder
 * atrás de um traço: assim o admin enxerga o valor errado e o corrige.
 */
export function formatWhatsapp(stored: string): string {
  const digits = String(stored ?? "").replace(/\D/g, "");
  if (!digits) return "—";

  if (digits.length !== BRAZIL_CODE.length + NATIONAL_DIGITS || !digits.startsWith(BRAZIL_CODE)) {
    return stored;
  }

  const ddd = digits.slice(2, 4);
  const first = digits.slice(4, 9);
  const last = digits.slice(9);
  return `+${BRAZIL_CODE} (${ddd}) ${first}-${last}`;
}
