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

  startup: {
    title: 'Preparando tudo para você',
    text: 'Só um instante enquanto organizamos o seu negócio.',
    a11yLabel: 'Abrindo o aplicativo',
  },

  auth: {
    tagline: 'Gestão simples do seu negócio',

    signIn: {
      title: 'Entre na sua conta',
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
      noAccount: 'Ainda não tem conta?',
      contactSupport: 'Fale com o suporte',
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
