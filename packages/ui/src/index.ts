/**
 * The component library of the Aguiar One portals.
 *
 * What lands here is what both portals draw the same way: the field, the
 * select, the action menu, the modal frame, the panel, the badge. What belongs
 * to a single product — a screen, a module card, a nav item — stays in that
 * app's `components/`, built on top of these pieces.
 *
 * The tokens live in `@aguiar/ui/tokens.css` and are imported once by each
 * app's `globals.css`.
 *
 * Everything here speaks English. Text the customer reads is never hardcoded in
 * this library: it arrives as a prop, already translated by the app's
 * dictionary.
 */

export { BRAND } from "./brand";
export { css, font, MONO, SANS } from "./css";
export { ChevronDownIcon, CloseIcon, SearchIcon, type IconProps } from "./icons";

export {
  badge,
  chip,
  columnLabel,
  dot,
  EMPTY_BOX,
  field,
  FIELD_LABEL,
  highlightedMenuItem,
  initials,
  KPI_LABEL,
  kpiStrip,
  LIST,
  MENU_BUTTON,
  MENU_ITEM,
  MENU_PANEL,
  MOBILE_BREAKPOINT,
  NUM,
  PANEL,
  PANEL_HEADER,
  PANEL_LARGE,
  PANEL_TITLE,
  PILL_GROUP,
  pill,
  primaryButton,
  SCREEN_SUBTITLE,
  SCREEN_TITLE,
  secondaryButton,
  TABLE_HEADER,
  toneBackground,
  toneColor,
  track,
  type Tone,
} from "./styleKit";

export { Button, Spinner, type ButtonProps } from "./components/Button";

export {
  Field,
  Labeled,
  LabeledField,
  MoneyField,
  SearchField,
  Select,
  SimpleSelect,
  TextArea,
} from "./components/Fields";

export {
  ActionMenu,
  ActionsMenu,
  MenuItem,
  type MenuAction,
} from "./components/ActionsMenu";

export {
  ChoiceCard,
  ChoicePill,
  ModalFooter,
  ModalFrame,
  ModalIcon,
} from "./components/Modal";

export {
  ClearFilters,
  Empty,
  HScroll,
  KpiStrip,
  NewButton,
  Panel,
  PillGroup,
  ScreenHeader,
  Suggestions,
  Switch,
  type Kpi,
} from "./components/Layout";
