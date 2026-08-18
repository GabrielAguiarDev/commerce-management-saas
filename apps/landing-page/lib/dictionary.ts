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
 *
 * ┌─ AS DUAS REGRAS QUE ESTA COPY SEGUE ───────────────────────────────────┐
 * │ 1. A PÁGINA NÃO ANUNCIA PREÇO FORA DA DOBRA DE PLANOS. Os cartões de   │
 * │    planos vêm do banco e são configurados no console (ver              │
 * │    `lib/vitrine.ts`): quem muda uma oferta muda lá, e a oferta muda.   │
 * │    Espalhar "R$ 0", "grátis para sempre" ou "sem cartão" pelas outras  │
 * │    seis dobras cria promessas que ninguém lembra de atualizar junto —  │
 * │    e o visitante encontra a página se contradizendo em duas rolagens.  │
 * │                                                                        │
 * │ 2. TUDO QUE A PÁGINA AFIRMA, O PRODUTO FAZ HOJE. O estoque baixa       │
 * │    sozinho na venda, o caixa compara esperado com contado, a compra de │
 * │    mercadoria vira custo, o menu monta pelos módulos do plano — está   │
 * │    tudo no portal do cliente. O que ainda não existe (fila de escrita  │
 * │    offline, por exemplo) não aparece aqui, mesmo sendo bom argumento.  │
 * └────────────────────────────────────────────────────────────────────────┘
 */

