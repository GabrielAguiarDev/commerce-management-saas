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
      network: 'Sem conexão com o servidor. Tente de novo em instantes.',
      unknown: 'Não conseguimos entrar agora. Fale com o suporte.',
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
  },

  toasts: {
    recoverySent: 'Enviamos um link de recuperação para o seu e-mail.',
    cameraUnavailable: 'Câmera do código de barras abriria aqui.',
    editUnavailable: (name: string) =>
      `Aqui abriria a edição de ${name}. Mudar o preço vale só para as próximas vendas.`,
    productCreated: (name: string) => `"${name}" cadastrado e pronto pra vender.`,
    saleRecorded: (total: string) => `Venda de ${total} registrada!`,
    saleSavedOffline: (total: string) =>
      `Venda de ${total} salva no aparelho. Vai sincronizar sozinha.`,
    saleCancelled: 'Venda cancelada.',
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
    closeCash: {
      title: 'Fechar o caixa agora?',
      text: 'Depois de fechado, o turno não pode mais receber vendas. Você ainda consegue consultar tudo no histórico.',
      button: 'Fechar caixa',
    },
  },

  connection: {
    offline: 'Sem conexão — suas vendas estão salvas e serão sincronizadas.',
    syncing: 'Voltou a conexão — sincronizando suas vendas…',
  },

  paymentMethods: {
    cash: 'Dinheiro',
    pix: 'Pix',
    debit_card: 'Cartão de débito',
    credit_card: 'Cartão de crédito',
  },

  cart: {
    summary: (count: number) => `${count} ${count === 1 ? 'item' : 'itens'} no carrinho`,
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

  units: {
    soldToday: (count: number) => `${count} ${count === 1 ? 'unidade' : 'unidades'} hoje`,
  },
};
