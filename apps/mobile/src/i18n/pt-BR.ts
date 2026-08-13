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
      // esperar editar o próprio negócio. A política de UPDATE que falta em
      // `tenants` é bug nosso, não erro dele.
      forbidden: 'Salvar os dados do negócio ainda não está disponível. Fale com o suporte.',
      network: 'Não deu para salvar agora. Tente de novo.',
      unknown: 'Algo deu errado com os dados do seu negócio.',
    },

    catalog: {
      name_required: 'Dê um nome ao produto para salvar.',
      invalid_price: 'O preço não pode ser negativo.',
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
      network: 'Não deu para registrar a movimentação agora.',
    },

    cost: {
      name_required: 'Dê um nome ao custo.',
      invalid_amount: 'Informe um valor maior que zero.',
      network: 'Não deu para salvar o custo agora.',
    },

    support: {
      subject_required: 'Escreva um assunto para o chamado.',
      description_required: 'Conte o que aconteceu para a gente ajudar.',
      network: 'Não deu para enviar agora. Tente de novo.',
    },

    // Recuperação de senha — o fluxo inteiro ainda é SIMULAÇÃO. Ver
    // `domain/session/passwordRecovery.ts`.
    recovery: {
      invalid_email: 'Confira o e-mail digitado.',
      incomplete_code: 'Digite os 4 números do código.',
      invalid_code: 'Esse código não confere. Confira o seu e-mail.',
      short_password: 'A nova senha precisa ter pelo menos 6 caracteres.',
      password_mismatch: 'As duas senhas não são iguais.',
    },
  },

  toasts: {
    recoverySent: 'Enviamos um link de recuperação para o seu e-mail.',
    recoveryCodeReady: 'Código pronto. Na simulação ele não sai por e-mail.',
    passwordChanged: 'Senha nova salva. Entre com ela.',
    cameraUnavailable: 'Câmera do código de barras abriria aqui.',
    editUnavailable: (name: string) =>
      `Aqui abriria a edição de ${name}. Mudar o preço vale só para as próximas vendas.`,
    productCreated: (name: string) => `"${name}" cadastrado e pronto pra vender.`,
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
    cashOpened: 'Caixa aberto. Bom turno!',
    cashClosed: 'Caixa fechado. Bom descanso!',
    withdrawalRecorded: 'Retirada registrada no caixa.',
    topUpRecorded: 'Reforço registrado no caixa.',
    stockUpdated: 'Estoque atualizado.',
    costRecorded: 'Custo registrado.',
    businessSaved: 'Dados do negócio salvos.',
    pdfExported: 'Relatório em PDF gerado e salvo no celular.',
    spreadsheetExported: 'Planilha gerada e salva no celular.',
    replySent: 'Mensagem enviada ao suporte.',
    ticketOpened: 'Chamado aberto. Respondemos em até 1 dia útil.',
    // Aparece quando o canal do WhatsApp não abriu — número ilegível no banco
    // ou aparelho recusou o link. Dá a alternativa em vez de só pedir desculpa:
    // quem vê isto está na tela de bloqueio e não tem outro caminho.
    whatsappUnavailable:
      'Não foi possível abrir o WhatsApp. Escreva para contato@aguiarone.com.br que a gente responde.',
    attachmentUnavailable: 'Escolha uma foto da galeria ou tire uma agora.',
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
        'Digite o e-mail da sua conta. A gente manda um código de 4 números para você criar uma senha nova.',
      emailLabel: 'E-mail',
      submit: 'Enviar código',
      back: 'Voltar',
    },

    code: {
      title: 'Confira seu e-mail',
      sentTo: (email: string) => `Enviamos um código de 4 números para ${email}`,
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

    mockNotice: (code: string) =>
      `Simulação: ainda não sai e-mail nenhum e nenhuma senha muda. Use o código ${code} para ver o resto do fluxo.`,

    mockShortNotice: 'Simulação: a senha ainda não muda de verdade.',
  },

  paymentMethods: {
    cash: 'Dinheiro',
    pix: 'Pix',
    debit_card: 'Cartão de débito',
    credit_card: 'Cartão de crédito',
    // As duas grafias que o PORTAL grava na mesma coluna. Ver `utils/payment`.
    debit: 'Cartão de débito',
    credit: 'Cartão de crédito',
  },

  cart: {
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

  home: {
    counters: {
      sales: (count: number) => `${count} ${count === 1 ? 'venda' : 'vendas'}`,
      items: (count: number) => `${count} ${count === 1 ? 'item' : 'itens'}`,
    },
    noSalesYet: 'ainda sem vendas hoje',
    recentSales: 'Últimas vendas',
    noSalesToday: 'Nenhuma venda registrada hoje ainda.',
    seeAllSales: 'Ver todas as vendas',
  },

  sales: {
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
    badge: {
      out: 'Sem estoque',
      low: (quantity: number) => `${quantity} — está baixo`,
      inStock: (quantity: number) => `${quantity} em estoque`,
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
};
