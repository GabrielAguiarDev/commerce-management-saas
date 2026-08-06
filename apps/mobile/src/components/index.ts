/**
 * A API pública do design system.
 *
 * Telas importam daqui (`@components`), nunca de caminho profundo. O que não
 * estiver exportado neste arquivo é detalhe interno do DS.
 *
 * A separação `ui/` (primitivos) × `patterns/` (compostos de negócio) ×
 * `sheets/` (os cinco bottom sheets) segue a regra do blueprint: passou de ~25
 * arquivos soltos, vira pasta.
 */

// ── Primitivos ──────────────────────────────────────────────────────────────
export { Avatar } from './ui/Avatar';
export { Botao, type VarianteBotao } from './ui/Botao';
export { Box, type BoxProps } from './ui/Box';
export { Campo } from './ui/Campo';
export { Cartao } from './ui/Cartao';
export { Chips, type OpcaoDeChip } from './ui/Chips';
export { Divisor } from './ui/Divisor';
export { EstadoVazio } from './ui/EstadoVazio';
export { Icone, type NomeIcone } from './ui/Icone';
export { Interruptor } from './ui/Interruptor';
export { Pilula } from './ui/Pilula';
export { Seletor, type OpcaoDeSeletor } from './ui/Seletor';
export { Text, type TextProps } from './ui/Text';
export { Toque, type ToqueProps } from './ui/Toque';

// ── Padrões ─────────────────────────────────────────────────────────────────
export { AppProviders } from './AppProviders';
export { AO_FADE, AO_PULSE, AO_SHEET, AO_UP } from './patterns/animacoes';
export { BannerDeConexao } from './patterns/BannerDeConexao';
export { BarraDeAbas, ALTURA_TAB_BAR } from './patterns/BarraDeAbas';
export { BarraDoCarrinho } from './patterns/BarraDoCarrinho';
export { BotaoNovaVenda } from './patterns/BotaoNovaVenda';
export { BottomSheet } from './patterns/BottomSheet';
export { ConfirmacaoHost } from './patterns/ConfirmacaoHost';
export { Screen, ESPACO_INFERIOR } from './patterns/Screen';
export { ToastHost } from './patterns/ToastHost';

// ── Sheets ──────────────────────────────────────────────────────────────────
export { SheetHost } from './sheets/SheetHost';
