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
export { Button, type ButtonVariant } from './ui/Button';
export { Box, type BoxProps } from './ui/Box';
export { Field } from './ui/Field';
export { Card } from './ui/Card';
export { Chips, type ChipOption } from './ui/Chips';
export { Divider } from './ui/Divider';
export { EmptyState } from './ui/EmptyState';
export { Icon, type IconName } from './ui/Icon';
export { Switch } from './ui/Switch';
export { Pill } from './ui/Pill';
export { Select, type SelectOption } from './ui/Select';
export { Skeleton } from './ui/Skeleton';
export { Text, type TextProps } from './ui/Text';
export { Touchable, type TouchableProps } from './ui/Touchable';

// ── Padrões ─────────────────────────────────────────────────────────────────
export { AppProviders } from './AppProviders';
export { AO_FADE, AO_PULSE, AO_SHEET, AO_UP } from './patterns/animations';
export { AuthScreen } from './patterns/AuthScreen';
export { ConnectionBanner } from './patterns/ConnectionBanner';
export { TabBar, ALTURA_TAB_BAR } from './patterns/TabBar';
export { CartBar } from './patterns/CartBar';
export { NewSaleButton } from './patterns/NewSaleButton';
export { BottomSheet } from './patterns/BottomSheet';
export { CodeInput } from './patterns/CodeInput';
export { ConfirmHost } from './patterns/ConfirmHost';
export { Screen, ESPACO_INFERIOR, ESPACO_INFERIOR_INTERNO } from './patterns/Screen';
export { TabPane } from './patterns/TabPane';
export { StartupError } from './patterns/StartupError';
export { StartupLoading } from './patterns/StartupLoading';
export { ToastHost } from './patterns/ToastHost';

// ── Sheets ──────────────────────────────────────────────────────────────────
export { SheetHost } from './sheets/SheetHost';
