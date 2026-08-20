import "server-only";

import {
  REGISTER_OPEN,
  expectedInCash,
  registerMovementFromDb,
} from "@/lib/dados/caixa";
import { authorFromDb, protocolOf, statusFromDb } from "@/lib/dados/chamados";
import { costTypeFromDb } from "@/lib/dados/custos";
import { roleModules } from "@/lib/dados/equipe";
import { movementFromDb } from "@/lib/dados/estoque";
import { paymentFromDb, SALE_STATUS } from "@/lib/dados/vendas";
import { moduleCatalog, tenantModules, PORTAL_TO_DB } from "@/lib/modulos";
import type { Session } from "@/lib/sessao";
import type {
  OpenRegister,
  ClosedRegister,
  Ticket,
  Cost,
  BusinessData,
  Employee,
  ModuleKey,
  RegisterMovement,
  StockMovement,
  Business,
  Role,
  Product,
  Sale,
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

type Customer = Extract<Session, { ok: true }>["supabase"];

/* -------------------------------------------------------------------------- */
/* Datas                                                                       */
/* -------------------------------------------------------------------------- */

const MS_DAY = 86_400_000;

/** Meia-noite de hoje no fuso de quem roda — a régua de "quantos dias atrás". */
function hoje0(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Dias completos entre a data e hoje. 0 = hoje, 1 = ontem. */
export function daysAgo(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoje0() - d.getTime()) / MS_DAY));
}

