import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SettingItem, Loc } from "@/types/types";

/**
 * Configurações da plataforma, lidas de `platform_settings`.
 *
 * A tabela é um chaveiro genérico: `key` (texto) e `value` (jsonb). Isso deixa
 * o banco flexível, mas empurra para cá a responsabilidade de saber que
 * `trial_days` é número e `default_modules` é lista — é o que o mapa abaixo faz.
 *
 * SEGURANÇA: cliente de sessão, sob RLS. As escritas ficam na Server Action.
 */

/**
 * O que o painel sabe exibir, e como. Uma chave que exista no banco mas não
 * esteja aqui é ignorada de propósito: a tela não teria como renderizar um
 * ajuste que ela não conhece, e inventar um field genérico seria pior.
 */
const SETTINGS: {
  key: string;
  label: Loc;
  type: SettingItem["type"];
  options?: [string, Loc][];
  hint?: Loc;
}[] = [
  {
    key: "default_modules",
    label: { pt: "Módulos padrão no cadastro", en: "Default modules at signup" },
    type: "mods",
  },
  {
    key: "trial_days",
    label: { pt: "Período de teste do plano Pago", en: "Paid plan trial period" },
    type: "numero",
  },
  {
    key: "inactivity_notify",
    label: {
      pt: "Notificar quando um cliente ficar inativo",
      en: "Notify when a customer goes inactive",
    },
    type: "select",
    options: [
      ["email", { pt: "E-mail", en: "Email" }],
      ["whatsapp", { pt: "WhatsApp", en: "WhatsApp" }],
      ["nao", { pt: "Não notificar", en: "Do not notify" }],
    ],
  },
  {
    key: "default_language",
    label: { pt: "Idioma padrão do painel", en: "Default panel language" },
    type: "select",
    // Os valores são os que estão gravados no banco ("pt-BR"), não os códigos
    // curtos que o seletor de idioma do painel usa.
    options: [
      ["pt-BR", { pt: "Português (BR)", en: "Portuguese (BR)" }],
      ["en-US", { pt: "Inglês (EUA)", en: "English (US)" }],
    ],
  },
  {
    key: "whatsapp_contact",
    label: { pt: "WhatsApp de contato", en: "Contact WhatsApp" },
    type: "telefone",
    hint: {
      pt: "Usado nos links de contato do site e do app.",
      en: "Used in the contact links on the website and in the app.",
    },
  },
];

/** Valor de partida quando a chave ainda não existe na tabela. */
function defaultValue(type: SettingItem["type"]): SettingItem["value"] {
  return type === "mods" ? [] : type === "numero" ? 0 : "";
}

export interface SettingsResult {
  settings: SettingItem[];
  error: string | null;
}

export async function listSettings(): Promise<SettingsResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { settings: [], error: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.from("platform_settings").select("key, value");

  if (error) {
    console.error("[listarConfiguracoes] falha ao ler platform_settings:", error.message);
    return { settings: [], error: `Não foi possível carregar as configurações: ${error.message}` };
  }

  const stored = new Map((data ?? []).map((l) => [l.key as string, l.value]));

  return {
    settings: SETTINGS.map(({ key, label, type, options, hint }) => {
      const gross = stored.get(key);
      return {
        id: key,
        label,
        type,
        // O jsonb chega já desserializado. A conferência de forma protege a
        // tela de um valor gravado com o tipo errado (uma string onde deveria
        // haver lista deixaria `.map` estourar no render).
        value:
          gross === undefined || gross === null
            ? defaultValue(type)
            : type === "mods"
              ? Array.isArray(gross)
                ? (gross as string[])
                : []
              : type === "numero"
                ? Number(gross) || 0
                : String(gross),
        ...(options ? { options } : {}),
        ...(hint ? { hint } : {}),
      };
    }),
    error: null,
  };
}

/**
 * Módulos que um cliente novo recebe quando o plano não define composição.
 * Lido pela Server Action de cadastro — antes era uma lista fixa em código.
 */
export async function defaultModules(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "default_modules")
    .maybeSingle();

  if (error || !data || !Array.isArray(data.value)) return [];
  return data.value as string[];
}
