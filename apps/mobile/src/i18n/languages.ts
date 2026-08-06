/**
 * The language list, kept in a LEAF module on purpose.
 *
 * `preferencesStore` needs `Language` and `DEFAULT_LANGUAGE`, and
 * `useTranslation` needs `preferencesStore`. If those constants lived in
 * `i18n/index.ts` next to the hook, the two modules would import each other
 * and the cycle would resolve to `undefined` at module-init time — the kind of
 * failure that only shows up in a release build. Importing this file costs
 * nothing and cannot cycle, because it imports nothing itself.
 */

export const LANGUAGES = ['pt-BR', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

/** pt-BR: the app ships to a Brazilian audience. English is opt-in. */
export const DEFAULT_LANGUAGE: Language = 'pt-BR';

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
