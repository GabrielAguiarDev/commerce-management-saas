/**
 * O telefone de WhatsApp da plataforma, lido do banco no build.
 *
 * É A MESMA FONTE QUE O APP MOBILE USA na tela de login: a função
 * `platform_whatsapp_contact()`, liberada para `anon` pela migration
 * 20260808000000 justamente porque quem AINDA NÃO TEM CONTA é quem precisa do
 * número. O site é o outro lado dessa mesma porta — trocar o telefone no
 * console troca no app, no console e aqui, sem deploy.
 *
 * `platform_settings` continua fechada: a função devolve UM valor e nada mais.
 *
 * ┌─ MESMAS TRÊS REGRAS DE `lib/vitrine.ts` ───────────────────────────────┐
 * │ 1. `fetch` e não o cliente do Supabase — é um POST sem sessão, e a     │
 * │    landing continua com quatro dependências.                           │
 * │ 2. NÃO TEM COMO FALHAR: qualquer tropeço devolve `null`, e a página    │
 * │    de contato simplesmente não desenha o bloco do WhatsApp. Uma        │
 * │    página de contato sem um canal é melhor que uma que não abre.       │
 * │ 3. Cache com a etiqueta da rota, nunca `no-store`: leitura sem cache   │
 * │    joga a página para renderização dinâmica, e uma consulta ao banco   │
 * │    por visita é exatamente o que este site não é.                      │
 * └────────────────────────────────────────────────────────────────────────┘
 */

import { cache } from "react";
import { SIGNUP } from "@/lib/links";

/** Só dígitos, formato internacional — é assim que a função devolve. */
export type WhatsappNumber = string | null;

/**
 * `cache()` DO REACT, E NÃO O CACHE DE DADOS DO NEXT.
 *
 * São coisas diferentes e as duas fazem falta aqui. O do Next guarda a
 * resposta ENTRE renderizações — e ele não vale para este pedido, porque só
 * alcança `GET`, e uma RPC do PostgREST é `POST`. O do React deduplica DENTRO
 * de uma renderização: cinco componentes chamam esta função para montar cinco
 * botões, e sem isto seriam cinco viagens ao banco no mesmo build.
 *
 * A página continua estática, então "por renderização" quer dizer uma vez por
 * build e uma vez por revalidação — nunca por visita.
 */
export const fetchWhatsapp = cache(async function fetchWhatsapp(): Promise<WhatsappNumber> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[whatsapp] SUPABASE_URL/SUPABASE_ANON_KEY ausentes — página sem WhatsApp.");
    return null;
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/platform_whatsapp_contact`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: "{}",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[whatsapp] a consulta falhou: HTTP ${res.status} — página sem WhatsApp.`);
      return null;
    }

    // A função devolve um escalar; o PostgREST o entrega como JSON puro —
    // `"5571..."` ou `null`.
    const raw: unknown = await res.json();
    if (typeof raw !== "string") return null;

    // Defensivo de propósito: o console guarda o número à mão, e um parêntese
    // ou um traço que escapem ali quebrariam o link do wa.me sem avisar.
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 10 ? digits : null;
  } catch (e) {
    console.error("[whatsapp] erro ao ler o contato:", (e as Error).message);
    return null;
  }
});

/** O link que abre a conversa, com a primeira mensagem já escrita. */
export function whatsappLink(digits: string, message: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * O DESTINO DE UMA CHAMADA PARA AÇÃO.
 *
 * Os seis botões de "começar" da vitrine levam à conversa no WhatsApp, com a
 * primeira mensagem já escrita — e cada um escreve a SUA, para a conversa
 * chegar sabendo de onde o visitante veio (ver `COPY.cta.whatsapp`).
 *
 * ┌─ E QUANDO NÃO HÁ NÚMERO ───────────────────────────────────────────────┐
 * │ Cai na âncora da última dobra, que é o que os botões faziam antes.     │
 * │ Um botão que não vai a lugar nenhum é pior do que um que rola a        │
 * │ página, e a leitura do banco pode faltar por motivo banal: build sem   │
 * │ as variáveis de ambiente, banco fora do ar no minuto do deploy.        │
 * │                                                                        │
 * │ `target` só existe no caminho do WhatsApp: abrir uma ÂNCORA em aba     │
 * │ nova seria uma segunda cópia da página.                                │
 * └────────────────────────────────────────────────────────────────────────┘
 */
export interface CtaLink {
  href: string;
  target?: "_blank";
  rel?: string;
}

export function ctaLink(digits: WhatsappNumber, message: string): CtaLink {
  if (!digits) return { href: SIGNUP };
  return {
    href: whatsappLink(digits, message),
    target: "_blank",
    rel: "noopener noreferrer",
  };
}

/** `5571988887777` → `+55 71 98888-7777`. Só para MOSTRAR o número. */
export function formatWhatsapp(digits: string): string {
  const m = /^(\d{2})(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  if (!m) return `+${digits}`;
  return `+${m[1]} ${m[2]} ${m[3]}-${m[4]}`;
}
