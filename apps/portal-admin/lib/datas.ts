/**
 * Datas do painel.
 *
 * O protótipo tinha uma data fixa ("24/07/2026") em `lib/mock/data.ts`, porque
 * todo o conjunto de exemplo fora semeado naquele dia. Com dado real isso vira
 * simplesmente "hoje".
 *
 * CUIDADO COM A HIDRATAÇÃO: estas funções leem o relógio, então dão respostas
 * diferentes no servidor e no navegador se cruzarem a virada do dia (ou se os
 * fusos diferirem). Só use dentro de Client Components — em Server Components,
 * formate a data da própria linha do banco, como fazem `lib/clientes.ts` e
 * `lib/chamados.ts`.
 */

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "1 ago 2026" — o carimbo discreto do topo do painel. */
export function todayLabel(language: "pt" | "en" = "pt"): string {
  const d = new Date();
  const month = (language === "pt" ? MONTHS_PT : MONTHS_EN)[d.getMonth()];
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** Mês corrente por extenso, para os títulos das telas ("agosto de 2026"). */
export function currentMonth(language: "pt" | "en" = "pt"): string {
  const d = new Date();
  return language === "pt"
    ? `${d.toLocaleDateString("pt-BR", { month: "long" })} de ${d.getFullYear()}`
    : `${d.toLocaleDateString("en-US", { month: "long" })} ${d.getFullYear()}`;
}

/**
 * `true` quando uma data em dd/mm/aaaa cai no mês corrente. É a forma que
 * `Cliente.data` já chega da camada de leitura — evita ter de arrastar o ISO
 * cru até a interface só por causa de uma contagem.
 */
export function isCurrentMonth(ddmmaaaa: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmaaaa);
  if (!m) return false;
  const today = new Date();
  return Number(m[2]) === today.getMonth() + 1 && Number(m[3]) === today.getFullYear();
}
