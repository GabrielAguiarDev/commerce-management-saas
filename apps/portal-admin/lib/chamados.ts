import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Chamado, Mensagem, Prioridade, StatusChamado } from "@/types/types";

/**
 * Leitura dos chamados de suporte reais (`support_tickets` + `support_messages`).
 *
 * SEGURANÇA — mesmo raciocínio de `lib/clientes.ts`: aqui só se LÊ, e o RLS já
 * faz o recorte certo (o admin de plataforma vê os chamados de todos os
 * tenants; um lojista vê só os do próprio). Usar a `service_role` para uma
 * listagem seria furar o RLS de graça.
 *
 * VOCABULÁRIO — o banco guarda os valores em inglês e a interface fala
 * português. A tradução acontece aqui, num lugar só, e é TOLERANTE na leitura:
 * um valor que não reconhecemos cai num padrão razoável em vez de sumir da
 * tela. Ver `PARA_ESCRITA` em `app/suporte/actions.ts` para o caminho inverso.
 */

interface LinhaMensagem {
  id: string;
  sender_side: string | null;
  body: string | null;
  created_at: string | null;
}

interface LinhaChamado {
  id: string;
  tenant_id: string;
  subject: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
  support_messages: LinhaMensagem[] | null;
}

const SELECT = `
  id,
  tenant_id,
  subject,
  status,
  priority,
  created_at,
  support_messages ( id, sender_side, body, created_at )
`;

/** dd/mm/aaaa. Formatado no servidor, em UTC, para não divergir na hidratação. */
function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** "24/07 · 09:05" — o carimbo curto que aparece dentro de cada balão. */
function formatarQuando(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} · ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function paraStatus(v: string | null): StatusChamado {
  switch (v) {
    case "in_progress":
    case "pending":
      return "andamento";
    case "resolved":
    case "closed":
      return "resolvido";
    // "open" e qualquer coisa que não reconheçamos: melhor aparecer como
    // aberto e chamar atenção do que ser tratado como resolvido por engano.
    default:
      return "aberto";
  }
}

function paraPrioridade(v: string | null): Prioridade {
  switch (v) {
    case "high":
    case "urgent":
      return "alta";
    case "low":
      return "baixa";
    // "normal" é o padrão da coluna no banco.
    default:
      return "media";
  }
}

function paraMensagem(linha: LinhaMensagem): Mensagem {
  return {
    // Do lado do admin fica à direita; qualquer outro remetente é o cliente.
    de: linha.sender_side === "admin" || linha.sender_side === "support" ? "admin" : "cliente",
    // Texto puro: veio do banco em um idioma só, e a interface já aceita
    // `string` além da forma traduzida (ver `Mensagem` em types/types.ts).
    texto: linha.body ?? "",
    quando: formatarQuando(linha.created_at),
  };
}

function paraChamado(linha: LinhaChamado): Chamado {
  const assunto = linha.subject ?? "—";
  return {
    id: linha.id,
    clienteId: linha.tenant_id,
    // O banco tem uma coluna só; a forma `Loc` fica de pé para quando houver
    // tradução real, repetindo o mesmo texto nos dois idiomas enquanto isso.
    assunto: { pt: assunto, en: assunto },
    status: paraStatus(linha.status),
    prioridade: paraPrioridade(linha.priority),
    data: formatarData(linha.created_at),
    msgs: (linha.support_messages ?? []).map(paraMensagem),
  };
}

export interface ResultadoChamados {
  chamados: Chamado[];
  /** Mensagem para a interface mostrar em vez de fingir que não há chamados. */
  erro: string | null;
}

export async function listarChamados(): Promise<ResultadoChamados> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      chamados: [],
      erro: "Supabase não configurado. Preencha o .env.local (veja .env.local.example) e reinicie o servidor.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("support_tickets")
    .select(SELECT)
    // O chamado que se mexeu por último é o que interessa primeiro.
    .order("last_message_at", { ascending: false })
    // Dentro do chamado a conversa é cronológica, do mais antigo ao mais novo.
    .order("created_at", { referencedTable: "support_messages", ascending: true });

  if (error) {
    console.error("[listarChamados] falha ao ler support_tickets:", error.message);
    return { chamados: [], erro: `Não foi possível carregar os chamados: ${error.message}` };
  }

  return { chamados: (data as unknown as LinhaChamado[]).map(paraChamado), erro: null };
}