const pt = {
  brand: "Aguiar One",

  nav: {
    /* Só para leitor de tela: nomeia a barra do topo na lista de regiões. */
    label: "Navegação principal",
    modules: "Módulos",
    plans: "Planos",
    /* A CHAMADA É NEUTRA DE PROPÓSITO — aqui e nas outras cinco. Ela não diz
       "crie sua conta" (não há autocadastro publicado) nem "fale com a gente"
       (o destino ainda é a âncora da última dobra, ver `lib/links.ts`). Assim
       o dia em que `SIGNUP` virar a URL do cadastro não obriga a reescrever
       botão nenhum. */
    cta: "Comece hoje",
  },

  hero: {
    badge: "Tudo num lugar só",
    /* A MANCHETE SÃO TRÊS COISAS QUE O PRODUTO FAZ, na ordem do dia de quem
       está no balcão: registrar, saber o resultado, fechar. Vale mais que um
       adjetivo ("simples", "completo") porque é verificável — as três telas
       estão na dobra de módulos, logo abaixo. */
    title: "Registre a venda, veja o lucro, feche o caixa",
    subtitle:
      "Vendas, custos, estoque e caixa no mesmo lugar. Você liga só os módulos que o seu negócio usa e vê o resultado do dia sem abrir planilha.",
    ctaPrimary: "Comece hoje",
    /* O destino é a dobra "Em números" (a âncora `#como`), e o rótulo diz o
       que se encontra lá — não "como funciona", que é a dobra que saiu. */
    ctaSecondary: "Ver o que vem junto →",
    note: "Nada para instalar · Funciona no celular e no computador · Você escolhe os módulos",
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

  /**
   * AS MENSAGENS QUE OS BOTÕES DE "COMEÇAR" ESCREVEM NO WHATSAPP.
   *
   * As seis chamadas para ação da vitrine abrem a conversa com a primeira
   * mensagem pronta — e cada uma escreve a sua, de propósito: quem clica na
   * dobra de módulos está perguntando outra coisa de quem clica num cartão de
   * plano, e a conversa começa mais adiantada quando isso já vem escrito. É
   * qualificação de graça, e não enfeite.
   *
   * REGRAS PARA MEXER AQUI:
   *   · Elas são escritas na primeira pessoa DO VISITANTE, e não da empresa —
   *     quem manda a mensagem é ele.
   *   · Curtas. O texto vai dentro da URL e aparece inteiro na caixa de
   *     digitação do WhatsApp; um parágrafo ali parece formulário.
   *   · `plan` tem `{plano}`, trocado pelo nome do cartão em que a pessoa
   *     clicou (ver `components/Plans.tsx`). É o único com marcador.
   *
   * O número vem do banco; se ele faltar, os botões voltam a ser a âncora da
   * última dobra e nada disto é usado — ver `lib/whatsapp.ts`.
   */
  cta: {
    whatsapp: {
      header: "Olá! Vim pelo site do Aguiar One e quero começar a usar o sistema.",
      hero: "Olá! Vim pelo site do Aguiar One e quero organizar as vendas e os custos do meu comércio. Como faço para começar?",
      modules: "Olá! Vim pelo site do Aguiar One e queria montar o sistema só com os módulos que o meu negócio usa.",
      plan: "Olá! Vim pelo site do Aguiar One e tenho interesse no plano {plano}.",
      final: "Olá! Vim pelo site do Aguiar One e quero começar hoje. Pode me explicar os próximos passos?",
    },
  },

  audiences: {
    eyebrow: "Para quem é",
    /* O QUE ESTA DOBRA VENDE É O RECORTE. Sistema de gestão o visitante já viu;
       um feito para quem atende de pé, no balcão, com uma mão no produto, é o
       que separa esta página de um ERP. */
    title: "Feito para quem está no balcão, não no escritório",
    subtitle:
      "Da barraca de lanche à loja do bairro: cada negócio liga só os módulos que usa e desliga o resto.",
    items: [
      {
        title: "Comida e bebida",
        text: "Vender o dia inteiro e, no fim, saber quanto sobrou de verdade — depois do gás, do insumo e da feira.",
        note: "Vendas · Custos · Lucro do dia",
      },
      {
        title: "Lojas e mercadinhos",
        text: "Produto que acaba sem ninguém ver é venda perdida. O saldo cai a cada venda e o aviso chega antes de faltar.",
        note: "Estoque · Caixa · Relatórios",
      },
      {
        title: "O seu comércio",
        text: "Barbearia, salão, ateliê, oficina. Você escolhe os módulos e o sistema se ajusta ao seu jeito de trabalhar.",
        note: "Você monta do seu jeito",
      },
    ],
  },

  modules: {
    eyebrow: "Módulos",
    title: "Monte o sistema do jeito do seu negócio",
    subtitle:
      "Ligue só o que faz sentido hoje. Quando o negócio crescer, o resto entra sem trocar de sistema e sem recomeçar nada.",
    link: "Ver o que vem em cada plano →",
    /* Os rótulos falam do CARTÃO que o visitante vê logo abaixo, na dobra de
       planos, e os nomes de lá vêm do catálogo (`plans.name`, editável no
       console). Renomeou um plano lá? Estes dois rótulos vêm junto. */
    freeTag: "Plano gratuito",
    paidTag: "Plano pago",
    /* A ORDEM DESTA LISTA É CONTRATO: `MODULE_PANELS`, em
       `components/ModulePanels.tsx`, tem um painel por item e casa por
       posição. Reordenar aqui sem reordenar lá troca as ilustrações de lugar. */
    items: [
      {
        title: "Registro de vendas",
        text: "Anote a venda em segundos, no balcão ou pelo celular, com os itens e a forma de pagamento. Errou? Edite ou estorne sem apagar o histórico.",
        free: true,
      },
      {
        title: "Controle de custos",
        text: "Insumo, gás, aluguel, feira: cada gasto no dia certo. Compra de mercadoria vira custo sozinha, sem lançar duas vezes.",
        free: true,
      },
      {
        title: "Relatórios e lucro",
        text: "Quanto entrou, quanto saiu e quanto sobrou por dia, semana ou mês — e quais produtos puxam o resultado para cima.",
        free: true,
      },
      {
        title: "Controle de estoque",
        text: "O saldo baixa sozinho a cada venda. Entradas, saídas e ajustes ficam registrados, e o aviso chega quando o produto atinge o mínimo.",
        free: false,
      },
      {
        title: "Caixa",
        text: "Abre com o fundo do turno, registra sangria e reforço e, no fechamento, compara o esperado com o que foi contado na gaveta.",
        free: false,
      },
    ],
    custom: {
      title: "Só o que você precisa na tela",
      text: "Desligue os módulos que não usa e dê a cada pessoa da equipe acesso apenas ao que é o trabalho dela. Menos tela, menos erro, menos treino.",
      cta: "Montar o meu sistema →",
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
          { time: "14:05", item: "Prato feito", value: "R$ 18,00", pay: "Dinheiro" },
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
        caption: "Relatório · Semana",
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
        alertLabel: "O saldo cai a cada venda e o aviso sai no mínimo.",
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
   * OS QUATRO NÚMEROS NÃO FALAM DE PREÇO, e isso é regra e não acaso: o preço
   * é configurado no console e publicado na dobra de planos (ver o cabeçalho
   * deste arquivo). Um "R$ 0" escrito aqui seria uma segunda oferta, fora do
   * alcance de quem edita a primeira.
   *
   * O que eles afirmam, então, é o que não muda com a tabela de preços: quantos
   * módulos existem, que é um sistema só, que começar é questão de minutos e
   * que a coisa toda cabe num celular.
   *
   * O NÚMERO É UM NÚMERO, e não um pedaço da string. `prefix` e `suffix` são o
   * que NÃO anima: só `value` sobe de zero. É o que permite "2 min" e "100%"
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
      "Nada para instalar, nada para configurar por semanas. O que está aqui embaixo vale desde a primeira venda que você registrar.",
    items: [
      {
        prefix: "",
        value: 5,
        suffix: "",
        label: "Módulos para ligar",
        text: "Ative o que o seu comércio usa, desligue o resto",
      },
      {
        prefix: "",
        value: 1,
        suffix: "",
        label: "Lugar só",
        text: "Vendas, custos, estoque e caixa na mesma conta",
      },
      {
        prefix: "",
        value: 2,
        suffix: " min",
        label: "Para começar",
        text: "Cadastre o negócio e registre a primeira venda",
      },
      {
        prefix: "",
        value: 100,
        suffix: "%",
        label: "No celular",
        text: "Instala como aplicativo e abre no balcão ou na rua",
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
        text: "Nome, ramo e telefone. Leva menos de dois minutos e não exige nada instalado.",
      },
      {
        title: "Cadastre o que você vende",
        text: "Produto, preço e custo. Escolha os módulos que vai usar e desligue os outros.",
      },
      {
        title: "Registre e acompanhe",
        text: "Anote as vendas do dia e veja o lucro aparecer no painel, sem planilha.",
      },
    ],
  },

  plans: {
    eyebrow: "Planos",
    /* A MANCHETE NÃO ANUNCIA "GRÁTIS". Os cartões abaixo vêm do catálogo e
       mudam quando a oferta muda; uma manchete que promete um plano específico
       envelhece na primeira mudança de preço — e ela é fixa no código. */
    title: "Escolha o plano do tamanho do seu negócio",
    subtitle:
      "Você começa pelo essencial e liga o resto quando o movimento pedir. Sem contrato longo: dá para mudar de plano ou sair quando quiser.",
    recommended: "Recomendado",
    /* Aparece no lugar do número em dois casos: um cartão ligado ao plano sob
       medida, que é negociado por cliente, e o socorro de `lib/vitrine.ts`,
       quando a consulta ao banco falha e a página publica a copy do código —
       que de propósito não carrega preço nenhum. */
    priceOnRequest: "Sob consulta",
    /* ┌─ DAQUI PARA BAIXO É REDE DE SEGURANÇA, E NÃO A DOBRA ─────────────┐
       │ O que a página publica vem de `plan_showcase_public`. Estes dois  │
       │ cartões só aparecem se o banco não responder no build (ver        │
       │ `lib/vitrine.ts`), e nesse caso saem SEM PREÇO, com "Sob          │
       │ consulta" no lugar do número.                                     │
       │                                                                    │
       │ Por isso os itens abaixo dizem o que o SISTEMA faz, e não o que a  │
       │ oferta custa: eles precisam continuar verdadeiros mesmo meses      │
       │ depois de alguém remontar a tabela de preços no console.           │
       └────────────────────────────────────────────────────────────────────┘ */
    free: {
      name: "Gratuito",
      pitch: "Para quem quer parar de anotar no caderno e enxergar o lucro do dia.",
      price: "R$ 0",
      unit: "/ mês",
      cta: "Comece hoje",
      features: [
        "Registro de vendas ilimitado",
        "Cadastro de produtos com preço e custo",
        "Controle de custos do dia a dia",
        "Lucro por dia, semana e mês",
        "Funciona no celular e no computador",
      ],
    },
    full: {
      name: "Completo",
      pitch: "Para quem tem prateleira e gaveta de dinheiro para conferir todo dia.",
      price: "R$ XX",
      unit: "/ mês",
      cta: "Quero este plano",
      features: [
        "Tudo do plano gratuito",
        "Estoque com baixa automática e aviso de mínimo",
        "Caixa com sangria, reforço e conferência",
        "Relatórios por produto",
        "Acesso separado para cada pessoa da equipe",
      ],
    },
  },

  /**
   * ⚠️  PENDENTE — OS DOIS DEPOIMENTOS SÃO MARCADOR.
   *
   * Os dois clientes existem e toparam escrever; faltam o nome, o negócio, a
   * cidade, a foto e a frase de cada um. O que está aqui embaixo é um EXEMPLO
   * do tipo de frase que a dobra espera — ninguém disse isso.
   *
   * NÃO PUBLICAR ASSIM. Depoimento inventado com cara de real é o único texto
   * desta página que não dá para consertar depois de alguém ler.
   *
   * ┌─ O QUE TROCAR, QUANDO AS FRASES CHEGAREM ─────────────────────────────┐
   * │ `quote` — de preferência com um número dentro ("fecho o caixa em dois │
   * │   minutos", "parei de perder venda por falta de produto"). Número     │
   * │   concreto vale mais que três elogios.                                │
   * │ `name` — como a pessoa quer aparecer.                                 │
   * │ `role` — negócio · cidade. É o que faz o visitante se reconhecer.     │
   * │ `photo` — o CAMINHO de uma imagem em `public/` (ex.: "/images/dona-   │
   * │   maria.jpg"). Qualquer outra coisa é tratada como marcador e desenha │
   * │   o círculo riscado; ver `components/Testimonial.tsx`.                │
   * └───────────────────────────────────────────────────────────────────────┘
   *
   * DOIS, E DE RAMOS DIFERENTES. Um de comida e um de loja com estoque é o
   * arranjo que a página pede: cada depoimento confirma um dos cards da dobra
   * "Para quem é", e juntos cobrem os dois públicos. Um terceiro cabe na grade
   * sem mexer em nada — ela reparte sozinha.
   */
  testimonial: {
    eyebrow: "Quem já usa",
    items: [
      {
        quote:
          "“Antes eu anotava tudo no caderno e nunca sabia se tinha lucro. Hoje fecho o dia em dois minutos e sei exatamente quanto sobrou.”",
        name: "Nome do cliente",
        role: "Ramo do comércio · Cidade",
        photo: "foto",
      },
      {
        quote:
          "“O estoque baixa sozinho a cada venda e o aviso chega antes de acabar. Parei de perder venda por falta de produto na prateleira.”",
        name: "Nome do cliente",
        role: "Ramo do comércio · Cidade",
        photo: "foto",
      },
    ],
  },

  finalCta: {
    /* A ÚLTIMA DOBRA PEDE O MENOR PASSO POSSÍVEL, e não a decisão inteira:
       ligar dois módulos hoje é um pedido que cabe na cabeça de quem está
       lendo isto entre um cliente e outro. */
    title: "Comece pelo básico. O resto você liga depois.",
    subtitle:
      "Ative vendas e custos hoje, feche o dia sabendo o lucro e traga estoque e caixa quando o movimento pedir.",
    primary: "Comece hoje",
    secondary: "Ver os planos",
    note: "Sem contrato longo · Você muda de plano ou sai quando quiser",
  },

  footer: {
    about: "Sobre",
    contact: "Contato",
    terms: "Termos",
    copyright: "© 2026 Aguiar One · Tudo num lugar só",
  },

  /**
   * AS TRÊS PÁGINAS DO RODAPÉ.
   *
   * Elas não são dobras da vitrine: são páginas de leitura, com uma coluna só,
   * e por isso o texto aqui é mais longo e mais seco que o do resto do arquivo.
   * Quem chega nelas já está procurando uma informação específica — quem faz o
   * sistema, como falar com alguém, o que está combinado.
   *
   * ⚠️  DOIS PONTOS PENDENTES, os dois marcados no texto com colchetes:
   *   · `terms` precisa da razão social, do CNPJ e do foro, e de UMA LEITURA
   *     DE ADVOGADO antes de ir ao ar. O que está escrito é um rascunho em
   *     português claro, não uma peça jurídica conferida.
   *   · o e-mail de contato mora em `lib/links.ts` (`CONTACT_EMAIL`) e ainda é
   *     um endereço de exemplo.
   */
  pages: {
    /** O link de volta, no alto das três páginas. */
    back: "← Voltar para a página inicial",

    about: {
      meta: {
        title: "Sobre · Aguiar One",
        description:
          "O que é o Aguiar One, por que ele existe e para quem ele foi feito: um sistema modular de vendas, custos, estoque e caixa para o pequeno comércio.",
      },
      eyebrow: "Sobre",
      title: "Um sistema para o comércio que atende de pé",
      lead: "O Aguiar One nasceu de uma conta que quase todo pequeno comércio faz de cabeça e erra: quanto sobrou hoje, depois de tudo.",
      blocks: [
        {
          title: "O que é",
          text: "Um sistema de gestão para pequenos comércios. Ele reúne o registro de vendas, o controle de custos, o estoque, o caixa e os relatórios de lucro no mesmo lugar — e é montado por módulos, então cada negócio liga só o que usa e desliga o resto. Abre no navegador do computador e instala como aplicativo no celular.",
        },
        {
          title: "Por que existe",
          text: "De um lado, o caderno e a planilha: registram, mas não somam, não avisam quando um produto está acabando e não dizem se o dia fechou no azul. Do outro, os sistemas grandes: caros, cheios de telas que ninguém abre e com um treinamento que não cabe na rotina de quem atende no balcão. O Aguiar One foi feito para o meio disso.",
        },
        {
          title: "Como ele é pensado",
          text: "Toda tela precisa caber entre um cliente e outro. É por isso que a venda se registra em segundos, que o estoque baixa sozinho quando a venda acontece e que o fechamento do caixa mostra o esperado e o contado lado a lado, sem conta para fazer. O que não passa nesse teste não entra.",
        },
        {
          title: "Seus dados são seus",
          text: "Cada negócio enxerga apenas os próprios dados — a separação é feita no banco, e não na tela. Você também escolhe o que cada pessoa da equipe pode abrir: quem está no balcão não precisa ver o resultado do mês para registrar uma venda.",
        },
      ],
      cta: {
        title: "Quer conversar antes de decidir?",
        text: "A página de contato tem o WhatsApp e o e-mail de quem faz o sistema.",
        button: "Falar com a gente",
      },
    },

    contact: {
      meta: {
        title: "Contato · Aguiar One",
        description:
          "Fale com o Aguiar One por e-mail ou WhatsApp: dúvidas sobre os planos, sobre os módulos ou sobre como começar.",
      },
      eyebrow: "Contato",
      title: "Fale com a gente",
      lead: "Dúvida sobre plano, sobre um módulo ou sobre como começar? Escreva pelo formulário ou chame no WhatsApp — quem responde é quem faz o sistema.",
      form: {
        title: "Mande uma mensagem",
        name: "Seu nome",
        namePlaceholder: "Como podemos te chamar",
        email: "Seu e-mail",
        emailPlaceholder: "para respondermos",
        business: "Seu negócio",
        businessPlaceholder: "Ramo e cidade (opcional)",
        message: "Mensagem",
        messagePlaceholder: "Conte o que você precisa resolver no seu comércio.",
        submit: "Enviar e-mail",
        /* O AVISO NÃO É DETALHE: o botão não envia nada por conta própria, ele
           abre o aplicativo de e-mail do visitante com a mensagem escrita. Quem
           não souber disso vai achar que enviou e ficar esperando resposta. */
        note: "O botão abre o seu aplicativo de e-mail com a mensagem já preenchida. Prefere não usar e-mail? Chame no WhatsApp aqui do lado.",
        /* O MESMO AVISO PARA QUANDO NÃO HÁ WHATSAPP na página — o número vem
           do banco e pode não ter vindo (ver `lib/whatsapp.ts`). Sem esta
           segunda frase, o aviso mandaria o visitante procurar um botão que
           não está lá. */
        noteNoWhatsapp: "O botão abre o seu aplicativo de e-mail com a mensagem já preenchida. Se preferir, escreva direto para o endereço ao lado.",
        /* Assunto do e-mail que o botão monta. */
        subject: "Contato pelo site — Aguiar One",
      },
      whatsapp: {
        title: "WhatsApp",
        text: "É o caminho mais rápido, e é o mesmo número que atende quem já usa o sistema.",
        cta: "Abrir conversa",
        /* A primeira mensagem, já escrita na conversa. */
        message: "Olá! Vim pelo site do Aguiar One e queria saber mais sobre o sistema.",
      },
      email: {
        title: "E-mail",
        text: "Se preferir escrever do seu próprio endereço, é para cá.",
      },
      client: {
        title: "Já é cliente?",
        text: "Abra um chamado direto no sistema, em Suporte: ele chega junto com os dados do seu negócio, e a resposta fica registrada na mesma tela.",
      },
    },

    terms: {
      meta: {
        title: "Termos de uso · Aguiar One",
        description: "Os termos de uso do Aguiar One: o que o serviço faz, como funcionam a conta, os planos, os seus dados e o suporte.",
      },
      eyebrow: "Termos",
      title: "Termos de uso",
      updated: "Última atualização: 17 de agosto de 2026",
      intro: "Este texto explica, em português claro, as regras de uso do Aguiar One. Ao criar uma conta ou usar o sistema, você concorda com o que está aqui.",
      sections: [
        {
          title: "1. Quem oferece o serviço",
          text: "O Aguiar One é operado por [razão social], inscrita no CNPJ [00.000.000/0001-00], com sede em [cidade/UF]. Nestes termos, “nós” é essa empresa e “você” é a pessoa ou o negócio que usa o sistema.",
        },
        {
          title: "2. O que o serviço faz",
          text: "O Aguiar One é um sistema de gestão para comércios, oferecido pela internet. Conforme o plano contratado, ele permite registrar vendas, cadastrar produtos, lançar custos, controlar estoque, abrir e fechar caixa e acompanhar relatórios. Ele não emite documentos fiscais e não substitui a sua contabilidade.",
        },
        {
          title: "3. Conta e responsabilidade",
          text: "A conta é do negócio, e o acesso é pessoal. Você é responsável por guardar a sua senha, por manter os dados de cadastro corretos e por tudo que for feito com os acessos que você criar para a sua equipe. Perceber uso indevido e não nos avisar é responsabilidade sua; avisar é o que nos permite ajudar.",
        },
        {
          title: "4. Planos, cobrança e cancelamento",
          text: "O que cada plano inclui e quanto ele custa está na página de planos, e vale o que estiver publicado no momento da contratação. Mudanças de preço são avisadas antes de valer para você. Não há contrato de fidelidade: o cancelamento pode ser pedido a qualquer momento e encerra as cobranças seguintes, sem devolução do período já usado.",
        },
        {
          title: "5. Uso aceitável",
          text: "Não é permitido usar o sistema para atividade ilegal, tentar acessar dados de outro cliente, sobrecarregar o serviço de propósito, revender o acesso sem combinar antes nem copiar o sistema. Uso assim pode levar à suspensão da conta.",
        },
        {
          title: "6. Os seus dados",
          text: "Os dados que você registra — vendas, produtos, custos, caixa — são seus. Nós os tratamos para operar o serviço, e nunca os vendemos. Cada negócio enxerga apenas os próprios dados. Você pode pedir a qualquer momento uma cópia ou a exclusão deles, conforme a Lei Geral de Proteção de Dados; alguns registros podem ser guardados pelo prazo que a lei exigir.",
        },
        {
          title: "7. Disponibilidade e suporte",
          text: "Trabalhamos para manter o sistema no ar o tempo todo, mas ele depende da internet e de serviços de terceiros, e pode ficar indisponível para manutenção ou por causa fora do nosso alcance. O suporte é feito pelos canais da página de contato e, para quem já é cliente, pela tela de Suporte dentro do sistema.",
        },
        {
          title: "8. Limite de responsabilidade",
          text: "O sistema é uma ferramenta de registro e apoio à decisão: as informações que ele mostra dependem do que foi lançado nele. Não respondemos por decisões tomadas com base em dados incompletos ou incorretos, nem por lucros que você deixe de ter. Isso não afasta as responsabilidades que a lei não permite afastar.",
        },
        {
          title: "9. Mudanças nestes termos",
          text: "Estes termos podem mudar conforme o serviço evolui. Quando mudarem de forma relevante, avisamos pelo sistema ou por e-mail antes de a mudança valer. A data no alto desta página é sempre a da última versão.",
        },
        {
          title: "10. Contato e foro",
          text: "Dúvidas sobre estes termos podem ser enviadas pela página de contato. Para o que não for resolvido por lá, fica eleito o foro de [comarca/UF].",
        },
      ],
      note: "Este texto é um resumo em linguagem simples e vale como termo de uso. Se algum ponto ficar em dúvida, fale com a gente antes de contratar.",
    },
  },

  meta: {
    /* O título de busca começa pelo que a pessoa digita ("sistema para
       comércio", "controle de vendas e estoque") e não pela promessa. */
    title: "Aguiar One · Sistema de vendas, estoque e caixa para o seu comércio",
    description:
      "Registre as vendas, controle os custos e o estoque, feche o caixa conferido e veja o lucro do seu comércio todo dia. Ligue só os módulos que o seu negócio usa, no celular ou no computador.",
  },
};

export type Dic = typeof pt;

const en: Dic = {
  brand: "Aguiar One",

  nav: {
    label: "Main navigation",
    modules: "Modules",
    plans: "Pricing",
    cta: "Get started",
  },

  hero: {
    badge: "Everything in one place",
    title: "Log the sale, see the profit, close the till",
    subtitle:
      "Sales, costs, inventory and till in the same place. You switch on only the modules your business uses and see the day's result without opening a spreadsheet.",
    ctaPrimary: "Get started",
    ctaSecondary: "See what comes with it →",
    note: "Nothing to install · Works on your phone and computer · You pick the modules",
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

  cta: {
    whatsapp: {
      header: "Hello! I came from the Aguiar One website and I would like to start using the system.",
      hero: "Hello! I came from the Aguiar One website and I want to get my shop's sales and costs in order. How do I get started?",
      modules: "Hello! I came from the Aguiar One website and I would like to put the system together with just the modules my business uses.",
      plan: "Hello! I came from the Aguiar One website and I am interested in the {plano} plan.",
      final: "Hello! I came from the Aguiar One website and I want to start today. Could you walk me through the next steps?",
    },
  },

  audiences: {
    eyebrow: "Who it is for",
    title: "Built for the counter, not the back office",
    subtitle:
      "From the snack cart to the shop down the road: every business switches on only the modules it uses and turns off the rest.",
    items: [
      {
        title: "Food and drink",
        text: "Selling all day and, at the end of it, knowing what was really left — after the gas, the supplies and the market run.",
        note: "Sales · Costs · Profit today",
      },
      {
        title: "Shops and corner stores",
        text: "A product that runs out unnoticed is a lost sale. The balance drops with every sale and the warning arrives before the shelf is empty.",
        note: "Inventory · Till · Reports",
      },
      {
        title: "Your shop",
        text: "Barber shop, salon, studio, workshop. You pick the modules and the system adapts to how you work.",
        note: "You put it together your way",
      },
    ],
  },

  modules: {
    eyebrow: "Modules",
    title: "Assemble the system your business needs",
    subtitle:
      "Turn on only what makes sense today. When the business grows, the rest comes in without switching systems and without starting over.",
    link: "See what each plan includes →",
    freeTag: "Free plan",
    paidTag: "Paid plan",
    items: [
      {
        title: "Sales entry",
        text: "Log a sale in seconds, at the counter or on your phone, with the items and the payment method. Got it wrong? Edit or reverse it without erasing the history.",
        free: true,
      },
      {
        title: "Cost tracking",
        text: "Supplies, gas, rent, market run: every expense on the right day. Buying stock becomes a cost on its own, with no double entry.",
        free: true,
      },
      {
        title: "Reports and profit",
        text: "What came in, what went out and what was left, by day, week or month — and which products pull the result up.",
        free: true,
      },
      {
        title: "Inventory control",
        text: "The balance drops on its own with every sale. Stock in, stock out and adjustments are all recorded, and the warning arrives when a product hits its minimum.",
        free: false,
      },
      {
        title: "Till",
        text: "Opens with the shift's float, records cash drops and top-ups and, at closing, compares what was expected with what was counted in the drawer.",
        free: false,
      },
    ],
    custom: {
      title: "Only what you need on screen",
      text: "Switch off the modules you do not use and give each person on your team access only to their own work. Less screen, fewer mistakes, less training.",
      cta: "Put my system together →",
    },
    panels: {
      sales: {
        caption: "Sales · Today",
        rows: [
          { time: "14:32", item: "Set lunch", value: "R$ 32,00", pay: "Pix" },
          { time: "14:05", item: "Plate of the day", value: "R$ 18,00", pay: "Cash" },
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
        caption: "Report · Week",
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
        alertLabel: "The balance drops with every sale; the warning goes out at the minimum.",
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
      "Nothing to install, nothing to configure for weeks. Everything below applies from the first sale you record.",
    items: [
      {
        prefix: "",
        value: 5,
        suffix: "",
        label: "Modules to switch on",
        text: "Turn on what your shop uses, leave the rest off",
      },
      {
        prefix: "",
        value: 1,
        suffix: "",
        label: "One place",
        text: "Sales, costs, inventory and till in one account",
      },
      {
        prefix: "",
        value: 2,
        suffix: " min",
        label: "To get going",
        text: "Register the business and log the first sale",
      },
      {
        prefix: "",
        value: 100,
        suffix: "%",
        label: "On your phone",
        text: "Installs like an app and opens at the counter or on the road",
      },
    ],
  },

  how: {
    eyebrow: "How it works",
    title: "Up and running the same day, in three steps",
    steps: [
      {
        title: "Register your business",
        text: "Name, trade and phone. It takes under two minutes and needs nothing installed.",
      },
      {
        title: "Add what you sell",
        text: "Product, price and cost. Choose the modules you will use and switch off the rest.",
      },
      {
        title: "Record and follow along",
        text: "Log the day's sales and watch the profit show up on the dashboard, no spreadsheet.",
      },
    ],
  },

  plans: {
    eyebrow: "Pricing",
    title: "Pick the plan that fits your business",
    subtitle:
      "You start with the essentials and switch the rest on when trade calls for it. No long contract: you can change plan or leave whenever you want.",
    recommended: "Recommended",
    priceOnRequest: "On request",
    free: {
      name: "Free",
      pitch: "For anyone ready to drop the notebook and see the day's profit.",
      price: "R$ 0",
      unit: "/ month",
      cta: "Get started",
      features: [
        "Unlimited sales entry",
        "Product list with price and cost",
        "Day-to-day cost tracking",
        "Profit by day, week and month",
        "Works on your phone and computer",
      ],
    },
    full: {
      name: "Complete",
      pitch: "For anyone with shelves to watch and a cash drawer to count every day.",
      price: "R$ XX",
      unit: "/ month",
      cta: "I want this plan",
      features: [
        "Everything in the free plan",
        "Inventory that drops on its own, with low-stock warnings",
        "Till with cash drops, top-ups and closing count",
        "Reports by product",
        "Separate access for each person on the team",
      ],
    },
  },

  testimonial: {
    eyebrow: "Already using it",
    items: [
      {
        quote:
          "“I used to write everything in a notebook and never knew if I had made a profit. Now I close the day in two minutes and know exactly what was left.”",
        name: "Customer name",
        role: "Type of trade · City",
        photo: "photo",
      },
      {
        quote:
          "“Stock goes down on its own with every sale and the warning arrives before it runs out. I stopped losing sales to an empty shelf.”",
        name: "Customer name",
        role: "Type of trade · City",
        photo: "photo",
      },
    ],
  },

  finalCta: {
    title: "Start with the basics. The rest switches on later.",
    subtitle:
      "Turn on sales and costs today, close the day knowing your profit, and bring in inventory and the till when trade calls for it.",
    primary: "Get started",
    secondary: "See the plans",
    note: "No long contract · Change plan or leave whenever you want",
  },

  footer: {
    about: "About",
    contact: "Contact",
    terms: "Terms",
    copyright: "© 2026 Aguiar One · Everything in one place",
  },

  pages: {
    back: "← Back to the home page",

    about: {
      meta: {
        title: "About · Aguiar One",
        description:
          "What Aguiar One is, why it exists and who it was built for: modular sales, cost, inventory and till software for small shops.",
      },
      eyebrow: "About",
      title: "Software for the shop that works standing up",
      lead: "Aguiar One came out of a sum almost every small shop does in its head and gets wrong: how much was left today, after everything.",
      blocks: [
        {
          title: "What it is",
          text: "Management software for small shops. It brings sales entry, cost tracking, inventory, the till and profit reports together in one place — and it is built from modules, so every business switches on only what it uses and leaves the rest off. It opens in a desktop browser and installs like an app on your phone.",
        },
        {
          title: "Why it exists",
          text: "On one side, the notebook and the spreadsheet: they record, but they do not add up, they do not warn you when a product is running out and they do not tell you whether the day closed in the black. On the other, the big systems: expensive, full of screens nobody opens, with training that does not fit the routine of someone working the counter. Aguiar One was built for the middle.",
        },
        {
          title: "How it is designed",
          text: "Every screen has to fit between one customer and the next. That is why a sale takes seconds to log, why stock drops on its own when the sale happens, and why closing the till shows expected and counted side by side, with no sum to do. Anything that fails that test does not ship.",
        },
        {
          title: "Your data is yours",
          text: "Each business sees only its own data — the separation is made in the database, not on the screen. You also choose what each person on your team can open: someone at the counter does not need to see the month's result to log a sale.",
        },
      ],
      cta: {
        title: "Want to talk before deciding?",
        text: "The contact page has the WhatsApp number and the email of the people who build it.",
        button: "Talk to us",
      },
    },

    contact: {
      meta: {
        title: "Contact · Aguiar One",
        description:
          "Get in touch with Aguiar One by email or WhatsApp: questions about the plans, the modules or how to get started.",
      },
      eyebrow: "Contact",
      title: "Talk to us",
      lead: "A question about a plan, a module or how to get started? Write through the form or message us on WhatsApp — the people who answer are the ones who build the system.",
      form: {
        title: "Send a message",
        name: "Your name",
        namePlaceholder: "What should we call you",
        email: "Your email",
        emailPlaceholder: "so we can reply",
        business: "Your business",
        businessPlaceholder: "Trade and city (optional)",
        message: "Message",
        messagePlaceholder: "Tell us what you need to sort out in your shop.",
        submit: "Send email",
        note: "The button opens your email app with the message already filled in. Rather not use email? Message us on WhatsApp.",
        noteNoWhatsapp: "The button opens your email app with the message already filled in. If you would rather, write straight to the address next to this form.",
        subject: "Website enquiry — Aguiar One",
      },
      whatsapp: {
        title: "WhatsApp",
        text: "It is the fastest route, and it is the same number that answers people already using the system.",
        cta: "Open the chat",
        message: "Hello! I came from the Aguiar One website and would like to know more about the system.",
      },
      email: {
        title: "Email",
        text: "If you would rather write from your own address, here it is.",
      },
      client: {
        title: "Already a customer?",
        text: "Open a ticket inside the system, under Support: it arrives with your business details attached, and the answer stays on the same screen.",
      },
    },

    terms: {
      meta: {
        title: "Terms of use · Aguiar One",
        description: "Aguiar One's terms of use: what the service does, and how the account, the plans, your data and support work.",
      },
      eyebrow: "Terms",
      title: "Terms of use",
      updated: "Last updated: 17 August 2026",
      intro: "This text explains, in plain language, the rules for using Aguiar One. By creating an account or using the system, you agree to what is written here.",
      sections: [
        {
          title: "1. Who provides the service",
          text: "Aguiar One is operated by [legal name], registered under CNPJ [00.000.000/0001-00], based in [city/state]. In these terms, “we” is that company and “you” is the person or business using the system.",
        },
        {
          title: "2. What the service does",
          text: "Aguiar One is management software for shops, provided over the internet. Depending on the plan, it lets you record sales, list products, log costs, control inventory, open and close the till and follow reports. It does not issue tax documents and does not replace your accountant.",
        },
        {
          title: "3. Account and responsibility",
          text: "The account belongs to the business, and access is personal. You are responsible for keeping your password safe, for keeping your registration details correct and for everything done with the accesses you create for your team. Noticing misuse and not telling us is on you; telling us is what lets us help.",
        },
        {
          title: "4. Plans, billing and cancellation",
          text: "What each plan includes and what it costs is on the pricing page, and what is published at the time you sign up is what applies. Price changes are announced before they apply to you. There is no lock-in: you can cancel at any time, which ends the following charges, with no refund for the period already used.",
        },
        {
          title: "5. Acceptable use",
          text: "You may not use the system for illegal activity, try to reach another customer's data, deliberately overload the service, resell access without agreeing it first or copy the system. Doing so may lead to the account being suspended.",
        },
        {
          title: "6. Your data",
          text: "The data you record — sales, products, costs, till — is yours. We process it to run the service, and we never sell it. Each business sees only its own data. You may request a copy or its deletion at any time, under Brazil's data protection law; some records may be kept for as long as the law requires.",
        },
        {
          title: "7. Availability and support",
          text: "We work to keep the system up at all times, but it depends on the internet and on third-party services, and it may be unavailable for maintenance or for reasons beyond our reach. Support is provided through the channels on the contact page and, for customers, through the Support screen inside the system.",
        },
        {
          title: "8. Limit of liability",
          text: "The system is a record-keeping and decision-support tool: what it shows depends on what was entered into it. We are not liable for decisions taken on incomplete or incorrect data, nor for profits you fail to make. This does not set aside liabilities the law does not allow to be set aside.",
        },
        {
          title: "9. Changes to these terms",
          text: "These terms may change as the service evolves. When they change in a relevant way, we tell you through the system or by email before the change applies. The date at the top of this page is always that of the latest version.",
        },
        {
          title: "10. Contact and jurisdiction",
          text: "Questions about these terms can be sent through the contact page. For anything not settled there, the courts of [district/state] apply.",
        },
      ],
      note: "This text is a plain-language summary and stands as the terms of use. If any point is unclear, talk to us before signing up.",
    },
  },

  meta: {
    title: "Aguiar One · Sales, inventory and till software for your shop",
    description:
      "Record sales, track costs and inventory, close the till with a matching count and see your shop's profit every day. Switch on only the modules your business uses, on your phone or computer.",
  },
};

export const DIC = { pt, en };

/** O idioma servido hoje. A página inteira lê daqui. */
export const COPY: Dic = pt;
