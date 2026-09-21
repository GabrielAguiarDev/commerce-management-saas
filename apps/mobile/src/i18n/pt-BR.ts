import type { Messages } from './en';

/**
 * pt-BR catalog. Typed as `Messages`, so it cannot drift from `en.ts`:
 * a key that exists there and not here does not compile.
 *
 * The copy is word for word from the prototype — this is the language the app
 * actually ships in, so `en.ts` is the schema but this is the reference text.
 */
export const ptBR: Messages = {
  language: {
    label: 'Idioma',
    names: { 'pt-BR': 'Português (Brasil)', en: 'English' },
  },

  errors: {
    auth: {
      invalid_email: 'Confira o e-mail digitado.',
      short_password: 'A senha precisa ter pelo menos 6 caracteres.',
      invalid_credentials: 'E-mail ou senha não conferem.',
      // As três abaixo são NEGATIVAS DE ACESSO, não falhas: quem as vê digitou
      // a senha certa. Dizer "confira a senha" o faria tentar para sempre.
      no_tenant: 'Esta conta ainda não está ligada a um negócio. Fale com o suporte.',
      platform_admin: 'Conta de administrador usa o painel, não o aplicativo.',
      suspended: 'Este acesso está suspenso. Fale com o dono do negócio.',
      network: 'Sem conexão com o servidor. Tente de novo em instantes.',
      // O servidor respondeu bem — o aparelho é que não conseguiu GRAVAR a
      // sessão. Dizer "sem conexão" aqui manda depurar o lado saudável.
      storage: 'Não deu para salvar sua sessão neste aparelho. Fale com o suporte.',
      unknown: 'Não conseguimos entrar agora. Fale com o suporte.',
    },

    tenant: {
      not_found: 'Não encontramos os dados do seu negócio.',
      // De propósito NÃO diz "você não tem permissão": o dono tem toda razão em
      // esperar editar o próprio negócio, e desde 26/08/2026 ele consegue. Se
      // esta frase aparecer, é bug nosso — não erro dele —, e por isso ela pede
      // para tentar de novo antes de mandar procurar o suporte.
      forbidden: 'Não conseguimos salvar os dados do negócio. Tente de novo; se continuar, fale com o suporte.',
      network: 'Não deu para salvar agora. Tente de novo.',
      unknown: 'Algo deu errado com os dados do seu negócio.',
    },

    catalog: {
      name_required: 'Dê um nome ao produto para salvar.',
      invalid_price: 'O preço não pode ser negativo.',
      duplicate_code: 'Já existe um produto com esse código. Confira ou deixe em branco.',
      network: 'Não deu para salvar agora. Tente de novo.',
      unknown: 'Algo deu errado com este produto.',
    },

    sale: {
      empty_cart: 'Adicione pelo menos um item para vender.',
      no_payment_method: 'Escolha a forma de pagamento.',
      network: 'A venda não subiu agora, mas está salva no aparelho.',
      unknown: 'Não conseguimos registrar esta venda.',
    },

    cash: {
      cash_closed: 'O caixa não está aberto.',
      cash_already_open: 'Já existe um turno aberto.',
      invalid_amount: 'Informe um valor maior que zero.',
      network: 'Não deu para falar com o servidor agora.',
      unknown: 'Algo deu errado no caixa.',
    },

    stock: {
      product_required: 'Diga qual produto está sendo movimentado.',
      invalid_quantity: 'Informe uma quantidade diferente de zero.',
      invalid_cost: 'O custo não pode ser negativo.',
      network: 'Não deu para registrar a movimentação agora.',
    },

    cost: {
      name_required: 'Dê um nome ao custo.',
      invalid_amount: 'Informe um valor maior que zero.',
      network: 'Não deu para salvar o custo agora.',
      from_stock: 'Este custo veio de uma entrada no Estoque. Ajuste a movimentação por lá.',
      not_found: 'Este custo não existe mais. A lista foi atualizada.',
      forbidden: 'Seu acesso não permite alterar custos.',
      invalid_data: 'Confira os dados do custo e tente de novo.',
    },

    support: {
      subject_required: 'Escreva um assunto para o chamado.',
      description_required: 'Conte o que aconteceu para a gente ajudar.',
      network: 'Não deu para enviar agora. Tente de novo.',
    },

    // Recuperação de senha — ver `domain/session/recoveryService.ts`.
    recovery: {
      invalid_email: 'Confira o e-mail digitado.',
      incomplete_code: 'Digite os 6 números do código.',
      // Cobre errado E vencido: o Supabase devolve a mesma coisa para os dois,
      // e a saída é a mesma — pedir outro.
      invalid_code: 'Esse código não confere ou já venceu. Peça um novo.',
      short_password: 'A nova senha precisa ter pelo menos 6 caracteres.',
      password_mismatch: 'As duas senhas não são iguais.',
      same_password: 'Essa já é a sua senha atual. Escolha uma diferente.',
      expired_flow: 'A recuperação expirou. Comece de novo pelo e-mail.',
      network: 'Não deu para falar com o servidor. Tente de novo.',
    },
  },

  toasts: {
    // NÃO diz "enviamos para fulano@...": a tela seguinte já mostra o endereço
    // mascarado, e um e-mail que não existe recebe esta mesma frase de
    // propósito — ver `recoveryService.pedirCodigo`.
    recoveryCodeReady: 'Se essa conta existir, o código chega em instantes.',
    passwordChanged: 'Senha nova salva. Entre com ela.',
    scanned: (name: string) => `${name} foi para o carrinho.`,
    productCreated: (name: string) => `"${name}" cadastrado e pronto pra vender.`,
    // Diz o que a edição NÃO faz: venda registrada ontem continua com o preço
    // de ontem. Sem essa frase, o dono pode achar que corrigiu o faturamento.
    productUpdated: (name: string) =>
      `"${name}" atualizado. O preço novo vale para as próximas vendas.`,
    saleRecorded: (total: string) => `Venda de ${total} registrada!`,
    // NÃO promete sincronia automática: quem lança as vendas é o vendedor, no
    // botão da tela de pendentes. A versão anterior dizia "vai sincronizar
    // sozinha" e mandava o balconista embora achando que estava resolvido.
    saleSavedOffline: (total: string) =>
      `Venda de ${total} salva no aparelho. Lance no sistema quando a internet voltar.`,
    saleRefunded: 'Venda estornada. O estoque dos itens voltou.',
    refundUndone: 'Estorno desfeito. A venda voltou a contar.',
    // O estorno DEU CERTO e mesmo assim há o que dizer: a venda saiu do
    // faturamento, mas o saldo de algum item não se moveu. Quem lê isto é a
    // única pessoa que pode acertar a prateleira — e ela precisa saber hoje,
    // não no dia da conferência.
    stockNotReturned: (count: number) =>
      `A venda foi estornada, mas o estoque de ${count} ${count === 1 ? 'item' : 'itens'} não voltou. Ajuste em Estoque.`,
    stockNotRemoved: (count: number) =>
      `O estorno foi desfeito, mas o estoque de ${count} ${count === 1 ? 'item' : 'itens'} não foi baixado. Ajuste em Estoque.`,
    saleUpdated: (total: string) => `Venda atualizada para ${total}. A anterior ficou estornada.`,
    editingSale: 'Ajuste os itens e finalize para substituir a venda.',
    moduleAccessRevoked:
      'Você não tem mais acesso a este módulo. O app foi atualizado com o seu plano atual.',
    cashOpened: 'Caixa aberto. Bom turno!',
    cashClosed: 'Caixa fechado. Bom descanso!',
    withdrawalRecorded: 'Retirada registrada no caixa.',
    topUpRecorded: 'Reforço registrado no caixa.',
    stockUpdated: 'Estoque atualizado.',
    // Diz em voz alta que uma despesa nasceu sozinha. Sem isto, o dono lança a
    // mesma compra à mão em Custos e ela conta duas vezes.
    stockUpdatedWithCost: 'Estoque atualizado e a compra entrou nos custos.',
    costRecorded: 'Custo registrado.',
    costRecordedRepeating: 'Custo registrado. Ele volta a ser lançado todo mês.',
    businessSaved: 'Dados do negócio salvos.',
    paymentPreferencesSaved: 'Formas de pagamento atualizadas.',
    paymentPreferencesFailed: 'Não deu para salvar as formas de pagamento. Tente de novo.',
    paymentMethodRequired: 'Mantenha pelo menos uma forma de pagamento ativa.',
    // O arquivo NÃO é "salvo no celular": ele é gerado no cache e entregue à
    // folha de compartilhamento. Prometer que ficou guardado mandaria a pessoa
    // procurar num lugar onde não está.
    reportNotReady: 'O relatório ainda está carregando. Tente daqui a pouco.',
    shareUnavailable: 'Este aparelho não tem como compartilhar arquivos.',
    exportFailed: 'Não deu para gerar o arquivo. Tente de novo.',
    replySent: 'Mensagem enviada ao suporte.',
    ticketOpened: 'Chamado aberto. Respondemos em até 1 dia útil.',
    // Aparece quando o canal do WhatsApp não abriu — número ilegível no banco
    // ou aparelho recusou o link. Dá a alternativa em vez de só pedir desculpa:
    // quem vê isto está na tela de bloqueio e não tem outro caminho.
    whatsappUnavailable:
      'Não foi possível abrir o WhatsApp. Escreva para contato@aguiarone.com.br que a gente responde.',
    photosDenied: 'Libere o acesso às fotos nos ajustes do aparelho para anexar.',
    attachmentFailed: 'Não deu para enviar a foto. Tente de novo.',
    attachmentOpenFailed: 'Não deu para abrir o anexo. Tente de novo.',
    synced: 'Tudo sincronizado. Nada se perdeu.',
  },

  confirms: {
    signOut: {
      title: 'Sair da sua conta?',
      text: 'Vendas já registradas continuam salvas. Você vai precisar entrar de novo.',
      button: 'Sair',
    },
    cancelSale: {
      title: 'Cancelar esta venda?',
      text: 'Os itens do carrinho serão removidos. Nada é registrado.',
      button: 'Cancelar venda',
    },
    // Sair da edição não desfaz nada: a venda original NUNCA foi tocada até
    // aqui — o estorno só acontece no salvar. Dizer isso evita a pergunta que
    // o botão "Cancelar edição" naturalmente levanta.
    cancelEdit: {
      title: 'Sair da edição?',
      text: 'A venda original continua como está. Os itens do carrinho serão descartados.',
      button: 'Sair da edição',
    },
    closeCash: {
      title: 'Fechar o caixa agora?',
      text: 'Depois de fechado, o turno não pode mais receber vendas. Você ainda consegue consultar tudo no histórico.',
      button: 'Fechar caixa',
    },
  },

  connection: {
    offline: 'Sem conexão — suas vendas ficam salvas aqui e você sincroniza depois.',
    syncing: 'Enviando suas vendas para o sistema…',
  },

  startup: {
    title: 'Preparando tudo para você',
    text: 'Só um instante enquanto organizamos o seu negócio.',
    a11yLabel: 'Abrindo o aplicativo',
  },

  startupError: {
    title: 'Não conseguimos abrir o aplicativo',
    text: 'Não deu para carregar o seu plano agora. Verifique a conexão e tente de novo. Se continuar, fale com a gente.',
    retry: 'Tentar de novo',
    contactSupport: 'Falar com o suporte',
    signOut: 'Sair da conta',
    whatsappMessage: 'Olá! O aplicativo do Aguiar One não está abrindo para mim: aparece que não conseguiu carregar o meu plano.',
  },

  auth: {
    tagline: 'Gestão simples do seu negócio',

    signIn: {
      // Saúda antes de instruir: quem chega aqui é quase sempre alguém que já
      // entrou ontem, não um visitante decidindo se cria conta.
      title: 'Bem-vindo de volta!',
      subtitle: 'Entre na sua conta para continuar',
      emailLabel: 'E-mail',
      emailPlaceholder: 'voce@seunegocio.com.br',
      passwordLabel: 'Senha',
      passwordPlaceholder: 'Sua senha',
      showPassword: 'Mostrar senha',
      hidePassword: 'Ocultar senha',
      submit: 'Entrar',
      forgot: 'Esqueceu a senha?',
      // Não existe cadastro pelo app: a conta é criada no painel. Por isso a
      // linha de "ainda não tem conta" leva a uma conversa, não a um formulário.
      // Separa o "Entrar" do convite ao suporte: são dois caminhos, não uma
      // ação e o rodapé dela.
      or: 'ou',
      noAccount: 'Ainda não tem conta?',
      contactSupport: 'Fale com o suporte',
      // O selo do rodapé. Não promete criptografia nem cita norma nenhuma: diz
      // só o que o balconista precisa ouvir antes de digitar a senha no balcão.
      dataProtected: 'Seus dados estão protegidos',
    },

    forgot: {
      title: 'Esqueci minha senha',
      intro:
        'Digite o e-mail da sua conta. A gente manda um código de 6 números para você criar uma senha nova.',
      emailLabel: 'E-mail',
      submit: 'Enviar código',
      back: 'Voltar',
    },

    code: {
      title: 'Confira seu e-mail',
      sentTo: (email: string) => `Enviamos um código de 6 números para ${email}`,
      codeLabel: 'Código de verificação',
      resendIn: (seconds: number) => `Reenviar código em ${seconds} s`,
      resend: 'Reenviar código',
      submit: 'Confirmar',
    },

    newPassword: {
      title: 'Crie uma senha nova',
      intro: 'Precisa ter pelo menos 6 caracteres. Escolha uma que você consiga lembrar.',
      passwordLabel: 'Nova senha',
      confirmLabel: 'Repita a nova senha',
      submit: 'Salvar nova senha',
    },

    // Depois de trocar a senha o app SAI da sessão de propósito (ver
    // `recoveryService.redefinirSenha`). Sem esta frase, voltar para o login
    // pareceria o fluxo ter falhado no último passo.
    signInAgainNotice: 'Depois de salvar, entre de novo com a senha nova.',
  },

  paymentMethods: {
    cash: 'Dinheiro',
    pix: 'Pix',
    debit: 'Cartão de débito',
    credit: 'Cartão de crédito',
    // As grafias que ESTE app gravava antes da unificação. Continuam aqui
    // enquanto houver linha antiga no banco. Ver `utils/payment`.
    debit_card: 'Cartão de débito',
    credit_card: 'Cartão de crédito',
  },

  cart: {
    title: 'Sua venda',
    decrease: (name: string) => `Diminuir ${name}`,
    increase: (name: string) => `Aumentar ${name}`,
    total: 'Total',
    paymentMethod: 'Forma de pagamento',
    finish: (total: string) => `Finalizar venda · ${total}`,
    cancel: 'Cancelar venda',
    summary: (count: number) => `${count} ${count === 1 ? 'item' : 'itens'} no carrinho`,
    /**
     * O carrinho EM MODO EDIÇÃO.
     *
     * O título muda porque o botão faz outra coisa: aqui ele substitui uma
     * venda que já existe, e o texto é a única pista disso antes do toque.
     */
    editTitle: 'Editando uma venda',
    editHint: 'Ao salvar, a venda original é estornada e esta entra no lugar.',
    saveEdit: (total: string) => `Salvar alterações · ${total}`,
    cancelEdit: 'Cancelar edição',
  },

  stockStatus: {
    ok: 'Em dia',
    low: 'Baixo',
    out: 'Zerado',
  },

  /**
   * "Quem fez o quê" — a tradução das chaves gravadas em `activity_log.action`.
   *
   * O banco guarda `sale.created`; é aqui que isso vira português. Nunca o
   * contrário — gravar o rótulo faria renomear um texto reescrever o passado.
   *
   * A ausência de uma chave NÃO é erro: o portal pode gravar ações que este
   * app ainda não conhece, e mostrar a chave crua é melhor do que esconder a
   * linha. Ver `activityLabel`.
   */
  activity: {
    empty: 'Ainda não há nada registrado aqui.',
    actions: {
      'sale.created': 'Venda registrada',
      'sale.refunded': 'Venda estornada',
      'sale.refund_undone': 'Estorno desfeito',
      'stock.moved': 'Estoque movimentado',
      'stock.reverted': 'Movimentação revertida',
      'product.created': 'Produto cadastrado',
      'product.updated': 'Produto alterado',
      'product.deleted': 'Produto excluído',
      'product.paused': 'Produto pausado',
      'product.resumed': 'Produto voltou à venda',
      'register.opened': 'Caixa aberto',
      'register.closed': 'Caixa fechado',
      'register.reopened': 'Caixa reaberto',
      'register.deposit': 'Reforço no caixa',
      'register.withdrawal': 'Sangria',
      'register.movement_undone': 'Movimentação do caixa desfeita',
      'cost.created': 'Custo lançado',
      'cost.updated': 'Custo alterado',
      'cost.deleted': 'Custo excluído',
      'business.updated': 'Dados do negócio alterados',
      'settings.updated': 'Preferências alteradas',
      'logo.updated': 'Logo enviada',
      'logo.removed': 'Logo removida',
      'role.created': 'Tipo de acesso criado',
      'role.updated': 'Tipo de acesso alterado',
      'role.deleted': 'Tipo de acesso removido',
      'employee.suspended': 'Acesso suspenso',
      'employee.restored': 'Acesso liberado',
      'employee.role_changed': 'Tipo de acesso trocado',
      'employee.invited': 'Funcionário convidado',
      'employee.removed': 'Funcionário removido',
      'ticket.opened': 'Chamado aberto',
    } as Record<string, string>,
  },

  home: {
    greeting: { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite' },
    greetingName: (greeting: string, name: string) => `${greeting}, ${name}`,
    you: 'você',
    todaySales: 'Vendas de hoje',
    leftToday: 'Sobrou hoje',
    afterCosts: 'depois dos custos',
    bestSeller: 'Mais vendido',
    cash: {
      open: 'Caixa aberto',
      closed: 'Caixa fechado',
      drawer: (amount: string) => `Na gaveta agora: ${amount}`,
      openToStart: 'Abra para começar o turno',
      seeOpen: 'Ver caixa aberto',
      openIt: 'Abrir o caixa',
      see: 'Ver',
    },
    counters: {
      sales: (count: number) => `${count} ${count === 1 ? 'venda' : 'vendas'}`,
      items: (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`,
    },
    noSalesYet: 'ainda sem vendas hoje',
    recentSales: 'Últimas vendas',
    noSalesToday: 'Nenhuma venda registrada hoje ainda.',
    seeTodaySales: 'Ver vendas de hoje',
  },

  todaySales: {
    title: 'Vendas de hoje',
    subtitle: 'Tudo o que foi registrado desde o início do dia',
    totalLabel: 'Total de hoje',
    end: 'Todas as vendas de hoje foram exibidas.',
    empty: {
      title: 'Nenhuma venda hoje ainda',
      text: 'As vendas registradas hoje aparecerão aqui em ordem de horário.',
    },
  },

  sales: {
    datePlaceholder: 'dd/mm/aaaa',
    title: 'Vendas',
    subtitle: 'Tudo o que já foi vendido',
    today: 'Hoje',
    yesterday: 'Ontem',
    /** "3 vendas · R$ 517,00" — o cabeçalho do dia. Estornadas não entram. */
    dayTotal: (count: number, total: string) =>
      `${count} ${count === 1 ? 'venda' : 'vendas'} · ${total}`,
    saleCount: (count: number) => `${count} ${count === 1 ? 'venda' : 'vendas'} no período`,
    refundedInDay: (count: number) =>
      `${count} ${count === 1 ? 'estornada' : 'estornadas'}`,

    /** Os quatro recortes. O rótulo é curto: a fileira rola, mas cabe melhor. */
    filters: {
      all: 'Todas',
      today: 'Hoje',
      month: 'Mês atual',
      custom: 'Selecionar período',
    },

    period: {
      title: 'Período',
      from: 'De',
      to: 'Até',
      apply: 'Aplicar período',
      // Diz o que fazer, não o que faltou: os dois campos vazios é o estado
      // inicial normal deste filtro, não um erro do usuário.
      hint: 'Preencha uma das datas — ou as duas — e toque em aplicar.',
      between: (from: string, to: string) => `De ${from} até ${to}`,
      since: (from: string) => `A partir de ${from}`,
      until: (to: string) => `Até ${to}`,
    },
    refundedBadge: 'Estornada',
    loadingMore: 'Carregando…',
    end: 'Você chegou ao começo do histórico.',
    empty: {
      title: 'Nenhuma venda por aqui ainda',
      text: 'Assim que você registrar a primeira venda, ela aparece aqui com valor, itens e forma de pagamento.',
      // Vazio COM filtro é outra história: não falta venda no sistema, falta
      // venda naquele recorte. Mandar "registre a primeira venda" para quem tem
      // 300 vendas e escolheu o mês errado seria absurdo.
      filteredTitle: 'Nenhuma venda neste período',
      filteredText: 'Tente outro período ou volte para "Todas" para ver o histórico inteiro.',
    },

    detail: {
      title: 'Detalhes da venda',
      notFound: {
        title: 'Venda não encontrada',
        text: 'Ela pode ter sido apagada pelo portal. Volte ao histórico para ver o que existe hoje.',
      },
      /** O aviso no topo da venda estornada. */
      refundedNotice:
        'Esta venda foi estornada e não conta no faturamento. Ela continua no histórico para você ter o registro.',
      items: 'Itens',
      total: 'Total',
      /** Ações. */
      edit: 'Editar venda',
      refund: 'Estornar venda',
      undoRefund: 'Desfazer estorno',
      offlineHint: 'Sem internet não dá para estornar nem editar: as duas coisas precisam falar com o servidor.',
    },

    /** A confirmação do estorno. Diz o que sai, o que volta e o que fica. */
    refundConfirm: {
      title: 'Estornar esta venda?',
      text: 'A venda sai do faturamento e o estoque dos itens volta. Ela continua no histórico, riscada, e dá para desfazer depois.',
      button: 'Estornar venda',
    },
    undoConfirm: {
      title: 'Desfazer o estorno?',
      text: 'A venda volta a contar no faturamento e o estoque dos itens é baixado de novo.',
      button: 'Desfazer estorno',
    },
    /** Editar avisa ANTES: a edição cria uma segunda linha no histórico. */
    editConfirm: {
      title: 'Editar esta venda?',
      text: 'A venda atual será estornada e uma nova entra no lugar — as duas ficam no histórico. Os itens vão para o carrinho para você ajustar.',
      button: 'Editar no carrinho',
    },
  },

  products: {
    title: 'Produtos',
    count: (count: number) => `${count} ${count === 1 ? 'cadastrado' : 'cadastrados'}`,
    searchPlaceholder: 'Buscar por nome ou código',
    filters: { all: 'Todos', favorites: 'Favoritos' },
    favorite: (name: string) => `Favoritar ${name}`,
    unfavorite: (name: string) => `Desfavoritar ${name}`,
    edit: (name: string) => `Editar ${name}`,
    quickAdd: '+ Cadastro rápido',
    service: 'Serviço',
    code: (code: string) => `Código ${code}`,
    withCost: (base: string, cost: string) => `${base} · custa ${cost}`,
    badge: {
      out: 'Sem estoque',
      low: (quantity: number) => `${quantity} — está baixo`,
      inStock: (quantity: number) => `${quantity} em estoque`,
    },
  },

  costs: {
    kindLabel: { fixedMonthly: 'Fixo · todo mês', fixed: 'Fixo', variable: 'Variável' },
    dueDay: (day: number) => `dia ${day}`,
    monthRange: (from: string, to: string) => `${from} a ${to}`,
    sheetText: 'Registre um gasto avulso, ou um custo fixo que se repete todo mês.',
    typeLabel: 'Tipo do custo',
    variable: 'Variável',
    fixed: 'Fixo',
    repeatMonthly: 'Repetir todo mês',
    repeatMonthlyHint:
      'Lançado hoje e de novo no mesmo dia de cada mês — ou no último dia, nos meses mais curtos.',
    competence: (month: string) => `competência ${month}`,

    title: 'Custos',
    subtitle: 'O que sai do seu bolso',
    filters: { all: 'Todos', fixed: 'Fixos', variable: 'Variáveis' },
    summary: { income: 'Entrou', expense: 'Saiu', left: 'Sobrou' },
    fromStockTag: 'veio do estoque',
    addButton: '+ Registrar custo',
    editRow: (name: string) => `Editar ${name}`,

    newTitle: 'Novo custo',
    editTitle: 'Editar custo',
    nameLabel: 'Nome do custo',
    namePlaceholder: 'Ex: aluguel',
    amountLabel: 'Valor',
    amountPlaceholder: 'R$ 0,00',
    save: 'Salvar custo',
    saveChanges: 'Salvar alterações',
    delete: 'Excluir custo',
    deleteAndStop: 'Excluir e parar de repetir',
    /** Em série a data não é editável: mostra o mês e o dia de vencimento. */
    entryMonth: (month: string, day: number) => `Mês deste lançamento: ${month} · dia ${day}`,
    editHint: {
      // Espelha o CustoModal do portal: só a série ATIVA muda "daqui em diante".
      active: 'Ao salvar, vale para este mês e os próximos; os meses anteriores não mudam.',
      ended:
        'A repetição deste custo foi encerrada: ao salvar, ela não volta. Os meses anteriores não mudam.',
      stop: 'Ao salvar, este mês fica como lançamento avulso e os meses seguintes saem.',
      startRepeating:
        'Ao salvar, este custo passa a ser lançado todo mês, no mesmo dia. Em meses mais curtos, no último dia.',
      toVariable:
        'Como variável, este mês fica como lançamento avulso e os meses seguintes saem.',
    },

    toasts: {
      updated: 'Custo atualizado.',
      updatedForward: 'Custo atualizado deste mês em diante.',
      stoppedRepeating: 'Custo parou de repetir; este mês foi mantido.',
      startsRepeating: 'Custo passa a repetir todo mês.',
      deleted: 'Custo excluído.',
      deletedAndStopped: 'Custo excluído e parou de repetir.',
    },

    confirmDelete: {
      oneOff: {
        title: 'Excluir este custo?',
        text: 'Ele sai do total do período e do cálculo do lucro. Isto não pode ser desfeito — você teria de lançar de novo.',
        button: 'Excluir custo',
      },
      // Série ativa: excluir encerra a repetição nesta competência.
      repeating: {
        title: 'Excluir e parar de repetir?',
        text: 'Este mês e os seguintes já lançados saem do total, e o custo deixa de ser lançado todo mês. Os meses anteriores continuam no histórico. Isto não pode ser desfeito — para voltar a repetir, lance o custo de novo.',
        button: 'Excluir e parar',
      },
      // Série já encerrada: a RPC ainda remove esta competência e as seguintes.
      endedSeries: {
        title: 'Excluir este custo?',
        text: 'Este mês e os seguintes desta série saem do total. Os meses anteriores continuam no histórico. Isto não pode ser desfeito.',
        button: 'Excluir custo',
      },
    },
  },

  stockAlert: {
    out: (name: string) => `${name} zerou`,
    low: (name: string) => `${name} está baixo`,
    heading: (count: number) =>
      `${count} ${count === 1 ? 'produto precisando' : 'produtos precisando'} de atenção`,
  },

  pendingSales: {
    title: 'Vendas pendentes',
    subtitle: 'Salvas neste aparelho, esperando entrar no sistema',
    heading: (count: number) =>
      `${count} ${count === 1 ? 'venda aguardando' : 'vendas aguardando'} sincronização`,
    syncButton: (count: number) =>
      `Lançar ${count} ${count === 1 ? 'venda' : 'vendas'} no sistema`,
    syncingButton: 'Enviando…',
    offlineHint:
      'Ainda sem conexão. Assim que a internet voltar, você já pode lançar tudo de uma vez.',
    errorLabel: 'Não entrou no sistema',
    homeCard: {
      title: (count: number) =>
        `${count} ${count === 1 ? 'venda' : 'vendas'} para lançar`,
      text: 'Salvas neste aparelho. Toque para conferir e enviar.',
    },
    empty: {
      title: 'Nada esperando',
      text: 'Todas as vendas deste aparelho já estão no sistema.',
    },
    discard: {
      label: 'Descartar esta venda',
      title: 'Descartar esta venda?',
      text: 'Ela sai deste aparelho e não vai entrar no sistema. Não dá para desfazer.',
      button: 'Descartar',
    },
    errors: {
      insufficient_stock: 'Não há estoque suficiente para os itens desta venda.',
      product_missing: 'Um produto desta venda não existe mais no catálogo.',
      not_allowed: 'O sistema não aceitou esta venda. Fale com o suporte.',
      offline: 'A conexão caiu antes de concluir. É só tentar de novo.',
      unknown: 'Esta venda foi recusada pelo sistema.',
    },
    summary: {
      allSynced: (count: number) =>
        `${count} ${count === 1 ? 'venda está' : 'vendas estão'} no sistema. Nada se perdeu.`,
      partial: (synced: number, failed: number) =>
        `${synced} ${synced === 1 ? 'entrou' : 'entraram'}, ${failed} não. As que ficaram mostram o motivo.`,
      allFailed: (count: number) =>
        `${count} ${count === 1 ? 'venda não entrou' : 'vendas não entraram'}. Continuam salvas aqui.`,
    },
  },

  units: {
    soldToday: (count: number) => `${count} ${count === 1 ? 'unidade' : 'unidades'} hoje`,
  },
  reports: {
    weekdays: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    rows: { income: 'Entrou', expense: 'Saiu', profit: 'Sobrou', margin: 'Margem' },
    samePrevious: 'igual ao período anterior',
    vsPrevious: (value: string) => `${value} vs. período anterior`,
    units: (count: number) => `${count} ${count === 1 ? 'unidade' : 'unidades'}`,
    export: {
      fileName: 'relatorio',
      title: 'Relatório',
      summarySheet: 'Resumo',
      byDaySheet: 'Vendas por dia',
      topSheet: 'Mais vendidos',
      indicator: 'Indicador',
      value: 'Valor',
      comparison: 'Comparação',
      day: 'Dia',
      sold: 'Vendido',
      soldIn: (period: string) => `Vendido (R$) — ${period}`,
      product: 'Produto',
      quantity: 'Quantidade',
      total: 'Total',
      totalBrl: 'Total (R$)',
      empty: 'Nada no período.',
      generatedAt: (period: string, when: string) => `${period} · gerado em ${when}`,
      footer: 'Aguiar One · os valores seguem o que estava registrado no momento da geração.',
      sharePdf: 'Enviar relatório em PDF',
      shareSheet: 'Enviar a planilha',
    },
    title: 'Relatórios',
    periods: { today: 'Hoje', week: 'Esta semana', month: 'Este mês', custom: 'Personalizado' },
    financeSummary: 'Resumo financeiro',
    salesByDay: 'Vendas por dia',
    topProducts: 'Mais vendidos',
    exportPdf: 'Exportar PDF',
    exportSheet: 'Exportar planilha',
    chartEmpty: 'Gráfico de vendas por dia, sem dados.',
    chartA11y: (parts: string) => `Vendas por dia. ${parts}.`,
    window: {
      today: 'Hoje',
      lastDays: (count: number) => `Últimos ${count} dias`,
    },
    rangePicker: {
      title: 'Escolher período',
      weekdays: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
      previousMonth: 'Mês anterior',
      nextMonth: 'Próximo mês',
      pickStart: 'Toque na data inicial.',
      pickEnd: 'Agora toque na data final — ou aplique para ver só este dia.',
      summary: (from: string, to: string) => `De ${from} até ${to}`,
      maxRange: (days: number) => `O período vai até ${days} dias.`,
      apply: 'Ver relatório',
    },
  },
  stock: {
    origin: {
      sale: 'saída automática por venda',
      purchase: 'entrada · virou custo variável',
      lossBy: (who: string) => `perda registrada por ${who}`,
      loss: 'perda registrada',
      adjustmentBy: (who: string) => `ajuste manual de ${who}`,
      adjustment: 'ajuste manual',
    },
    removedProduct: 'Produto removido',
    title: 'Estoque',
    subtitle: 'O que tem e o que está acabando',
    counters: { ok: 'Em dia', low: 'Baixo', out: 'Zerado' },
    status: { ok: 'em dia', low: 'está baixo', out: 'zerado' },
    line: (quantity: number, minimum: number, status: string) =>
      `${quantity} em estoque · mínimo ${minimum} · ${status}`,
    move: 'Movimentar',
    moveProduct: (name: string) => `Movimentar ${name}`,
    recentMovements: 'Últimas movimentações',
    addMovement: '+ Registrar movimentação',
  },
  sell: {
    title: 'Nova venda',
    subtitle: 'Toque nos itens para montar a venda',
    searchPlaceholder: 'Buscar produto',
    scanBarcode: 'Ler código de barras',
    searchResults: 'Resultados da busca',
    products: 'Produtos',
    emptyTitle: 'Nada encontrado',
    emptyText: 'Tente outro nome ou cadastre esse produto agora mesmo.',
    createProduct: 'Cadastrar produto',
    addItem: (name: string, price: string) => `Adicionar ${name}, ${price}`,
  },
  cash: {
    card: 'Cartão',
    yesterday: 'Ontem',
    difference: {
      none: 'sem diferença',
      short: (amount: string) => `faltou ${amount}`,
      over: (amount: string) => `sobrou ${amount}`,
    },
    title: 'Caixa',
    subtitleOpen: 'Turno aberto hoje',
    subtitleClosed: 'Nenhum turno aberto',
    closedTitle: 'O caixa está fechado',
    closedText: 'Abra o caixa para começar o dia e acompanhar o dinheiro que entra e sai.',
    open: 'Abrir caixa',
    previousShifts: 'Turnos anteriores',
    drawerNow: 'Na gaveta agora',
    openedAt: (time: string) => `Aberto às ${time}`,
    drawerBreakdown: (opening: string, cashSales: string) =>
      `Abertura ${opening} · vendas em dinheiro ${cashSales}`,
    receivedInShift: 'Recebido no turno',
    withdrawal: 'Sangria',
    topUp: 'Reforço',
    close: 'Fechar caixa',
  },
  more: {
    title: 'Mais',
    subtitle: 'Tudo o que seu plano inclui',
    signOut: 'Sair da conta',
    version: (version: string) => `Aguiar One · versão ${version}`,
    unread: (count: string) => `${count} não lida`,
  },
  nav: {
    tabs: { home: 'Início', products: 'Produtos', cash: 'Caixa', costs: 'Custos', more: 'Mais', sell: 'Vender' },
    items: {
      cash: { name: 'Caixa', description: 'Abrir, sangria e fechamento' },
      stock: { name: 'Estoque', description: 'O que tem e o que falta' },
      costs: { name: 'Custos', description: 'O que sai do seu bolso' },
      reports: { name: 'Relatórios', description: 'Entrou, saiu e sobrou' },
      settings: { name: 'Configurações', description: 'Negócio, equipe e plano' },
      support: { name: 'Suporte', description: 'Fale com a gente' },
    },
  },
  notFound: {
    title: 'Não achamos esta tela',
    text: 'O link que você abriu não existe mais ou está com erro de digitação.',
    goHome: 'Ir para o início',
  },
  blocked: {
    title: 'Seu plano ainda não inclui o aplicativo',
    text: 'Sem problema: você continua com tudo funcionando pelo navegador. Se quiser vender pelo celular, é só falar com a gente.',
    contactSupport: 'Falar com o suporte',
    backToEntry: 'Voltar para a entrada',
  },
  support: {
    status: { answered: 'Respondido', in_progress: 'Em andamento', resolved: 'Resolvido' },
    awaiting: 'Aguardando nossa análise',
    categories: {
      duvida: 'Dúvida',
      problema: 'Algo não funcionou',
      plano: 'Plano e módulos',
      sugestao: 'Sugestão',
    },
    upgradeMessage: 'Olá! Quero ativar o aplicativo do Aguiar One para o meu negócio.',
    title: 'Suporte',
    subtitle: 'A gente responde por aqui',
    unread: 'Não lida',
    openTicket: 'Abrir chamado',
    ticketTitle: 'Chamado',
    ticketSubtitle: 'Resposta em até 1 dia útil',
    openAttachment: (name: string) => `Abrir o anexo ${name}`,
    replyPlaceholder: 'Escreva sua resposta',
    sendReply: 'Enviar resposta',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Seu negócio do seu jeito',
    tabs: { business: 'Negócio', preferences: 'Preferências', team: 'Equipe', plan: 'Conta e plano' },
    business: { name: 'Nome do negócio', phone: 'Telefone / WhatsApp', save: 'Salvar' },
    preferences: {
      paymentMethods: 'Formas de pagamento aceitas',
      accept: (method: string) => `Aceitar ${method}`,
      darkTheme: 'Tema escuro',
    },
    team: { activity: 'Quem fez o quê' },
    plan: {
      activeModules: (modules: string) => `Módulos ativos: ${modules}`,
      renewsOn: (date: string) => `Renova em ${date}`,
      noRenewal: 'Sem data de renovação',
      changePlan: 'Quero mudar meu plano',
    },
  },
  time: {
    todayLower: 'hoje',
    you: 'Você',
    now: 'agora',
    minutesAgo: (count: number) => `há ${count} min`,
    hoursAgo: (count: number) => `há ${count} h`,
    yesterday: 'ontem',
    daysAgo: (count: number) => `há ${count} d`,
    monthsAgo: (count: number) => (count === 1 ? 'há 1 mês' : `há ${count} meses`),
    today: 'Hoje',
  },
  team: {
    noName: 'Sem nome',
    fullAccess: 'Acesso total',
    someone: 'Alguém da equipe',
  },
  modules: {
    names: {
      sales: 'Vendas',
      products: 'Produtos',
      cash: 'Caixa',
      stock: 'Estoque',
      costs: 'Custos',
      reports: 'Relatórios',
      app: 'App',
    },
    none: 'nenhum',
    list: (head: string, last: string) => `${head} e ${last}`,
  },
  closeOut: {
    title: 'Fechar o caixa',
    text: 'Confira quanto realmente tem em cada forma. A gente calcula a diferença pra você.',
    system: (amount: string) => `sistema ${amount}`,
    countedIn: (method: string) => `Valor conferido em ${method}`,
    difference: 'Diferença',
    submit: 'Conferir e fechar',
  },
  catalog: {
    services: 'Serviços',
  },
  common: {
    close: 'Fechar',
    back: 'Voltar',
    notNow: 'Agora não',
    undo: 'Desfazer',
    none: 'nenhuma',
    closeList: 'Fechar lista',
    avatar: (initials: string) => `Avatar de ${initials}`,
    openCart: (summary: string, total: string) => `Abrir carrinho: ${summary}, total ${total}`,
  },
  scanner: {
    needCamera: 'Precisamos da câmera para ler o código',
    denied: 'A permissão foi negada. Libere a câmera para o Aguiar One nos ajustes do aparelho.',
    askHint: 'Toque em permitir quando o aparelho perguntar.',
    typeCode: 'Digitar o código',
    close: 'Fechar o leitor',
  },
  simpleSheet: {
    withdrawal: {
      title: 'Retirar dinheiro',
      text: 'Retirada de dinheiro da gaveta. Fica registrado no turno.',
      label1: 'Valor',
      placeholder1: 'R$ 0,00',
      label2: 'Motivo',
      placeholder2: 'Ex: pagamento do gás',
      button: 'Registrar retirada',
    },
    topUp: {
      title: 'Colocar dinheiro',
      text: 'Dinheiro colocado na gaveta para troco.',
      label1: 'Valor',
      placeholder1: 'R$ 0,00',
      label2: 'Motivo',
      placeholder2: 'Ex: troco do dia',
      button: 'Registrar entrada',
    },
    movement: {
      title: 'Movimentar estoque',
      text: 'Entrada com custo vira despesa automaticamente, na aba Custos.',
      label1: 'Produto',
      placeholder1: 'Ração premium 15kg',
      label2: 'Quantidade (use − para saída)',
      placeholder2: '+10',
      button: 'Salvar movimentação',
    },
    unitCost: 'Custo por unidade (opcional)',
    saveFailed: 'Não deu para salvar agora.',
  },
  ticketSheet: {
    title: 'Abrir chamado',
    subject: 'Assunto',
    subjectPlaceholder: 'Do que você precisa?',
    category: 'Categoria',
    categoryA11y: 'Categoria do chamado',
    description: 'Descrição',
    descriptionPlaceholder: 'Conte com suas palavras o que aconteceu',
    attached: (name: string) => `Anexado: ${name}`,
    attach: 'Anexar foto',
    removeHint: 'Toque no anexo para tirá-lo do chamado.',
    send: 'Enviar chamado',
  },
  productSheet: {
    stockHint: (quantity: number) => `Em estoque: ${quantity}. Para mudar a quantidade, use Estoque.`,
    editTitle: 'Editar produto',
    quickTitle: 'Cadastro rápido',
    missing: 'Este produto não está mais no catálogo. Feche e puxe a lista de novo.',
    name: 'Nome',
    namePlaceholder: 'Ex: Coleira antipulgas',
    code: 'Código (opcional)',
    codePlaceholder: 'Ex: 7891000100011',
    price: 'Preço de venda',
    quantity: 'Quanto tem',
    minimum: 'Avisar abaixo de',
    cost: 'Quanto te custa (opcional)',
    saveChanges: 'Salvar alterações',
    save: 'Salvar produto',
  },
};
