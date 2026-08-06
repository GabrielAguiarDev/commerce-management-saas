export type {
  DiferencaDeFechamento,
  LinhaDeConferencia,
  RecebimentoPorForma,
  TipoDeAjuste,
  TurnoAberto,
  TurnoEncerrado,
} from './cashTypes';
export { CaixaError } from './cashTypes';
export { calcularDiferenca, linhasDeConferencia, rotularDiferenca } from './cashAdapter';
export {
  caixaKeys,
  useAbrirCaixa,
  useFecharCaixa,
  useHistoricoDeCaixa,
  useRegistrarAjuste,
  useTurnoAberto,
} from './useCases/useCaixa';
