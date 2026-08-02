import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ConfigItem, Loc } from "@/types/types";

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
 * ajuste que ela não conhece, e inventar um campo genérico seria pior.
 */
const AJUSTES: {
  chave: string;
  rotulo: Loc;
  tipo: ConfigItem["tipo"];
  opcoes?: [string, Loc][];
}[] = [
  {
    chave: "default_modules",
    rotulo: { pt: "Módulos padrão no cadastro", en: "Default modules at signup" },
    tipo: "mods",
  },
  {
    chave: "trial_days",
    rotulo: { pt: "Período de teste do plano Pago", en: "Paid plan trial period" },
    tipo: "numero",
  },
  {
    chave: "inactivity_notify",
    rotulo: {
      pt: "Notificar quando um cliente ficar inativo",
      en: "Notify when a customer goes inactive",
    },
    tipo: "select",
    opcoes: [
      ["email", { pt: "E-mail", en: "Email" }],
      ["whatsapp", { pt: "WhatsApp", en: "WhatsApp" }],
      ["nao", { pt: "Não notificar", en: "Do not notify" }],
    ],
  },
  {
    chave: "default_language",
    rotulo: { pt: "Idioma padrão do painel", en: "Default panel language" },
    tipo: "select",
    // Os valores são os que estão gravados no banco ("pt-BR"), não os códigos
    // curtos que o seletor de idioma do painel usa.
    opcoes: [
      ["pt-BR", { pt: "Português (BR)", en: "Portuguese (BR)" }],
      ["en-US", { pt: "Inglês (EUA)", en: "English (US)" }],
    ],
  },
];

/** Valor de partida quando a chave ainda não existe na tabela. */
function valorPadrao(tipo: ConfigItem["tipo"]): ConfigItem["valor"] {
  return tipo === "mods" ? [] : tipo === "numero" ? 0 : "";
}

export interface ResultadoConfiguracoes {
  config: ConfigItem[];
  erro: string | null;
}

export async function listarConfiguracoes(): Promise<ResultadoConfiguracoes> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { config: [], erro: "Supabase não configurado." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.from("platform_settings").select("key, value");

  if (error) {
    console.error("[listarConfiguracoes] falha ao ler platform_settings:", error.message);
    return { config: [], erro: `Não foi possível carregar as configurações: ${error.message}` };
  }

  const gravados = new Map((data ?? []).map((l) => [l.key as string, l.value]));

  return {
    config: AJUSTES.map(({ chave, rotulo, tipo, opcoes }) => {
      const bruto = gravados.get(chave);
      return {
        id: chave,
        rotulo,
        tipo,
        // O jsonb chega já desserializado. A conferência de forma protege a
        // tela de um valor gravado com o tipo errado (uma string onde deveria
        // haver lista deixaria `.map` estourar no render).
        valor:
          bruto === undefined || bruto === null
            ? valorPadrao(tipo)
            : tipo === "mods"
              ? Array.isArray(bruto)
                ? (bruto as string[])
                : []
              : tipo === "numero"
                ? Number(bruto) || 0
                : String(bruto),
        ...(opcoes ? { opcoes } : {}),
      };
    }),
    erro: null,
  };
}

/**
 * Módulos que um cliente novo recebe quando o plano não define composição.
 * Lido pela Server Action de cadastro — antes era uma lista fixa em código.
 */
export async function modulosPadrao(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "default_modules")
    .maybeSingle();

  if (error || !data || !Array.isArray(data.value)) return [];
  return data.value as string[];
}
