import { usePreferencesStore } from '@store/preferencesStore';

import { en } from './en';
import type { Messages } from './en';
import type { Language } from './languages';
import { ptBR } from './pt-BR';

const CATALOGS: Record<Language, Messages> = {
  'pt-BR': ptBR,
  en,
};

/**
 * The catalog for a language, for code that is NOT a React component —
 * a service, a store action, a test.
 */
export function getMessages(language: Language): Messages {
  return CATALOGS[language];
}

/**
 * The whole catalog for the active language.
 *
 * It returns the object rather than a `t('some.key')` string lookup so that
 * every message is reached through a typed path: `t.errors.cash.cash_closed`
 * either exists or fails to compile. A string-key API would move that check to
 * runtime, and a typo in a key would ship as a blank label.
 *
 * Reading the language through the store subscription is what makes the switch
 * in Settings repaint the app immediately, with no reload.
 */
export function useTranslation(): Messages {
  const language = usePreferencesStore((s) => s.language);
  return CATALOGS[language];
}
