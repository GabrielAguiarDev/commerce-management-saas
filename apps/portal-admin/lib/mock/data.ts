import type {
  Chamado,
  Cliente,
  ConfigItem,
  Modulo,
  Pagamento,
  Plano,
  ReceitaMes,
} from "@/types/types";

/**
 * Seed data for the console. This is the demo dataset that shipped with the
 * design — swap these exports for API calls when the backend lands; nothing
 * else in the console reads from the network.
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
export const PAGAMENTOS: Record<number, Pagamento> = {
  1: {
    status: "emdia",
    ultimo: "05/07/2026",
    vencimento: "05/08/2026",
    hist: [
      ["05/07/2026", "R$ 89,00"],
      ["05/06/2026", "R$ 89,00"],
      ["05/05/2026", "R$ 89,00"],
    ],
  },
  2: {
    status: "atrasado",
    ultimo: "04/06/2026",
    vencimento: "04/07/2026",
    hist: [
      ["04/06/2026", "R$ 149,00"],
      ["04/05/2026", "R$ 149,00"],
    ],
  },
  4: {
    status: "emdia",
    ultimo: "18/07/2026",
    vencimento: "18/08/2026",
    hist: [
      ["18/07/2026", "R$ 89,00"],
      ["18/06/2026", "R$ 89,00"],
    ],
  },
  6: {
    status: "pendente",
    ultimo: "02/07/2026",
    vencimento: "02/08/2026",
    hist: [["02/07/2026", "R$ 89,00"]],
  },
  9: {
    status: "emdia",
    ultimo: "15/07/2026",
    vencimento: "15/08/2026",
    hist: [
      ["15/07/2026", "R$ 149,00"],
      ["15/06/2026", "R$ 149,00"],
    ],
  },
};

export const MODULOS: Modulo[] = [
  {
    k: "vendas",
    nome: { pt: "Vendas", en: "Sales" },
    sigla: "VD",
    desc: {
      pt: "Registro de vendas no balcão e por delivery, com histórico diário.",
      en: "Counter and delivery sales logging with a daily history.",
    },
    planos: ["Gratuito", "Pago", "Customizado"],
  },
  {
    k: "produtos",
    nome: { pt: "Produtos", en: "Products" },
    sigla: "PR",
    desc: {
      pt: "Catálogo com preços, variações e categorias do comércio.",
      en: "Catalog with prices, variants and store categories.",
    },
    planos: ["Gratuito", "Pago", "Customizado"],
  },
  {
    k: "custos",
    nome: { pt: "Custos", en: "Costs" },
    sigla: "CT",
    desc: {
      pt: "Lançamento de despesas fixas e variáveis, com margem por produto.",
      en: "Fixed and variable expenses with per-product margin.",
    },
    planos: ["Pago", "Customizado"],
  },
  {
    k: "relatorios",
    nome: { pt: "Relatórios", en: "Reports" },
    sigla: "RL",
    desc: {
      pt: "Fechamento por período, ranking de produtos e exportação em PDF.",
      en: "Period closing, product ranking and PDF export.",
    },
    planos: ["Pago", "Customizado"],
  },
  {
    k: "estoque",
    nome: { pt: "Estoque", en: "Inventory" },
    sigla: "ES",
    desc: {
      pt: "Controle de entradas, saídas e alerta de estoque mínimo.",
      en: "Inbound, outbound and low-stock alerts.",
    },
    planos: ["Pago", "Customizado"],
  },
  {
    k: "caixa",
    nome: { pt: "Caixa", en: "Register" },
    sigla: "CX",
    desc: {
      pt: "Abertura e fechamento de caixa com conferência de valores.",
      en: "Open and close the register with amount reconciliation.",
    },
    planos: ["Gratuito", "Pago", "Customizado"],
  },
  {
    k: "app",
    tipo: "acesso",
    nome: { pt: "App", en: "App" },
    sigla: "AP",
    desc: {
      pt: "Libera o acesso ao aplicativo mobile: o cliente instala o app, faz login e registra vendas mesmo sem internet, sincronizando depois.",
      en: "Unlocks access to the mobile app: the customer installs it, signs in and records sales offline, syncing later.",
    },
    planos: ["Pago", "Customizado"],
  },
];

export const PLANOS: Plano[] = [
  {
    k: "Gratuito",
    nome: { pt: "Gratuito", en: "Free" },
    tipo: "fixo",
    preco: "R$ 0",
    desc: {
      pt: "Entrada para comércios pequenos: vendas, catálogo de produtos e caixa simples. Sem relatórios nem estoque.",
      en: "Entry tier for small shops: sales, product catalog and a simple register. No reports or inventory.",
    },
    mods: ["vendas", "produtos", "caixa"],
  },
  {
    k: "Pago",
    nome: { pt: "Pago", en: "Paid" },
    tipo: "fixo",
    preco: "R$ 89",
    desc: {
      pt: "Todos os módulos liberados, relatórios exportáveis, controle de custos e estoque com alerta mínimo.",
      en: "All modules unlocked, exportable reports, cost control and inventory with low-stock alerts.",
    },
    mods: ["vendas", "produtos", "custos", "relatorios", "estoque", "caixa", "app"],
  },
  {
    k: "Customizado",
    nome: { pt: "Customizado", en: "Custom" },
    tipo: "custom",
    preco: null,
    desc: {
      pt: "Para redes e operações maiores: todos os módulos, suporte prioritário e mensalidade negociada caso a caso na ficha do cliente.",
      en: "For chains and larger operations: all modules, priority support and a monthly fee negotiated per customer in their record.",
    },
    mods: ["vendas", "produtos", "custos", "relatorios", "estoque", "caixa", "app"],
  },
];

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

export const CLIENTES: Cliente[] = [
  {
    id: 1,
    nome: "Acarajé da Bahia",
    segmento: { pt: "Alimentação · Ambulante", en: "Food · Street vendor" },
    plano: "Pago",
    status: "ativo",
    data: "12/03/2026",
    cidade: "Salvador, BA",
    resp: "Neide Souza",
    valor: "R$ 89,00",
    mods: ["vendas", "produtos", "caixa", "custos", "app"],
  },
  {
    id: 2,
    nome: "Petshop Amigo Fiel",
    segmento: { pt: "Petshop", en: "Pet shop" },
    plano: "Customizado",
    status: "ativo",
    data: "04/02/2026",
    cidade: "Recife, PE",
    resp: "Marcos Vieira",
    valor: "R$ 149,00",
    mods: ["vendas", "produtos", "estoque", "relatorios", "caixa", "app"],
  },
  {
    id: 3,
    nome: "Mercadinho São Jorge",
    segmento: { pt: "Mercearia", en: "Grocery" },
    plano: "Gratuito",
    status: "ativo",
    data: "21/05/2026",
    cidade: "Feira de Santana, BA",
    resp: "Jorge Lima",
    valor: "—",
    mods: ["vendas", "produtos"],
  },
  {
    id: 4,
    nome: "Salão Beleza Rara",
    segmento: { pt: "Beleza e estética", en: "Beauty salon" },
    plano: "Pago",
    status: "ativo",
    data: "18/01/2026",
    cidade: "Aracaju, SE",
    resp: "Cláudia Menezes",
    valor: "R$ 89,00",
    mods: ["vendas", "caixa", "relatorios"],
  },
  {
    id: 5,
    nome: "Bike Service Recife",
    segmento: { pt: "Oficina", en: "Bike workshop" },
    plano: "Gratuito",
    status: "inativo",
    data: "09/11/2025",
    cidade: "Recife, PE",
    resp: "Tiago Alencar",
    valor: "—",
    mods: ["vendas"],
  },
  {
    id: 6,
    nome: "Doceria Dona Zilda",
    segmento: { pt: "Confeitaria", en: "Bakery" },
    plano: "Pago",
    status: "ativo",
    data: "02/07/2026",
    cidade: "Maceió, AL",
    resp: "Zilda Ferreira",
    valor: "R$ 89,00",
    mods: ["vendas", "produtos", "custos", "caixa"],
  },
  {
    id: 7,
    nome: "Barbearia Nova Era",
    segmento: { pt: "Barbearia", en: "Barber shop" },
    plano: "Gratuito",
    status: "ativo",
    data: "27/06/2026",
    cidade: "Salvador, BA",
    resp: "Ed Carvalho",
    valor: "—",
    mods: ["vendas", "caixa"],
  },
  {
    id: 8,
    nome: "Hortifruti Vale Verde",
    segmento: { pt: "Hortifrúti", en: "Greengrocer" },
    plano: "Gratuito",
    status: "inativo",
    data: "30/04/2026",
    cidade: "Lauro de Freitas, BA",
    resp: "Ana Paula Reis",
    valor: "—",
    mods: ["vendas", "estoque"],
  },
  {
    id: 9,
    nome: "Lava-Jato Cristal",
    segmento: { pt: "Serviços automotivos", en: "Car wash" },
    plano: "Customizado",
    status: "ativo",
    data: "15/06/2026",
    cidade: "Camaçari, BA",
    resp: "Ivan Nogueira",
    valor: "R$ 149,00",
    mods: ["vendas", "caixa", "custos", "relatorios"],
  },
  {
    id: 10,
    nome: "Costura & Cia",
    segmento: { pt: "Ateliê", en: "Tailoring" },
    plano: "Gratuito",
    status: "ativo",
    data: "08/07/2026",
    cidade: "Ilhéus, BA",
    resp: "Rita Barros",
    valor: "—",
    mods: ["vendas", "produtos"],
  },
];

export const CHAMADOS: Chamado[] = [
  {
    id: "t1",
    clienteId: 1,
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
    clienteId: 2,
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
    clienteId: 3,
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
    clienteId: 4,
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
    clienteId: 6,
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
    clienteId: 9,
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
