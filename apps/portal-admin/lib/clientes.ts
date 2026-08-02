import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Cliente, StatusCliente } from "@/types/types";

/**
 * Leitura dos clientes (tenants) reais.
 *
 * SEGURANÇA — por que o cliente do SERVIDOR e não o admin:
 * aqui só se LÊ, e o RLS já faz o filtro certo — quem é admin de plataforma
 * enxerga todos os tenants; qualquer outro usuário enxerga no máximo o seu.
 * Usar a `service_role` para uma listagem seria furar o RLS sem necessidade e
 * perder essa proteção de graça. O cliente admin fica reservado ao que só ele
 * consegue fazer (criar usuário no Auth), como em `app/clientes/actions.ts`.
 */

/** Uma linha de `tenants` com o dono e os módulos embutidos. */
interface LinhaTenant {
  id: string;
  name: string | null;
  segment: string | null;
  status: string | null;
  plan: string | null;
  monthly_fee: number | string | null;
  city: string | null;
  phone: string | null;
  created_at: string | null;
  profiles: { full_name: string | null }[] | null;
  tenant_modules: { module_key: string; enabled: boolean }[] | null;
}

const SELECT = `
  id,
  name,
  segment,
  status,
  plan,
  monthly_fee,
  city,
  phone,
  created_at,
  profiles ( full_name ),
  tenant_modules ( module_key, enabled )
`;

/** dd/mm/aaaa. Roda só no servidor, então não há risco de divergir na hidratação. */
function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/**
 * "R$ 89,00". Zero vira "—" porque o plano gratuito não é cobrado, e o painel
 * inteiro (MRR, financeiro, CSV) já lê valores nesse formato.
 */
function formatarValor(fee: number | string | null): string {
  const n = typeof fee === "string" ? Number(fee) : (fee ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return "R$ " + n.toFixed(2).replace(".", ",");
}

function paraCliente(linha: LinhaTenant): Cliente {
  // v1 tem um usuário por tenant — o dono, criado junto com o cadastro.
  // Quando existirem funcionários, aqui passa a valer o papel `is_owner`.
  const dono = linha.profiles?.[0]?.full_name;

  return {
    id: linha.id,
    nome: linha.name ?? "—",
    segmento: { pt: linha.segment || "—", en: linha.segment || "—" },
    // Sem fallback para "free": um tenant sem plano é anomalia de dado, e
    // chutar um plano faria a tela mentir. A chave vazia cai no selo neutro.
    plano: linha.plan ?? "",
    status: (linha.status === "active" ? "ativo" : "inativo") as StatusCliente,
    data: formatarData(linha.created_at),
    resp: dono || "—",
    valor: formatarValor(linha.monthly_fee),
    cidade: linha.city || "—",
    telefone: linha.phone || "—",
    mods: (linha.tenant_modules ?? []).filter((m) => m.enabled).map((m) => m.module_key),
  };
}

export interface ResultadoClientes {
  clientes: Cliente[];
  /** Mensagem para a interface mostrar em vez de fingir que a lista está vazia. */
  erro: string | null;
}

export async function listarClientes(): Promise<ResultadoClientes> {
  // Sem credenciais o painel continua navegável (as telas ainda não conectadas
  // seguem com dados de exemplo) — a lista é que fica honestamente vazia.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      clientes: [],
      erro: "Supabase não configurado. Preencha o .env.local (veja .env.local.example) e reinicie o servidor.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tenants")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    // O erro vai para o log do servidor com o detalhe; a tela recebe o resumo.
    console.error("[listarClientes] falha ao ler tenants:", error.message);
    return { clientes: [], erro: `Não foi possível carregar os clientes: ${error.message}` };
  }

  return { clientes: (data as unknown as LinhaTenant[]).map(paraCliente), erro: null };
}
