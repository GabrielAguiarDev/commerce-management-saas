import "server-only";

import {
  CAIXA_ABERTO,
  esperadoEmDinheiro,
  movCaixaDoBanco,
} from "@/lib/dados/caixa";
import { autorDoBanco, protocoloDe, statusDoBanco } from "@/lib/dados/chamados";
import { tipoCustoDoBanco } from "@/lib/dados/custos";
import { modulosDoPapel } from "@/lib/dados/equipe";
import { movDoBanco } from "@/lib/dados/estoque";
import { pagamentoDoBanco, STATUS_VENDA } from "@/lib/dados/vendas";
import { modulosDoTenant, PORTAL_PARA_DB } from "@/lib/modulos";
import type { Sessao } from "@/lib/sessao";
import type {
  CaixaAberto,
  CaixaFechado,
  Chamado,
  Custo,
  DadosNegocio,
  Funcionario,
  ModuloKey,
  MovCaixa,
  MovEstoque,
  Negocio,
  Papel,
  Produto,
  Venda,
} from "@/types/types";

/**
 * A tradução do banco para o modelo do portal.
 *
 * Este arquivo é a única fronteira: daqui para dentro nada mais fala `sold_at`,
 * `payment_method` ou `is_favorite`. Se um dia a coluna mudar de nome, é o
 * único lugar que precisa saber.
 *
 * Nenhuma consulta filtra por `tenant_id` — quem isola é o RLS. Filtrar aqui
 * daria a falsa impressão de que a segurança está no `where`.
 */

type Cliente = Extract<Sessao, { ok: true }>["supabase"];

/* -------------------------------------------------------------------------- */
/* Datas                                                                       */
/* -------------------------------------------------------------------------- */

const MS_DIA = 86_400_000;

/** Meia-noite de hoje no fuso de quem roda — a régua de "quantos dias atrás". */
function hoje0(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Dias completos entre a data e hoje. 0 = hoje, 1 = ontem. */
export function diasAtras(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoje0() - d.getTime()) / MS_DIA));
}

