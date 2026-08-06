/**
 * Money in Aguiar One is ALWAYS an integer number of cents.
 *
 * Reason: `0.1 + 0.2 !== 0.3`. A 30-item cart summed in reais as a float
 * accumulates error and the on-screen total stops matching the receipt total.
 * Conversion to reais happens only at formatting time, once, at the end.
 *
 * The prototype formatted with `Number(n).toFixed(2).replace('.', ',')`, with
 * no thousands separator — `R$ 28460,00`. The BRIEF asks for `R$ 1.234,56`,
 * which is the correct pt-BR form and what the app's larger values need in
 * order to stay readable. It kept the thousands separator; this is the only
 * deliberate deviation from the prototype in currency formatting.
 *
 * Note: BRL formatting does not follow the UI language. The currency is a
 * property of the business, not of the reader — a user switching the app to
 * English still sells in reais.
 */

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/** `123456` → `"R$ 1.234,56"`. */
export function formatBRL(cents: number): string {
  return `R$ ${formatAmount(cents)}`;
}

/** Same as `formatBRL`, but without the prefix — for input fields. */
export function formatAmount(cents: number): string {
  const n = Math.round(Number.isFinite(cents) ? cents : 0);
  const isNegative = n < 0;
  const abs = Math.abs(n);
  const whole = String(Math.floor(abs / 100)).replace(THOUSANDS, '.');
  const fraction = String(abs % 100).padStart(2, '0');
  return `${isNegative ? '-' : ''}${whole},${fraction}`;
}

/**
 * Signed with the design's typographic minus (`−`, U+2212, not the ASCII
 * hyphen). Used in the cash close-out difference and in stock movements.
 */
export function formatSignedBRL(cents: number): string {
  const sign = cents >= 0 ? '+' : '−';
  return `${sign}${formatBRL(Math.abs(cents))}`;
}

/**
 * Reads what the user typed into a money field and returns cents.
 *
 * Rules, in this order:
 *  - anything that is not a digit, comma or dot is discarded (`R$`, spaces);
 *  - if there is a comma, it is THE decimal separator and dots are thousands
 *    (`1.234,56` → 123456);
 *  - if there is only a dot, it is decimal only when it separates 1 or 2
 *    digits at the end (`12.5` → 1250); otherwise it is a thousands separator
 *    (`1.234` → 123400). This interpretation gets it right both for someone
 *    typing the Brazilian way and for someone pasting a value from a numeric
 *    keypad.
 *
 * Returns `null` for empty input or input with no digits at all — the caller
 * decides whether that is an error or "field not filled in". Never returns
 * `NaN`.
 */
export function parseCents(input: string): number | null {
  const cleaned = String(input ?? '').replace(/[^\d.,-]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const isNegative = cleaned.trimStart().startsWith('-');
  const unsigned = cleaned.replace(/-/g, '');

  let whole: string;
  let fraction: string;

  if (unsigned.includes(',')) {
    const parts = unsigned.split(',');
    fraction = parts.pop() ?? '';
    whole = parts.join('').replace(/\./g, '');
  } else {
    const dots = unsigned.split('.');
    const last = dots.length > 1 ? (dots[dots.length - 1] ?? '') : '';
    if (dots.length > 1 && last.length > 0 && last.length <= 2) {
      fraction = last;
      whole = dots.slice(0, -1).join('');
    } else {
      fraction = '';
      whole = dots.join('');
    }
  }

  const cents =
    Number(whole.replace(/\D/g, '') || '0') * 100 +
    Number(fraction.replace(/\D/g, '').slice(0, 2).padEnd(2, '0') || '0');

  return isNegative ? -cents : cents;
}

/** Decimal reais coming from an API (`189.9`) → cents (`18990`). */
export function realToCents(real: number): number {
  return Math.round(real * 100);
}
