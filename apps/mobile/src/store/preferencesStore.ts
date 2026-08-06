import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
 */
export const PAYMENT_METHODS = ['cash', 'pix', 'debit_card', 'credit_card'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

interface PreferencesState {
  darkTheme: boolean;
  language: Language;
  acceptedMethods: Record<PaymentMethod, boolean>;
  hydrated: boolean;

  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  toggleMethod: (method: PaymentMethod) => void;
}

const ALL_ACCEPTED = Object.fromEntries(PAYMENT_METHODS.map((m) => [m, true])) as Record<
  PaymentMethod,
  boolean
>;

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
          acceptedMethods: { ...ALL_ACCEPTED, ...(p.acceptedMethods ?? {}) },
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
