import type { Chamado, ConfigItem, Pagamento, ReceitaMes } from "@/types/types";

/**
 * Dados de exemplo do protótipo — o que AINDA não tem tabela no Supabase.
 *
 * Já saíram daqui, substituídos por dados reais:
 *   * `CLIENTES`  → tabela `tenants`, lida em `lib/clientes.ts`;
 *   * `MODULOS` e `PLANOS` → catálogo real em `lib/planos.ts`, adaptado para as
 *     telas em `lib/catalogo.ts`.
 *
 * O que sobra abaixo sustenta as telas de Financeiro, Suporte e Configurações,
 * que ainda não têm tabela correspondente. Não apague sem antes ligar a tela.
 *
 * ATENÇÃO aos ids: `PAGAMENTOS` e `CHAMADOS` são chaveados por id de cliente,
 * e os clientes reais têm UUID. Nenhuma dessas chaves ("1", "2"…) casa com um
 * cliente do banco — de propósito, porque esse dado não existe lá. As telas
 * degradam para "sem pagamento" / nome genérico em vez de quebrar.
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
    valor: ["vendas", "produtos"],
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

export const CHAMADOS: Chamado[] = [
  {
    id: "t1",
    clienteId: "1",
    assunto: {
      pt: "Não consigo fechar o caixa do dia",
      en: "Cannot close the daily cash register",
    },
    status: "aberto",
    prioridade: "alta",
    data: "24/07/2026",
    msgs: [
      {
        de: "cliente",
        texto: {
          pt: "Bom dia! Quando aperto em fechar caixa aparece uma mensagem de erro e o valor não salva. Já tentei em dois celulares.",
          en: "Good morning! When I tap close register an error shows up and the amount is not saved. I tried on two phones.",
        },
        quando: "24/07 · 09:05",
      },
      {
        de: "admin",
        texto: {
          pt: "Bom dia, Neide! Recebi seu chamado. Vou verificar o fechamento de ontem aqui no painel e já te retorno.",
          en: "Good morning, Neide! I got your ticket. I will check yesterday closing here in the panel and get back to you.",
        },
        quando: "24/07 · 09:18",
      },
      {
        de: "cliente",
        texto: {
          pt: "Obrigada! Preciso disso ainda hoje porque o movimento da feira começa às 15h.",
          en: "Thank you! I need it today because the market rush starts at 3pm.",
        },
        quando: "24/07 · 09:26",
      },
    ],
  },
  {
    id: "t2",
    clienteId: "2",
    assunto: {
      pt: "Relatório mensal com produto duplicado",
      en: "Monthly report shows a duplicated product",
    },
    status: "andamento",
    prioridade: "media",
    data: "23/07/2026",
    msgs: [
      {
        de: "cliente",
        texto: {
          pt: "No relatório de julho a ração Golden aparece duas vezes, com quantidades diferentes.",
          en: "In the July report the Golden pet food appears twice, with different amounts.",
        },
        quando: "23/07 · 14:02",
      },
      {
        de: "admin",
        texto: {
          pt: "Identificamos dois cadastros com o mesmo nome. Vou unificar e reprocessar o relatório.",
          en: "We found two records with the same name. I will merge them and reprocess the report.",
        },
        quando: "23/07 · 16:40",
      },
    ],
  },
  {
    id: "t3",
    clienteId: "3",
    assunto: {
      pt: "Como ativar o módulo Estoque?",
      en: "How do I enable the Inventory module?",
    },
    status: "aberto",
    prioridade: "baixa",
    data: "23/07/2026",
    msgs: [
      {
        de: "cliente",
        texto: {
          pt: "Vi o módulo Estoque na apresentação mas não encontro no meu app. Preciso pagar?",
          en: "I saw the Inventory module in the presentation but cannot find it in my app. Do I need to pay?",
        },
        quando: "23/07 · 10:11",
      },
    ],
  },
  {
    id: "t4",
    clienteId: "4",
    assunto: {
      pt: "Erro ao cadastrar preço com desconto",
      en: "Error when saving a discounted price",
    },
    status: "andamento",
    prioridade: "alta",
    data: "22/07/2026",
    msgs: [
      {
        de: "cliente",
        texto: {
          pt: "Ao colocar desconto acima de 50% o app trava na tela de salvar.",
          en: "When I set a discount above 50% the app freezes on the save screen.",
        },
        quando: "22/07 · 08:33",
      },
      {
        de: "admin",
        texto: {
          pt: "Reproduzimos o erro e a correção entra na atualização desta semana.",
          en: "We reproduced the bug and the fix ships in this week update.",
        },
        quando: "22/07 · 11:57",
      },
    ],
  },
  {
    id: "t5",
    clienteId: "6",
    assunto: { pt: "Pedido de nota fiscal do plano", en: "Invoice request for the plan" },
    status: "resolvido",
    prioridade: "baixa",
    data: "21/07/2026",
    msgs: [
      {
        de: "cliente",
        texto: {
          pt: "Preciso da nota fiscal de julho para a contabilidade.",
          en: "I need the July invoice for accounting.",
        },
        quando: "21/07 · 17:20",
      },
      {
        de: "admin",
        texto: {
          pt: "Nota enviada para o e-mail cadastrado. Qualquer coisa, é só responder aqui.",
          en: "Invoice sent to your registered email. Just reply here if you need anything else.",
        },
        quando: "21/07 · 18:02",
      },
    ],
  },
  {
    id: "t6",
    clienteId: "9",
    assunto: {
      pt: "Adicionar segundo usuário na conta",
      en: "Add a second user to the account",
    },
    status: "resolvido",
    prioridade: "media",
    data: "18/07/2026",
    msgs: [
      {
        de: "cliente",
        texto: {
          pt: "Meu sócio precisa acessar o caixa também.",
          en: "My partner also needs access to the register.",
        },
        quando: "18/07 · 09:44",
      },
      {
        de: "admin",
        texto: {
          pt: "Segundo acesso liberado no plano Pago, sem custo adicional.",
          en: "Second seat enabled on the Paid plan at no extra cost.",
        },
        quando: "18/07 · 10:15",
      },
    ],
  },
];

/** "Today" in the seeded dataset — the header date and manual payment entries. */
export const HOJE = "24/07/2026";
export const HOJE_ROTULO = "24 jul 2026";