function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** `costs.cost_date` vem como 'YYYY-MM-DD' — sem fuso, para não pular um dia. */
function dateDaysAgo(data: string): number {
  const [a, m, dia] = data.split("-").map(Number);
  return Math.max(0, Math.round((hoje0() - new Date(a, m - 1, dia).getTime()) / MS_DAY));
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numberOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

/* -------------------------------------------------------------------------- */
/* Negócio e módulos                                                           */
/* -------------------------------------------------------------------------- */

export async function readBusiness(
  supabase: Customer,
  tenantId: string,
  nomeUsuario: string,
): Promise<{ business: Business; data: BusinessData }> {
  const [{ data: tenant }, { data: mods }, { data: catalog }] = await Promise.all([
    supabase.from("tenants").select("id, name, segment, phone, city").eq("id", tenantId).single(),
    supabase.from("v_active_modules").select("key, is_access"),

    /**
     * O CATÁLOGO — o que existe para vender, e não o que este cliente tem.
     *
     * Só nome e descrição: nenhuma linha de dado de um módulo que o plano não
     * liga passa por aqui, e não passaria mesmo se quiséssemos — o RLS de cada
     * tabela continua sendo a fechadura. Isto é a lista de produtos, não o
     * estoque de ninguém.
     *
     * Pode voltar vazia: `modules` nasceu como tabela do painel administrativo
     * e talvez o RLS do tenant não a alcance. Não é erro — `catalogoModulos`
     * cai para o catálogo em código, e o único prejuízo é o texto vir de lá.
     */
    supabase.from("modules").select("key, name, description, is_access"),
  ]);

  const name = tenant?.name ?? "Seu negócio";

  return {
    business: {
      id: tenantId,
      name,
      initials: initials(name),
      type: tenant?.segment ?? "Comércio",
      user: { name: nomeUsuario, initials: initials(nomeUsuario) },
      modules: tenantModules(mods ?? []),
      catalog: moduleCatalog(catalog),
    },
    data: {
      name,
      type: tenant?.segment ?? "",
      phone: tenant?.phone ?? "",
      city: tenant?.city ?? "",
    },
  };
}

function initials(name: string): string {
  const p = String(name || "")
    .split(/\s+/)
    .filter((t) => /^[\p{L}]/u.test(t));
  if (!p.length) return "?";
  return ((p[0][0] || "") + ((p[1] || "")[0] || "")).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Produtos                                                                    */
/* -------------------------------------------------------------------------- */

export async function readProducts(supabase: Customer): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, price, cost, category, barcode, unit, is_service, is_favorite, is_active, stock_quantity, stock_min, tracks_stock",
    )
    .order("name");

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    price: num(p.price),
    code: p.barcode ?? "",
    fav: !!p.is_favorite,
    active: !!p.is_active,
    category: p.category ?? "Outros",
    cost: num(p.cost),
    // `tracks_stock` é quem manda: um produto físico sem controle de estoque
    // não deve aparecer na tela de Estoque nem gerar alerta.
    stock: p.tracks_stock ? num(p.stock_quantity) : null,
    minimum: p.tracks_stock ? numberOrNull(p.stock_min) : null,
    unit: p.unit ?? "un",
    service: !!p.is_service,
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
export async function readSales(supabase: Customer, days = 180): Promise<Sale[]> {
  const since = new Date(hoje0() - days * MS_DAY).toISOString();

  const { data } = await supabase
    .from("sales")
    .select("id, total, payment_method, status, sold_at, sale_items(product_name, quantity, unit_price)")
    .gte("sold_at", since)
    .order("sold_at", { ascending: false });

  return (data ?? []).map((v) => ({
    id: v.id,
    d: daysAgo(v.sold_at),
    time: timeOf(v.sold_at),
    at: v.sold_at,
    payment: paymentFromDb(v.payment_method),
    refunded: v.status === SALE_STATUS.refunded,
    items: (v.sale_items ?? []).map((i) => ({
      name: i.product_name,
      qtd: num(i.quantity),
      price: num(i.unit_price),
    })),
  }));
}

/* -------------------------------------------------------------------------- */
/* Estoque                                                                     */
/* -------------------------------------------------------------------------- */

export async function readStockMovements(supabase: Customer, days = 90): Promise<StockMovement[]> {
  const since = new Date(hoje0() - days * MS_DAY).toISOString();

  const { data } = await supabase
    .from("stock_movements")
    .select("id, type, quantity, unit_cost, reason, created_at, product_id, products(name), profiles(full_name)")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  return (data ?? []).map((m) => {
    const type = movementFromDb(m.type);
    const q = num(m.quantity);
    return {
      id: m.id,
      d: daysAgo(m.created_at),
      time: timeOf(m.created_at),
      productId: m.product_id,
      product: (m.products as { name?: string } | null)?.name ?? "Produto removido",
      type,
      // O banco guarda a quantidade já assinada pela função `apply_stock_movement`.
      delta: q,
      reason: m.reason ?? "",
      who: (m.profiles as { full_name?: string } | null)?.full_name ?? "—",
      cost: m.unit_cost == null ? undefined : num(m.unit_cost),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Custos                                                                      */
/* -------------------------------------------------------------------------- */

export async function readCosts(supabase: Customer, days = 180): Promise<Cost[]> {
  const since = new Date(hoje0() - days * MS_DAY);
  const iso = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;

  const { data } = await supabase
    .from("costs")
    .select("id, description, type, category, amount, is_recurring, origin, cost_date")
    .gte("cost_date", iso)
    .order("cost_date", { ascending: false });

  return (data ?? []).map((c) => ({
    id: c.id,
    type: costTypeFromDb(c.type),
    description: c.description,
    category: c.category ?? "Outros",
    amount: num(c.amount),
    d: dateDaysAgo(c.cost_date),
    data: c.cost_date,
    recurring: !!c.is_recurring,
    fromStock: c.origin === "stock",
  }));
}

/* -------------------------------------------------------------------------- */
/* Caixa                                                                       */
/* -------------------------------------------------------------------------- */

interface RegisterState {
  open: OpenRegister | null;
  closed: ClosedRegister[];
}

export async function readRegister(
  supabase: Customer,
  /**
   * As vendas do período. Aceita a PROMESSA, e não só a lista pronta, porque a
   * dependência é menor do que parece: só o cálculo de quanto entrou em cada
   * turno precisa delas — a consulta a `cash_registers` não precisa de nada.
   * Esperando aqui dentro, as duas leituras viajam ao banco juntas em vez de
   * uma atrás da outra. Ver `carregar.ts`.
   */
  sales: Sale[] | Promise<Sale[]>,
  days = 60,
): Promise<RegisterState> {
  const since = new Date(hoje0() - days * MS_DAY).toISOString();

  // O `select` precisa ser uma string literal: o tipo do PostgREST é inferido
  // do texto, e uma concatenação vira `string` — aí o resultado perde a forma.
  const [{ data }, salesList] = await Promise.all([
    supabase
      .from("cash_registers")
      .select(
        "id, opening_amount, status, expected_cash, counted_cash, difference, closing_note, opened_at, closed_at, profiles!cash_registers_opened_by_fkey(full_name), cash_movements(id, type, amount, reason, created_at)",
      )
      .gte("opened_at", since)
      .order("opened_at", { ascending: false }),
    sales,
  ]);

  const rows = data ?? [];
  const movementsOf = (l: (typeof rows)[number]): RegisterMovement[] =>
    (l.cash_movements ?? [])
      .map((m) => ({
        id: m.id,
        time: timeOf(m.created_at),
        type: registerMovementFromDb(m.type),
        amount: num(m.amount),
        reason: m.reason ?? "",
      }))
      .sort((a, b) => b.time.localeCompare(a.time));

  const abertoRow = rows.find((l) => l.status === REGISTER_OPEN);

  const open: OpenRegister | null = abertoRow
    ? {
        id: abertoRow.id,
        openedAt: timeOf(abertoRow.opened_at),
        openedAtStamp: abertoRow.opened_at,
        opening: num(abertoRow.opening_amount),
        operator: (abertoRow.profiles as { full_name?: string } | null)?.full_name ?? "—",
        movements: movementsOf(abertoRow),
      }
    : null;

  const closed: ClosedRegister[] = rows
    .filter((l) => l.status !== REGISTER_OPEN && l.closed_at)
    .map((l) => {
      const movements = movementsOf(l);
      const inShift = salesBetween(salesList, l.opened_at, l.closed_at!);
      const expected =
        l.expected_cash != null
          ? num(l.expected_cash)
          : expectedInCash(num(l.opening_amount), inShift.cash ?? 0, movements);
      const counted = num(l.counted_cash);

      return {
        id: l.id,
        d: daysAgo(l.opened_at),
        openedAt: timeOf(l.opened_at),
        closedAt: timeOf(l.closed_at!),
        opening: num(l.opening_amount),
        operator: (l.profiles as { full_name?: string } | null)?.full_name ?? "—",
        sales: inShift,
        expectedCash: expected,
        countedCash: counted,
        difference: l.difference != null ? num(l.difference) : counted - expected,
        movements,
        obs: l.closing_note ?? "",
      };
    });

  return { open, closed };
}

/** Quanto cada forma rendeu numa janela de tempo — usado pelo turno fechado. */
function salesBetween(sales: Sale[], from: string, to: string) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  const out: Partial<Record<Sale["payment"], number>> = {};

  for (const v of sales) {
    if (v.refunded) continue;
    const t = new Date(v.at).getTime();
    if (t < start || t > end) continue;
    const total = v.items.reduce((a, i) => a + i.qtd * i.price, 0);
    out[v.payment] = (out[v.payment] ?? 0) + total;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Equipe                                                                      */
/* -------------------------------------------------------------------------- */

const DB_TO_PORTAL_MODULE = Object.fromEntries(
  Object.entries(PORTAL_TO_DB).map(([portal, db]) => [db, portal as ModuleKey]),
) as Record<string, ModuleKey>;

export async function readTeam(
  supabase: Customer,
): Promise<{ roles: Role[]; team: Employee[] }> {
  const [{ data: rawRoles }, { data: rawProfiles }] = await Promise.all([
    supabase.from("roles").select("id, name, permissions, is_owner").order("name"),
    supabase.from("profiles").select("id, full_name, status, role_id, roles(name, is_owner)"),
  ]);

  const roles: Role[] = (rawRoles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    modules: r.is_owner
      ? [...ALL_MODULES]
      : roleModules(r.permissions, (k) => DB_TO_PORTAL_MODULE[k]),
    fixed: !!r.is_owner,
  }));

  const team: Employee[] = (rawProfiles ?? []).map((p) => {
    const role = p.roles as { name?: string; is_owner?: boolean } | null;
    return {
      id: p.id,
      name: p.full_name ?? "Sem nome",
      // O e-mail vive em `auth.users`, fora do alcance do RLS do portal.
      // Ver a análise: falta uma coluna ou uma view que o exponha.
      email: "",
      role: role?.name ?? "Sem tipo de acesso",
      active: p.status === "active",
      owner: !!role?.is_owner,
    };
  });

  return { roles, team };
}

const ALL_MODULES: ModuleKey[] = [
  "sales",
  "products",
  "stock",
  "register",
  "costs",
  "reports",
];

/* -------------------------------------------------------------------------- */
/* Suporte                                                                     */
/* -------------------------------------------------------------------------- */

export async function readTickets(supabase: Customer): Promise<Ticket[]> {
  const { data } = await supabase
    .from("support_tickets")
    .select(
      "id, subject, category, status, last_message_at, created_at, support_messages(id, sender_side, body, attachment_url, read_by_recipient, created_at)",
    )
    .order("last_message_at", { ascending: false });

  return (data ?? []).map((t) => {
    const messages = (t.support_messages ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((m) => ({
        id: m.id,
        author: authorFromDb(m.sender_side),
        d: daysAgo(m.created_at),
        time: timeOf(m.created_at),
        text: m.body,
        attachment: m.attachment_url ?? "",
      }));

    return {
      id: t.id,
      protocol: protocolOf(t.id),
      subject: t.subject,
      category: t.category ?? "Dúvida",
      status: statusFromDb(t.status),
      // "Nova resposta" é uma mensagem do suporte que o cliente ainda não leu.
      unread: (t.support_messages ?? []).some(
        (m) => authorFromDb(m.sender_side) === "support" && !m.read_by_recipient,
      ),
      messages,
    };
  });
}
