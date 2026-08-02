import type { ConfigItem, Pagamento, ReceitaMes } from "@/types/types";

/**
 * Dados de exemplo do protótipo — o que AINDA não tem tabela no Supabase.
 *
 * ┌─ TODO: conectar ao Supabase ───────────────────────────────────────────┐
 * │ Tudo neste arquivo depende de tabela que NÃO EXISTE no banco hoje:     │
 * │                                                                        │
 * │   * `RECEITA` e `PAGAMENTOS` → falta uma tabela de pagamentos/faturas  │
 * │     da plataforma (mensalidade que cada tenant paga à Aguiar One).     │
 * │     Alimentam a tela Financeiro inteira.                               │
 * │   * `CONFIGS` → falta uma tabela de configurações da plataforma.       │
 * │     Alimenta a tela Configurações.                                     │
 * │                                                                        │
 * │ Enquanto a tabela não existir, apagar isto QUEBRA as duas telas. O     │
 * │ caminho é criar a migration com RLS, escrever o `lib/` de leitura (nos │
 * │ moldes de `lib/clientes.ts`) e só então remover a constante daqui.     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Já saíram daqui, substituídos por dados reais:
 *   * `CLIENTES` → tabela `tenants`, lida em `lib/clientes.ts`;
 *   * `CHAMADOS` → `support_tickets` + `support_messages`, em `lib/chamados.ts`;
 *   * `MODULOS` e `PLANOS` → catálogo real em `lib/planos.ts`, adaptado para as
 *     telas em `lib/catalogo.ts`;
 *   * `HOJE` / `HOJE_ROTULO` → data de verdade, em `lib/datas.ts`.
 *
 * ATENÇÃO aos ids: `PAGAMENTOS` é chaveado por id de cliente, e os clientes
 * reais têm UUID. Nenhuma dessas chaves ("1", "2"…) casa com um cliente do
 * banco — de propósito, porque esse dado não existe lá. A tela degrada para
 * "sem pagamento" em vez de quebrar.
 */

export const RECEITA: ReceitaMes[] = [
  { mes: { pt: "fev", en: "Feb" }, valor: 327 },
  { mes: { pt: "mar", en: "Mar" }, valor: 416 },
  { mes: { pt: "abr", en: "Apr" }, valor: 416 },
  { mes: { pt: "mai", en: "May" }, valor: 505 },
  { mes: { pt: "jun", en: "Jun" }, valor: 565 },
  { mes: { pt: "jul", en: "Jul" }, valor: 476 },
];

/** Keyed by customer id. Customers absent here have never been billed. */
export const PAGAMENTOS: Record<string, Pagamento> = {
  "1": {
    status: "emdia",
    ultimo: "05/07/2026",
    vencimento: "05/08/2026",
    hist: [
      ["05/07/2026", "R$ 89,00"],
      ["05/06/2026", "R$ 89,00"],
      ["05/05/2026", "R$ 89,00"],
    ],
  },
  "2": {
    status: "atrasado",
    ultimo: "04/06/2026",
    vencimento: "04/07/2026",
    hist: [
      ["04/06/2026", "R$ 149,00"],
      ["04/05/2026", "R$ 149,00"],
    ],
  },
  "4": {
    status: "emdia",
    ultimo: "18/07/2026",
    vencimento: "18/08/2026",
    hist: [
      ["18/07/2026", "R$ 89,00"],
      ["18/06/2026", "R$ 89,00"],
    ],
  },
  "6": {
    status: "pendente",
    ultimo: "02/07/2026",
    vencimento: "02/08/2026",
    hist: [["02/07/2026", "R$ 89,00"]],
  },
  "9": {
    status: "emdia",
    ultimo: "15/07/2026",
    vencimento: "15/08/2026",
    hist: [
      ["15/07/2026", "R$ 149,00"],
      ["15/06/2026", "R$ 149,00"],
    ],
  },
};

export const CONFIGS: ConfigItem[] = [
  {
    id: "padrao",
    rotulo: { pt: "Módulos padrão no cadastro", en: "Default modules at signup" },
    tipo: "mods",
    // Chaves da tabela `modules`. Antes estavam em português ("vendas",
    // "produtos"), que não casa com nada — a tela mostrava a chave crua.
    valor: ["sales", "products"],
  },
  {
    id: "teste",
    rotulo: { pt: "Período de teste do plano Pago", en: "Paid plan trial period" },
    tipo: "numero",
    valor: 14,
  },
  {
    id: "aviso",
    rotulo: {
      pt: "Notificar quando um cliente ficar inativo",
      en: "Notify when a customer goes inactive",
    },
    tipo: "select",
    valor: "email",
    opcoes: [
      ["email", { pt: "E-mail", en: "Email" }],
      ["whatsapp", { pt: "WhatsApp", en: "WhatsApp" }],
      ["nao", { pt: "Não notificar", en: "Do not notify" }],
    ],
  },
  {
    id: "idioma",
    rotulo: { pt: "Idioma padrão do painel", en: "Default panel language" },
    tipo: "select",
    valor: "pt",
    opcoes: [
      ["pt", { pt: "Português (BR)", en: "Portuguese (BR)" }],
      ["en", { pt: "Inglês", en: "English" }],
    ],
  },
];
