/**
 * As réguas de tempo das consultas ao Supabase.
 *
 * Ficam juntas porque um recorte de data errado não quebra o app — ele apenas
 * mostra o número errado, com toda a confiança do mundo. Um "vendas de hoje"
 * que comece à meia-noite UTC mostraria as vendas da madrugada seguinte para
 * quem vende no Brasil, e esconderia as do fim da tarde.
 *
 * REGRA: "hoje" é o dia do RELÓGIO DO APARELHO, não do servidor. Quem lê a
 * tela está atrás do balcão; o dia dele é o dia dali. As colunas `timestamptz`
 * (`sold_at`, `created_at`) são comparadas com um instante ISO absoluto — o
 * fuso vai embutido nele, então a comparação é correta em qualquer fuso.
 */

const MS_DAY = 86_400_000;

/** Meia-noite de hoje, no fuso do aparelho. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Meia-noite de hoje como ISO absoluto — para `.gte('sold_at', …)`. */
export function startOfTodayISO(): string {
  return startOfToday().toISOString();
}

/** Meia-noite de N dias atrás, como ISO absoluto. */
export function daysAgoISO(days: number): string {
  return new Date(startOfToday().getTime() - days * MS_DAY).toISOString();
}

/**
 * `YYYY-MM-DD` no fuso local, para colunas `date` puras (`costs.cost_date`).
 *
 * NÃO usa `toISOString().slice(0, 10)`: isso converte para UTC antes de cortar,
 * e às 21h de Brasília já devolveria a data de amanhã. Um custo lançado à noite
 * cairia no dia seguinte e sumiria do fechamento do mês certo.
 */
export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** `YYYY-MM-DD` de hoje, no fuso local. */
export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

/** `YYYY-MM-DD` de N dias atrás, no fuso local. */
export function daysAgoDateOnly(days: number): string {
  return toDateOnly(new Date(startOfToday().getTime() - days * MS_DAY));
}

/** Dias completos entre uma data e hoje. `0` = hoje, `1` = ontem. */
export function daysSince(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((startOfToday().getTime() - d.getTime()) / MS_DAY));
}

/**
 * A DATA DIGITADA — `dd/mm/aaaa`.
 *
 * O formato não segue o idioma da interface, e é a mesma decisão do `formatBRL`
 * em `utils/money`: quem digita está no Brasil, o dia vem antes do mês, e um
 * app que troca a ordem dos campos ao mudar o idioma faz o usuário lançar 03/08
 * onde queria 08/03. Se um dia entrar mercado com outra convenção, este é o
 * lugar de decidir por locale.
 *
 * A máscara aceita só dígito e insere as barras. Colar "13082026" funciona.
 */
export function maskDayInput(text: string): string {
  const digits = String(text ?? '').replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter((p) => p.length > 0).join('/');
}

/**
 * `dd/mm/aaaa` → meia-noite LOCAL daquele dia. `null` se não for data.
 *
 * Valida de verdade: 31/02 não vira 03/03. O `Date` do JS estoura a data
 * inválida para o mês seguinte sem reclamar, então a checagem é conferir se o
 * que voltou é o mesmo dia/mês/ano que entrou. Sem isso, "31/02/2026" filtraria
 * silenciosamente por 3 de março.
 *
 * Ano com dois dígitos é recusado em vez de adivinhado: "13/08/26" pode ser
 * 1926 tanto quanto 2026, e chutar num filtro de faturamento é devolver um
 * período errado com cara de certo.
 */
export function parseDayInput(text: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(text ?? '').trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);

  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return valid ? date : null;
}

/** `Date` → `dd/mm/aaaa`, o caminho de volta do campo. */
export function formatDayInput(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

/**
 * "agora", "há 2 h", "ontem", "há 3 d" — o rótulo relativo que as listas usam.
 *
 * Fica aqui, e não no adapter de cada domínio, porque três domínios (estoque,
 * suporte, atividades) mostram a mesma coisa e já divergiram uma vez.
 */
export function relativeLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';

  const minutes = Math.floor((Date.now() - t) / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = daysSince(iso);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} d`;

  const months = Math.floor(days / 30);
  return months === 1 ? 'há 1 mês' : `há ${months} meses`;
}
