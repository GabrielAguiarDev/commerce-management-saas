/**
 * Todo o texto da página, num lugar só.
 *
 * `pt` é a fonte da verdade — é o que o visitante lê — e `en` é conferido
 * contra ele pelo tipo, então uma tradução que falta vira erro de compilação e
 * não um rótulo em branco na tela.
 *
 * Página de marketing é o texto: cada palavra daqui é reescrita muitas vezes
 * antes de a página parar de mudar. Mantê-lo fora dos componentes é o que
 * permite mexer na copy sem abrir nove arquivos de layout — e o que deixa
 * evidente, ao ler este arquivo de cima a baixo, o que a página promete.
 *
 * A página é servida em pt-BR e ainda não tem troca de idioma; `COPY` aponta
 * direto para `pt`. Quando a troca chegar, ela lê de `DIC`.
 */

const pt = {
  brand: "Aguiar One",

  nav: {
    /* Só para leitor de tela: nomeia a barra do topo na lista de regiões. */
    label: "Navegação principal",
    modules: "Módulos",
    plans: "Planos",
    cta: "Começar grátis",
  },

  hero: {
    badge: "Tudo num lugar só",
    title: "Gestão simples e completa para o seu comércio",
    subtitle:
      "Registre vendas, controle custos e veja seu lucro de verdade — num sistema que você monta do jeito que o seu negócio precisa.",
    ctaPrimary: "Começar grátis",
    ctaSecondary: "Ver como funciona →",
    note: "Plano gratuito para sempre · Sem cartão de crédito · Funciona no celular",
    /* O painel é uma ilustração: números de exemplo, não dados de ninguém. */
    panel: {
      caption: "Painel · Hoje",
      sales: "Vendas do dia",
      salesValue: "R$ 1.240",
      costs: "Custos",
      costsValue: "R$ 480",
      profit: "Lucro",
      profitValue: "R$ 760",
      chartTitle: "Últimos 7 dias",
      chartDelta: "+18% vs. semana passada",
      tagSales: "Vendas ativado",
      tagCosts: "Custos ativado",
      tagStock: "+ Estoque",
      /* Lido por leitor de tela no lugar da ilustração inteira. */
      alt: "Ilustração do painel do Aguiar One, mostrando vendas, custos e lucro do dia e um gráfico dos últimos sete dias.",
    },
  },

  audiences: {
    eyebrow: "Para quem é",
    title: "Feito para o comércio de verdade",
    subtitle:
      "Do carrinho de acarajé ao petshop do bairro: cada negócio ativa só os recursos que usa e desliga o resto.",
    items: [
      {
        title: "Acarajé, lanches e food",
        text: "Só quer registrar cada venda e saber quanto sobrou no fim do dia. Simples assim.",
        note: "Vendas · Custos · Lucro do dia",
      },
      {
        title: "Petshop e lojas",
        text: "Precisa saber o que tem na prateleira, controlar o caixa e não perder venda por falta de produto.",
        note: "Estoque · Caixa · Relatórios",
      },
      {
        title: "O seu comércio",
        text: "Barbearia, mercadinho, ateliê, oficina. Você escolhe os módulos e o sistema se ajusta ao seu jeito de trabalhar.",
        note: "Você monta do seu jeito",
      },
    ],
  },

  modules: {
    eyebrow: "Módulos",
    title: "Monte o sistema do jeito do seu negócio",
    subtitle:
      "Ligue só o que faz sentido hoje. Quando o negócio crescer, ative o resto em um clique.",
    link: "Ver o que vem em cada plano →",
    freeTag: "No plano grátis",
    paidTag: "Plano pago",
    /* A ORDEM DESTA LISTA É CONTRATO: `MODULE_PANELS`, em
       `components/ModulePanels.tsx`, tem um painel por item e casa por
       posição. Reordenar aqui sem reordenar lá troca as ilustrações de lugar. */
    items: [
      {
        title: "Registro de vendas",
        text: "Anote cada venda em segundos, no balcão ou pelo celular, com forma de pagamento.",
        free: true,
      },
      {
        title: "Controle de custos",
        text: "Registre compras, gás, aluguel e insumos para saber o custo real de cada dia.",
        free: true,
      },
      {
        title: "Relatórios e lucro",
        text: "Veja quanto entrou, quanto saiu e quanto sobrou por dia, semana ou mês.",
        free: true,
      },
      {
        title: "Controle de estoque",
        text: "Saiba o que tem, o que está acabando e receba aviso antes de faltar produto.",
        free: false,
      },
      {
        title: "Caixa",
        text: "Abertura e fechamento de caixa com conferência do dinheiro no fim do turno.",
        free: false,
      },
    ],
    custom: {
      title: "Só o que você precisa",
      text: "Desligue módulos que não usa. Sua tela fica limpa e o time não se perde.",
      cta: "Começar grátis →",
    },
    /* As ilustrações que acompanham cada módulo. São TELAS INVENTADAS, como a
       da primeira dobra: nenhum número aqui vem de lugar nenhum. Os valores
       conversam entre si de propósito — R$ 1.240 de venda, R$ 480 de custo,
       R$ 760 de lucro são os MESMOS da primeira dobra, e a semana do relatório
       é esse dia vezes sete. É o mesmo comércio fictício do começo ao fim da
       página; números que se contradizem entre um painel e outro são a primeira
       coisa que alguém atento percebe.

       Cada painel traz um `alt`: a ilustração inteira é `aria-hidden`, e quem
       ouve a página recebe uma frase em vez de trinta números soltos. */
    panels: {
      sales: {
        caption: "Vendas · Hoje",
        rows: [
          { time: "14:32", item: "Combo executivo", value: "R$ 32,00", pay: "Pix" },
          { time: "14:05", item: "Acarajé completo", value: "R$ 18,00", pay: "Dinheiro" },
          { time: "13:48", item: "Refrigerante lata", value: "R$ 6,00", pay: "Cartão" },
        ],
        totalLabel: "Total do dia",
        totalValue: "R$ 1.240",
        alt: "Ilustração do registro de vendas: as últimas três vendas do dia, cada uma com horário, item, valor e forma de pagamento, e o total do dia.",
      },
      costs: {
        caption: "Custos · Hoje",
        rows: [
          { item: "Insumos e compras", value: "R$ 240,00" },
          { item: "Aluguel (rateio do dia)", value: "R$ 150,00" },
          { item: "Gás", value: "R$ 90,00" },
        ],
        totalLabel: "Custo do dia",
        totalValue: "R$ 480",
        alt: "Ilustração do controle de custos: insumos, aluguel e gás lançados no dia, somando o custo total do dia.",
      },
      reports: {
        caption: "Relatório",
        periods: ["Dia", "Semana", "Mês"],
        inLabel: "Entrou",
        inValue: "R$ 8.680",
        outLabel: "Saiu",
        outValue: "R$ 3.360",
        leftLabel: "Sobrou",
        leftValue: "R$ 5.320",
        chartTitle: "Lucro por dia",
        alt: "Ilustração dos relatórios: quanto entrou, quanto saiu e quanto sobrou na semana, com um gráfico do lucro de cada dia.",
      },
      stock: {
        caption: "Estoque",
        rows: [
          { item: "Refrigerante lata", qty: "48 un" },
          { item: "Pão de hambúrguer", qty: "60 un" },
          { item: "Óleo de soja", qty: "3 un" },
        ],
        lowTag: "Acabando",
        alertLabel: "Aviso enviado quando o produto chega no mínimo.",
        alt: "Ilustração do controle de estoque: três produtos com a quantidade em prateleira, o último marcado como acabando, e o aviso que é enviado antes de faltar.",
      },
      cash: {
        caption: "Caixa · Fechamento",
        rows: [
          { item: "Abertura do turno", value: "R$ 200,00" },
          { item: "Vendas em dinheiro", value: "R$ 620,00" },
        ],
        expectedLabel: "Esperado em caixa",
        expectedValue: "R$ 820,00",
        countedLabel: "Contado",
        countedValue: "R$ 820,00",
        okTag: "Confere",
        alt: "Ilustração do caixa: abertura do turno e vendas em dinheiro somando o esperado em caixa, o valor contado no fim do turno e a conferência sem diferença.",
      },
    },
  },

  /**
   * A dobra dos números, que hoje ocupa o lugar de `how` na página.
   *
   * TEXTO PROVISÓRIO — TODO ELE. Os quatro rótulos e as quatro frases são os
   * marcadores combinados; o olho-mágico, a manchete e o subtítulo foram
   * escritos para a dobra não ficar sem abertura, já que toda outra dobra da
   * página tem uma. Nada aqui é definitivo.
   *
   * O NÚMERO É UM NÚMERO, e não um pedaço da string. `prefix` e `suffix` são o
   * que NÃO anima: só `value` sobe de zero. É o que permite "R$ 0" e "2 min"
   * contarem sem que a formatação se desmonte — ver `components/CountUp.tsx`.
   *
   * `value: 5` é o número de módulos de `modules.items` logo acima. Se um
   * módulo entrar ou sair de lá, este 5 muda junto: a página não pode prometer
   * cinco e listar seis.
   */
  numbers: {
    eyebrow: "Em números",
    title: "O que você tem no primeiro dia",
    subtitle:
      "Sem contrato, sem cartão e sem instalar nada. O que está aqui embaixo vale a partir do minuto em que você criar a conta.",
    items: [
      {
        prefix: "",
        value: 5,
        suffix: "",
        label: "Módulos disponíveis",
        text: "Ative só o que o seu comércio precisa",
      },
      {
        prefix: "R$ ",
        value: 0,
        suffix: "",
        label: "Para começar",
        text: "Plano gratuito para sempre, sem cartão",
      },
      {
        prefix: "",
        value: 2,
        suffix: " min",
        label: "Para configurar",
        text: "Cadastre o negócio e comece a vender",
      },
      {
        prefix: "",
        value: 100,
        suffix: "%",
        label: "No celular",
        text: "Funciona no balcão, na rua ou em casa",
      },
    ],
  },

  /**
   * FORA DA PÁGINA desde a dobra dos números. O componente continua no
   * repositório e este texto continua aqui, de propósito: voltar atrás é uma
   * linha em `app/page.tsx`. Ver a nota no topo de `components/HowItWorks.tsx`.
   */
  how: {
    eyebrow: "Como funciona",
    title: "Em pé no mesmo dia, em três passos",
    steps: [
      {
        title: "Cadastre seu negócio",
        text: "Nome, tipo de comércio e pronto. Leva menos de dois minutos e não pede cartão.",
      },
      {
        title: "Configure seus produtos",
        text: "Cadastre o que você vende, com preço e custo. Escolha os módulos que vai usar.",
      },
      {
        title: "Registre e acompanhe",
        text: "Anote as vendas do dia e veja seu lucro aparecer no painel, sem planilha.",
      },
    ],
  },

  plans: {
    eyebrow: "Planos",
    title: "Comece grátis, cresça quando fizer sentido",
    subtitle: "Sem contrato longo. Você pode mudar de plano ou sair quando quiser.",
    recommended: "Recomendado",
    /* Aparece no lugar do número em dois casos: um cartão ligado ao plano sob
       medida, que é negociado por cliente, e o socorro de `lib/vitrine.ts`,
       quando a consulta ao banco falha e a página publica a copy do código —
       que de propósito não carrega preço nenhum. */
    priceOnRequest: "Sob consulta",
    free: {
      name: "Gratuito",
      pitch: "Para quem quer organizar as vendas e enxergar o lucro.",
      price: "R$ 0",
      unit: "/ mês, para sempre",
      cta: "Começar grátis",
      features: [
        "Registro de vendas ilimitado",
        "Controle de custos",
        "Relatórios básicos de lucro",
        "Acesso pelo celular",
      ],
    },
    full: {
      name: "Completo",
      pitch: "Para quem tem estoque, caixa e quer decidir com números.",
      /* PENDENTE: o preço ainda não foi definido. O arquivo de design traz o
         mesmo marcador; trocar aqui publica o valor em toda a página. */
      price: "R$ XX",
      unit: "/ mês",
      cta: "Começar grátis e testar",
      features: [
        "Tudo do plano gratuito",
        "Controle de estoque com alertas",
        "Abertura e fechamento de caixa",
        "Relatórios avançados por produto",
        "Suporte prioritário",
      ],
    },
  },

  testimonial: {
    eyebrow: "Quem já usa",
    quote:
      "“Antes eu anotava tudo no caderno e nunca sabia se tinha lucro. Hoje fecho o dia em dois minutos e sei exatamente quanto sobrou.”",
    /* PENDENTE: depoimento real. Enquanto não houver um, os marcadores abaixo
       são os mesmos do arquivo de design. */
    name: "Nome do cliente",
    role: "Tipo de comércio · Cidade",
    photo: "foto",
  },

  finalCta: {
    title: "Seu comércio organizado a partir de hoje",
    subtitle:
      "Crie sua conta gratuita, registre as vendas de hoje e veja seu lucro no fim do dia.",
    primary: "Começar grátis",
    secondary: "Comparar planos",
    note: "Sem cartão de crédito · Cancele quando quiser",
  },

  footer: {
    about: "Sobre",
    contact: "Contato",
    terms: "Termos",
    copyright: "© 2026 Aguiar One · Tudo num lugar só",
  },

  meta: {
    title: "Aguiar One · Gestão simples e completa para o seu comércio",
    description:
      "Registre vendas, controle custos e veja o lucro do seu comércio todo dia. Comece grátis, sem cartão de crédito, e ative só os módulos que o seu negócio usa.",
  },
};

