import type { CodigoErroAuth } from '@domain/session/sessionTypes';
import type { CodigoErroCaixa } from '@domain/cash/cashTypes';
import type { CodigoErroCatalogo } from '@domain/catalog/catalogTypes';
import type { CodigoErroCusto } from '@domain/costs/costsTypes';
import type { CodigoErroEstoque } from '@domain/stock/stockTypes';
import type { CodigoErroSuporte } from '@domain/support/supportTypes';
import type { CodigoErroVenda } from '@domain/sales/salesTypes';

/**
 * Copy de MENSAGEM em pt-BR: erros, toasts e confirmações.
 *
 * ESCOPO desta centralização, de propósito: só o que é acoplado a
 * comportamento (o que o domínio devolve como `codigo`, o que um fluxo dispara
 * como toast) e o que aparece em mais de uma tela. Rótulo estático de tela
 * continua junto do JSX, onde é conferível linha a linha contra o protótipo.
 *
 * Extrair 100% das strings é a melhoria natural quando entrar um segundo
 * idioma — está registrada em DEVELOPMENT.md › Pendências.
 *
 * O tipo `Record<Codigo, string>` é o que garante que um código novo no
 * domínio não compile enquanto não tiver mensagem: erro sem texto vira "algo
 * deu errado" e some do radar.
 */

export const ERROS_AUTH: Record<CodigoErroAuth, string> = {
  email_invalido: 'Confira o e-mail digitado.',
  senha_curta: 'A senha precisa ter pelo menos 6 caracteres.',
  credenciais_invalidas: 'E-mail ou senha não conferem.',
  rede: 'Sem conexão com o servidor. Tente de novo em instantes.',
  desconhecido: 'Não conseguimos entrar agora. Fale com o suporte.',
};

export const ERROS_CATALOGO: Record<CodigoErroCatalogo, string> = {
  nome_obrigatorio: 'Dê um nome ao produto para salvar.',
  preco_invalido: 'O preço não pode ser negativo.',
  rede: 'Não deu para salvar agora. Tente de novo.',
  desconhecido: 'Algo deu errado com este produto.',
};

export const ERROS_VENDA: Record<CodigoErroVenda, string> = {
  carrinho_vazio: 'Adicione pelo menos um item para vender.',
  sem_forma_de_pagamento: 'Escolha a forma de pagamento.',
  rede: 'A venda não subiu agora, mas está salva no aparelho.',
  desconhecido: 'Não conseguimos registrar esta venda.',
};

export const ERROS_CAIXA: Record<CodigoErroCaixa, string> = {
  caixa_fechado: 'O caixa não está aberto.',
  caixa_ja_aberto: 'Já existe um turno aberto.',
  valor_invalido: 'Informe um valor maior que zero.',
  rede: 'Não deu para falar com o servidor agora.',
  desconhecido: 'Algo deu errado no caixa.',
};

export const ERROS_ESTOQUE: Record<CodigoErroEstoque, string> = {
  produto_obrigatorio: 'Diga qual produto está sendo movimentado.',
  quantidade_invalida: 'Informe uma quantidade diferente de zero.',
  rede: 'Não deu para registrar a movimentação agora.',
};

export const ERROS_CUSTO: Record<CodigoErroCusto, string> = {
  nome_obrigatorio: 'Dê um nome ao custo.',
  valor_invalido: 'Informe um valor maior que zero.',
  rede: 'Não deu para salvar o custo agora.',
};

export const ERROS_SUPORTE: Record<CodigoErroSuporte, string> = {
  assunto_obrigatorio: 'Escreva um assunto para o chamado.',
  descricao_obrigatoria: 'Conte o que aconteceu para a gente ajudar.',
  rede: 'Não deu para enviar agora. Tente de novo.',
};

/** Toasts. Copy palavra por palavra do protótipo. */
export const TOASTS = {
  recuperacaoEnviada: 'Enviamos um link de recuperação para o seu e-mail.',
  cameraIndisponivel: 'Câmera do código de barras abriria aqui.',
  edicaoIndisponivel: (nome: string) =>
    `Aqui abriria a edição de ${nome}. Mudar o preço vale só para as próximas vendas.`,
  produtoCadastrado: (nome: string) => `"${nome}" cadastrado e pronto pra vender.`,
  vendaRegistrada: (total: string) => `Venda de ${total} registrada!`,
  vendaSalvaOffline: (total: string) =>
    `Venda de ${total} salva no aparelho. Vai sincronizar sozinha.`,
  vendaCancelada: 'Venda cancelada.',
  caixaAberto: 'Caixa aberto. Bom turno!',
  caixaFechado: 'Caixa fechado. Bom descanso!',
  sangriaRegistrada: 'Retirada registrada no caixa.',
  reforcoRegistrado: 'Reforço registrado no caixa.',
  estoqueAtualizado: 'Estoque atualizado.',
  custoRegistrado: 'Custo registrado.',
  negocioSalvo: 'Dados do negócio salvos.',
  pdfExportado: 'Relatório em PDF gerado e salvo no celular.',
  planilhaExportada: 'Planilha gerada e salva no celular.',
  respostaEnviada: 'Mensagem enviada ao suporte.',
  chamadoAberto: 'Chamado aberto. Respondemos em até 1 dia útil.',
  anexoIndisponivel: 'Escolha uma foto da galeria ou tire uma agora.',
  sincronizado: 'Tudo sincronizado. Nada se perdeu.',
} as const;

/** Diálogos de confirmação. */
export const CONFIRMACOES = {
  sair: {
    titulo: 'Sair da sua conta?',
    texto: 'Vendas já registradas continuam salvas. Você vai precisar entrar de novo.',
    botao: 'Sair',
  },
  cancelarVenda: {
    titulo: 'Cancelar esta venda?',
    texto: 'Os itens do carrinho serão removidos. Nada é registrado.',
    botao: 'Cancelar venda',
  },
  fecharCaixa: {
    titulo: 'Fechar o caixa agora?',
    texto:
      'Depois de fechado, o turno não pode mais receber vendas. Você ainda consegue consultar tudo no histórico.',
    botao: 'Fechar caixa',
  },
} as const;

/** Banner de conexão. */
export const CONEXAO = {
  offline: 'Sem conexão — suas vendas estão salvas e serão sincronizadas.',
  sincronizando: 'Voltou a conexão — sincronizando suas vendas…',
} as const;
