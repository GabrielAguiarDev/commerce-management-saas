/** MODELO DE DOMÍNIO do suporte. */

export type StatusChamado = 'respondido' | 'em_andamento' | 'resolvido';

export interface Chamado {
  id: string;
  assunto: string;
  resumo: string;
  status: StatusChamado;
  /** "Respondido" / "Em andamento" / "Resolvido". */
  statusRotulo: string;
  naoLida: boolean;
}

export interface MensagemDoChamado {
  id: string;
  texto: string;
  /** `true` = escrita pelo dono do negócio (bolha teal, à direita). */
  minha: boolean;
  quando: string;
}

export const CATEGORIAS_CHAMADO = [
  { chave: 'duvida', rotulo: 'Dúvida' },
  { chave: 'problema', rotulo: 'Algo não funcionou' },
  { chave: 'plano', rotulo: 'Plano e módulos' },
  { chave: 'sugestao', rotulo: 'Sugestão' },
] as const;

export type CategoriaChamado = (typeof CATEGORIAS_CHAMADO)[number]['chave'];

export interface NovoChamado {
  assunto: string;
  categoria: CategoriaChamado;
  descricao: string;
}

export type CodigoErroSuporte = 'assunto_obrigatorio' | 'descricao_obrigatoria' | 'rede';

export class SuporteError extends Error {
  constructor(readonly codigo: CodigoErroSuporte, mensagem?: string) {
    super(mensagem ?? codigo);
    this.name = 'SuporteError';
  }
}