export type Dic = typeof pt;

const en: Dic = {
  brand: "Aguiar One",

  nav: {
    label: "Main navigation",
    modules: "Modules",
    plans: "Pricing",
    cta: "Start for free",
  },

  hero: {
    badge: "Everything in one place",
    title: "Simple, complete management for your shop",
    subtitle:
      "Record sales, track costs and see your real profit — in a system you assemble exactly the way your business needs.",
    ctaPrimary: "Start for free",
    ctaSecondary: "See how it works →",
    note: "Free plan forever · No credit card · Works on your phone",
    panel: {
      caption: "Dashboard · Today",
      sales: "Sales today",
      salesValue: "R$ 1,240",
      costs: "Costs",
      costsValue: "R$ 480",
      profit: "Profit",
      profitValue: "R$ 760",
      chartTitle: "Last 7 days",
      chartDelta: "+18% vs. last week",
      tagSales: "Sales enabled",
      tagCosts: "Costs enabled",
      tagStock: "+ Inventory",
      alt: "Illustration of the Aguiar One dashboard, showing the day's sales, costs and profit and a chart of the last seven days.",
    },
  },

  audiences: {
    eyebrow: "Who it is for",
    title: "Built for real high-street trade",
    subtitle:
      "From the street food cart to the pet shop down the road: every business turns on only the features it uses and switches off the rest.",
    items: [
      {
        title: "Street food and snacks",
        text: "You just want to record each sale and know what was left at the end of the day. That simple.",
        note: "Sales · Costs · Profit today",
      },
      {
        title: "Pet shops and retail",
        text: "You need to know what is on the shelf, keep the till in order and never lose a sale to an empty stockroom.",
        note: "Inventory · Till · Reports",
      },
      {
        title: "Your shop",
        text: "Barber shop, corner store, studio, workshop. You pick the modules and the system adapts to how you work.",
        note: "You put it together your way",
      },
    ],
  },

  modules: {
    eyebrow: "Modules",
    title: "Assemble the system your business needs",
    subtitle:
      "Turn on only what makes sense today. When the business grows, switch the rest on in one click.",
    link: "See what each plan includes →",
    freeTag: "On the free plan",
    paidTag: "Paid plan",
    items: [
      {
        title: "Sales entry",
        text: "Log every sale in seconds, at the counter or on your phone, with the payment method.",
        free: true,
      },
      {
        title: "Cost tracking",
        text: "Record purchases, gas, rent and supplies to know the real cost of each day.",
        free: true,
      },
      {
        title: "Reports and profit",
        text: "See what came in, what went out and what was left, by day, week or month.",
        free: true,
      },
      {
        title: "Inventory control",
        text: "Know what you have, what is running low, and get a warning before anything runs out.",
        free: false,
      },
      {
        title: "Till",
        text: "Open and close the till with a cash count at the end of every shift.",
        free: false,
      },
    ],
    custom: {
      title: "Only what you need",
      text: "Switch off the modules you do not use. Your screen stays clean and your team does not get lost.",
      cta: "Start for free →",
    },
    panels: {
      sales: {
        caption: "Sales · Today",
        rows: [
          { time: "14:32", item: "Set lunch", value: "R$ 32,00", pay: "Pix" },
          { time: "14:05", item: "Acarajé, the works", value: "R$ 18,00", pay: "Cash" },
          { time: "13:48", item: "Canned soft drink", value: "R$ 6,00", pay: "Card" },
        ],
        totalLabel: "Total today",
        totalValue: "R$ 1,240",
        alt: "Illustration of sales entry: the day's last three sales, each with time, item, amount and payment method, and the day's total.",
      },
      costs: {
        caption: "Costs · Today",
        rows: [
          { item: "Supplies and purchases", value: "R$ 240,00" },
          { item: "Rent (share of the day)", value: "R$ 150,00" },
          { item: "Gas", value: "R$ 90,00" },
        ],
        totalLabel: "Cost today",
        totalValue: "R$ 480",
        alt: "Illustration of cost tracking: supplies, rent and gas logged for the day, adding up to the day's total cost.",
      },
      reports: {
        caption: "Report",
        periods: ["Day", "Week", "Month"],
        inLabel: "In",
        inValue: "R$ 8,680",
        outLabel: "Out",
        outValue: "R$ 3,360",
        leftLabel: "Left",
        leftValue: "R$ 5,320",
        chartTitle: "Profit by day",
        alt: "Illustration of the reports: what came in, what went out and what was left over the week, with a chart of each day's profit.",
      },
      stock: {
        caption: "Inventory",
        rows: [
          { item: "Canned soft drink", qty: "48 units" },
          { item: "Burger buns", qty: "60 units" },
          { item: "Cooking oil", qty: "3 units" },
        ],
        lowTag: "Running low",
        alertLabel: "A warning goes out when a product hits its minimum.",
        alt: "Illustration of inventory control: three products with the amount on the shelf, the last one flagged as running low, and the warning sent before it runs out.",
      },
      cash: {
        caption: "Till · Closing",
        rows: [
          { item: "Opening float", value: "R$ 200,00" },
          { item: "Cash sales", value: "R$ 620,00" },
        ],
        expectedLabel: "Expected in the till",
        expectedValue: "R$ 820,00",
        countedLabel: "Counted",
        countedValue: "R$ 820,00",
        okTag: "Matches",
        alt: "Illustration of the till: opening float and cash sales adding up to the expected amount, the amount counted at the end of the shift, and the count matching with no difference.",
      },
    },
  },

  numbers: {
    eyebrow: "In numbers",
    title: "What you get on day one",
    subtitle:
      "No contract, no card and nothing to install. Everything below applies from the minute you create your account.",
    items: [
      {
        prefix: "",
        value: 5,
        suffix: "",
        label: "Modules available",
        text: "Turn on only what your shop needs",
      },
      {
        prefix: "R$ ",
        value: 0,
        suffix: "",
        label: "To get started",
        text: "Free plan forever, no card",
      },
      {
        prefix: "",
        value: 2,
        suffix: " min",
        label: "To set it up",
        text: "Register the business and start selling",
      },
      {
        prefix: "",
        value: 100,
        suffix: "%",
        label: "On your phone",
        text: "Works at the counter, on the road or at home",
      },
    ],
  },

  how: {
    eyebrow: "How it works",
    title: "Up and running the same day, in three steps",
    steps: [
      {
        title: "Register your business",
        text: "Name, type of trade, done. It takes under two minutes and asks for no card.",
      },
      {
        title: "Set up your products",
        text: "Add what you sell, with price and cost. Choose the modules you will use.",
      },
      {
        title: "Record and follow along",
        text: "Log the day's sales and watch your profit show up on the dashboard, no spreadsheet.",
      },
    ],
  },

  plans: {
    eyebrow: "Pricing",
    title: "Start free, grow when it makes sense",
    subtitle: "No long contract. You can change plan or leave whenever you want.",
    recommended: "Recommended",
    priceOnRequest: "On request",
    free: {
      name: "Free",
      pitch: "For anyone who wants to organise sales and see the profit.",
      price: "R$ 0",
      unit: "/ month, forever",
      cta: "Start for free",
      features: [
        "Unlimited sales entry",
        "Cost tracking",
        "Basic profit reports",
        "Access from your phone",
      ],
    },
    full: {
      name: "Complete",
      pitch: "For anyone with stock and a till who wants to decide with numbers.",
      price: "R$ XX",
      unit: "/ month",
      cta: "Start free and try it",
      features: [
        "Everything in the free plan",
        "Inventory control with alerts",
        "Opening and closing the till",
        "Advanced reports by product",
        "Priority support",
      ],
    },
  },

  testimonial: {
    eyebrow: "Already using it",
    quote:
      "“I used to write everything in a notebook and never knew if I had made a profit. Now I close the day in two minutes and know exactly what was left.”",
    name: "Customer name",
    role: "Type of trade · City",
    photo: "photo",
  },

  finalCta: {
    title: "Your shop organised starting today",
    subtitle:
      "Create your free account, record today's sales and see your profit at the end of the day.",
    primary: "Start for free",
    secondary: "Compare plans",
    note: "No credit card · Cancel whenever you want",
  },

  footer: {
    about: "About",
    contact: "Contact",
    terms: "Terms",
    copyright: "© 2026 Aguiar One · Everything in one place",
  },

  meta: {
    title: "Aguiar One · Simple, complete management for your shop",
    description:
      "Record sales, track costs and see your shop's profit every day. Start free, no credit card, and enable only the modules your business uses.",
  },
};

export const DIC = { pt, en };

/** O idioma servido hoje. A página inteira lê daqui. */
export const COPY: Dic = pt;
