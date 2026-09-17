import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  PAYMENT_METHODS as DB_PAYMENT_METHODS,
  type DbPaymentMethod,
} from '@domain/shared/dbEnums';
import type { Language } from '@i18n/languages';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from '@i18n/languages';
import { STORAGE_KEYS } from '@services/storageAdapter';

/**
 * The payment methods the business accepts.
 *
 * Not screen decoration: whatever is enabled here is what shows up in the
 * cart's selector. Turning off "credit card" in Preferences removes the option
 * when closing a sale — this is the link the prototype establishes between the
 * two screens (`formasAceitas`, line 1094).
 *
 * These are KEYS, not labels. They used to be the pt-BR display strings
 * themselves ('Dinheiro', 'Cartão de débito'), which meant the persisted
 * preference and the sale record both carried Portuguese copy — untranslatable,
 * and it would break the moment the copy was reworded. The visible label now
 * lives in the locale files under `paymentMethods.*`.
 *
 * ⚠️ THE LIST IS RE-EXPORTED FROM `dbEnums`, NOT DECLARED HERE. It used to be
 * declared, with `debit_card`/`credit_card`, while the web portal wrote
 * `debit`/`credit` into THE SAME COLUMN. The key picked here travels
 * untouched into `sales.payment_method` (CartSheet → checkoutSale → adapter),
 * so the portal read every card sale made on the phone as CASH — its
 * `paymentFromDb` falls back to `'cash'` for anything it does not recognise.
 * The sale then counted towards the money expected in the till, and the
 * register closed short every single day.
 *
 * Re-exporting is what makes that impossible to reintroduce: there is now one
 * list, and it is the one the database is about to enforce with a CHECK.
 */
export const PAYMENT_METHODS = DB_PAYMENT_METHODS;

export type PaymentMethod = DbPaymentMethod;

/**
 * What a payload written by an older build calls each card method.
 *
 * Dropping this would silently re-enable a method the shop had turned off:
 * `merge` would find no `debit` key, fall back to the default `true`, and put
 * "Cartão de débito" back in the cart selector of a business that does not
 * accept it.
 */
const LEGACY_METHOD: Record<string, PaymentMethod> = {
  debit_card: 'debit',
  credit_card: 'credit',
};

interface PreferencesState {
  darkTheme: boolean;
  language: Language;
  acceptedMethods: Record<PaymentMethod, boolean>;
  hydrated: boolean;

  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  toggleMethod: (method: PaymentMethod) => void;
  setAcceptedMethods: (methods: readonly PaymentMethod[]) => void;
}

const ALL_ACCEPTED = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, true])) as Record<
  PaymentMethod,
  boolean
>;

/** Reads a stored map under either spelling, keeping what the shop chose. */
function acceptedFromPersisted(stored: Partial<Record<string, boolean>> | undefined) {
  const out = { ...ALL_ACCEPTED };
  for (const [key, enabled] of Object.entries(stored ?? {})) {
    const method = LEGACY_METHOD[key] ?? (key as PaymentMethod);
    if (method in out && typeof enabled === 'boolean') out[method] = enabled;
  }
  return out;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Light by default, like the prototype. The theme is the user's choice in
      // Preferences, not the system mode — see DEVELOPMENT.md › Decisions.
      darkTheme: false,
      // pt-BR by default: the app ships to a Brazilian audience, and a user who
      // never opens Preferences should never see English.
      language: DEFAULT_LANGUAGE,
      acceptedMethods: ALL_ACCEPTED,
      hydrated: false,

      toggleTheme: () => set((s) => ({ darkTheme: !s.darkTheme })),

      setLanguage: (language) => set({ language }),

      toggleMethod: (method) =>
        set((s) => ({ acceptedMethods: { ...s.acceptedMethods, [method]: !s.acceptedMethods[method] } })),

      // A configuração da empresa vem de `tenant_settings`. O mapa continua
      // neste store para o carrinho poder consultá-lo sem depender da tela de
      // Preferências estar montada, mas o servidor é a fonte de verdade.
      setAcceptedMethods: (methods) =>
        set({
          acceptedMethods: Object.fromEntries(
            PAYMENT_METHODS.map((method) => [method, methods.includes(method)]),
          ) as Record<PaymentMethod, boolean>,
        }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        darkTheme: s.darkTheme,
        language: s.language,
        acceptedMethods: s.acceptedMethods,
      }),
      // Defensive merge: a NEW payment method in a future version of the app
      // does not exist in the stored object. Without this merge it would come
      // back `undefined` and disappear from the selector for existing users — a
      // bug QA never sees, because a fresh install never reproduces it.
      //
      // It also covers the rename of this slice's fields (temaEscuro →
      // darkTheme, formasAceitas → acceptedMethods). A payload written by the
      // previous version has none of the new keys, so every value falls back to
      // its default instead of deserializing as `undefined`. The cost is that
      // existing users get their preferences reset once, which is the right
      // trade against shipping a migration for two booleans.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PreferencesState>;
        return {
          ...current,
          ...p,
          // A hand-edited or downgraded payload could carry an unsupported tag.
          // Falling back keeps `t()` from resolving against a missing catalog.
          language: isSupportedLanguage(p.language) ? p.language : DEFAULT_LANGUAGE,
          acceptedMethods: acceptedFromPersisted(p.acceptedMethods),
        };
      },
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hydrated: true });
      },
    },
  ),
);

/** Only the enabled methods, in canonical order — feeds the cart's selector. */
export function activePaymentMethods(
  methods: Record<PaymentMethod, boolean>,
): PaymentMethod[] {
  return PAYMENT_METHODS.filter((m) => methods[m]);
}