function horaDe(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** `costs.cost_date` vem como 'YYYY-MM-DD' — sem fuso, para não pular um dia. */
function diasAtrasData(data: string): number {
  const [a, m, dia] = data.split("-").map(Number);
  return Math.max(0, Math.round((hoje0() - new Date(a, m - 1, dia).getTime()) / MS_DIA));
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numOuNulo = (v: unknown): number | null => (v == null ? null : Number(v));

/* -------------------------------------------------------------------------- */
/* Negócio e módulos                                                           */
/* -------------------------------------------------------------------------- */

export async function lerNegocio(
  supabase: Cliente,
  tenantId: string,
  nomeUsuario: string,
): Promise<{ negocio: Negocio; dados: DadosNegocio }> {
  const [{ data: tenant }, { data: mods }] = await Promise.all([
    supabase.from("tenants").select("id, name, segment, phone, city").eq("id", tenantId).single(),
    supabase.from("v_active_modules").select("key, is_access"),
  ]);

  const nome = tenant?.name ?? "Seu negócio";

  return {
    negocio: {
      id: tenantId,
      nome,
      sigla: iniciais(nome),
      tipo: tenant?.segment ?? "Comércio",
      user: { nome: nomeUsuario, sigla: iniciais(nomeUsuario) },
      modulos: modulosDoTenant(mods ?? []),
    },
    dados: {
      nome,
      tipo: tenant?.segment ?? "",
      telefone: tenant?.phone ?? "",
      cidade: tenant?.city ?? "",
    },
  };
}

function iniciais(nome: string): string {
  const p = String(nome || "")
    .split(/\s+/)
    .filter((t) => /^[\p{L}]/u.test(t));
  if (!p.length) return "?";
  return ((p[0][0] || "") + ((p[1] || "")[0] || "")).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Produtos                                                                    */
/* -------------------------------------------------------------------------- */

export async function lerProdutos(supabase: Cliente): Promise<Produto[]> {
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, price, cost, category, barcode, unit, is_service, is_favorite, is_active, stock_quantity, stock_min, tracks_stock",
    )
    .order("name");

  return (data ?? []).map((p) => ({
    id: p.id,
    nome: p.name,
    preco: num(p.price),
    codigo: p.barcode ?? "",
    fav: !!p.is_favorite,
    ativo: !!p.is_active,
    categoria: p.category ?? "Outros",
    custo: num(p.cost),
    // `tracks_stock` é quem manda: um produto físico sem controle de estoque
    // não deve aparecer na tela de Estoque nem gerar alerta.
    estoque: p.tracks_stock ? num(p.stock_quantity) : null,
    minimo: p.tracks_stock ? numOuNulo(p.stock_min) : null,
    unidade: p.unit ?? "un",
    servico: !!p.is_service,
  }));
}

/* -------------------------------------------------------------------------- */
/* Vendas                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Vendas dos últimos `dias`, com os itens.
 *
 * O corte existe porque a tela mais longa (Relatórios, 90 dias com
 * comparativo) precisa de 180; puxar o histórico inteiro cresceria sem limite
 * junto com o negócio.
 */
export async function lerVendas(supabase: Cliente, dias = 180): Promise<Venda[]> {
  const desde = new Date(hoje0() - dias * MS_DIA).toISOString();

  const { data } = await supabase
    .from("sales")
    .select("id, total, payment_method, status, sold_at, sale_items(product_name, quantity, unit_price)")
    .gte("sold_at", desde)
    .order("sold_at", { ascending: false });

  return (data ?? []).map((v) => ({
    id: v.id,
    d: diasAtras(v.sold_at),
    hora: horaDe(v.sold_at),
    quando: v.sold_at,
    pag: pagamentoDoBanco(v.payment_method),
    estornada: v.status === STATUS_VENDA.estornada,
    itens: (v.sale_items ?? []).map((i) => ({
      nome: i.product_name,
      qtd: num(i.quantity),
      preco: num(i.unit_price),
    })),
  }));
}

/* -------------------------------------------------------------------------- */
/* Estoque                                                                     */
/* -------------------------------------------------------------------------- */

export async function lerMovsEstoque(supabase: Cliente, dias = 90): Promise<MovEstoque[]> {
  const desde = new Date(hoje0() - dias * MS_DIA).toISOString();

  const { data } = await supabase
    .from("stock_movements")
    .select("id, type, quantity, unit_cost, reason, created_at, product_id, products(name), profiles(full_name)")
    .gte("created_at", desde)
    .order("created_at", { ascending: false });

  return (data ?? []).map((m) => {
    const tipo = movDoBanco(m.type);
    const q = num(m.quantity);
    return {
      id: m.id,
      d: diasAtras(m.created_at),
      hora: horaDe(m.created_at),
      produtoId: m.product_id,
      produto: (m.products as { name?: string } | null)?.name ?? "Produto removido",
      tipo,
      // O banco guarda a quantidade já assinada pela função `apply_stock_movement`.
      delta: q,
      motivo: m.reason ?? "",
      quem: (m.profiles as { full_name?: string } | null)?.full_name ?? "—",
      custo: m.unit_cost == null ? undefined : num(m.unit_cost),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Custos                                                                      */
/* -------------------------------------------------------------------------- */

export async function lerCustos(supabase: Cliente, dias = 180): Promise<Custo[]> {
  const desde = new Date(hoje0() - dias * MS_DIA);
  const iso = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, "0")}-${String(desde.getDate()).padStart(2, "0")}`;

  const { data } = await supabase
    .from("costs")
    .select("id, description, type, category, amount, is_recurring, origin, cost_date")
    .gte("cost_date", iso)
    .order("cost_date", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    tipo: tipoCustoDoBanco(c.type),
    descricao: c.description,
    categoria: c.category ?? "Outros",
    valor: num(c.amount),
    d: diasAtrasData(c.cost_date),
    data: c.cost_date,
    recorrente: !!c.is_recurring,
    doEstoque: c.origin === "stock",
  }));
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

interface EstadoCaixa {
  aberto: CaixaAberto | null;
  fechados: CaixaFechado[];
}

export async function lerCaixa(
  supabase: Cliente,
  vendas: Venda[],
  dias = 60,
): Promise<EstadoCaixa> {
  const desde = new Date(hoje0() - dias * MS_DIA).toISOString();

  // O `select` precisa ser uma string literal: o tipo do PostgREST é inferido
  // do texto, e uma concatenação vira `string` — aí o resultado perde a forma.
  const { data } = await supabase
    .from("cash_registers")
    .select(
      "id, opening_amount, status, expected_cash, counted_cash, difference, closing_note, opened_at, closed_at, profiles!cash_registers_opened_by_fkey(full_name), cash_movements(id, type, amount, reason, created_at)",
    )
    .gte("opened_at", desde)
    .order("opened_at", { ascending: false });

  const linhas = data ?? [];
  const movsDe = (l: (typeof linhas)[number]): MovCaixa[] =>
    (l.cash_movements ?? [])
      .map((m) => ({
        id: m.id,
        hora: horaDe(m.created_at),
        tipo: movCaixaDoBanco(m.type),
        valor: num(m.amount),
        motivo: m.reason ?? "",
      }))
      .sort((a, b) => b.hora.localeCompare(a.hora));

  const abertoRow = linhas.find((l) => l.status === CAIXA_ABERTO);

  const aberto: CaixaAberto | null = abertoRow
    ? {
        id: abertoRow.id,
        abertura: horaDe(abertoRow.opened_at),
        abertoEm: abertoRow.opened_at,
        inicial: num(abertoRow.opening_amount),
        operador: (abertoRow.profiles as { full_name?: string } | null)?.full_name ?? "—",
        movs: movsDe(abertoRow),
      }
    : null;

  const fechados: CaixaFechado[] = linhas
    .filter((l) => l.status !== CAIXA_ABERTO && l.closed_at)
    .map((l) => {
      const movs = movsDe(l);
      const doTurno = vendasEntre(vendas, l.opened_at, l.closed_at!);
      const esperado =
        l.expected_cash != null
          ? num(l.expected_cash)
          : esperadoEmDinheiro(num(l.opening_amount), doTurno.Dinheiro ?? 0, movs);
      const contado = num(l.counted_cash);

      return {
        id: l.id,
        d: diasAtras(l.opened_at),
        abertura: horaDe(l.opened_at),
        fechamento: horaDe(l.closed_at!),
        inicial: num(l.opening_amount),
        operador: (l.profiles as { full_name?: string } | null)?.full_name ?? "—",
        vendas: doTurno,
        esperadoDinheiro: esperado,
        contadoDinheiro: contado,
        diferenca: l.difference != null ? num(l.difference) : contado - esperado,
        movs,
        obs: l.closing_note ?? "",
      };
    });

  return { aberto, fechados };
}

/** Quanto cada forma rendeu numa janela de tempo — usado pelo turno fechado. */
function vendasEntre(vendas: Venda[], de: string, ate: string) {
  const inicio = new Date(de).getTime();
  const fim = new Date(ate).getTime();
  const out: Partial<Record<Venda["pag"], number>> = {};

  for (const v of vendas) {
    if (v.estornada) continue;
    const t = new Date(v.quando).getTime();
    if (t < inicio || t > fim) continue;
    const total = v.itens.reduce((a, i) => a + i.qtd * i.preco, 0);
    out[v.pag] = (out[v.pag] ?? 0) + total;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

const DB_PARA_PORTAL_MOD = Object.fromEntries(
  Object.entries(PORTAL_PARA_DB).map(([portal, db]) => [db, portal as ModuloKey]),
) as Record<string, ModuloKey>;

export async function lerEquipe(
  supabase: Cliente,
): Promise<{ papeis: Papel[]; equipe: Funcionario[] }> {
  const [{ data: roles }, { data: perfis }] = await Promise.all([
    supabase.from("roles").select("id, name, permissions, is_owner").order("name"),
    supabase.from("profiles").select("id, full_name, status, role_id, roles(name, is_owner)"),
  ]);

  const papeis: Papel[] = (roles ?? []).map((r) => ({
    id: r.id,
    nome: r.name,
    modulos: r.is_owner
      ? [...MODULOS_TODOS]
      : modulosDoPapel(r.permissions, (k) => DB_PARA_PORTAL_MOD[k]),
    fixo: !!r.is_owner,
  }));

  const equipe: Funcionario[] = (perfis ?? []).map((p) => {
    const papel = p.roles as { name?: string; is_owner?: boolean } | null;
    return {
      id: p.id,
      nome: p.full_name ?? "Sem nome",
      // O e-mail vive em `auth.users`, fora do alcance do RLS do portal.
      // Ver a análise: falta uma coluna ou uma view que o exponha.
      email: "",
      papel: papel?.name ?? "Sem tipo de acesso",
      ativo: p.status === "active",
      dono: !!papel?.is_owner,
    };
  });

  return { papeis, equipe };
}

const MODULOS_TODOS: ModuloKey[] = [
  "vendas",
  "produtos",
  "estoque",
  "caixa",
  "custos",
  "relatorios",
];

/* -------------------------------------------------------------------------- */
/* Suporte                                                                     */
/* -------------------------------------------------------------------------- */

export async function lerChamados(supabase: Cliente): Promise<Chamado[]> {
  const { data } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, category, status, last_message_at, created_at, support_messages(id, sender_side, body, attachment_url, read_by_recipient, created_at)",
    )
    .order("last_message_at", { ascending: false });

  return (data ?? []).map((t) => {
    const msgs = (t.support_messages ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({
        id: m.id,
        autor: autorDoBanco(m.sender_side),
        d: diasAtras(m.created_at),
        hora: horaDe(m.created_at),
        texto: m.body,
        anexo: m.attachment_url ?? "",
      }));

    return {
      id: t.id,
      protocolo: protocoloDe(t.id),
      assunto: t.subject,
      categoria: t.category ?? "Dúvida",
      status: statusDoBanco(t.status),
      // "Nova resposta" é uma mensagem do suporte que o cliente ainda não leu.
      naoLido: (t.support_messages ?? []).some(
        (m) => autorDoBanco(m.sender_side) === "suporte" && !m.read_by_recipient,
      ),
      msgs,
    };
  });
}
