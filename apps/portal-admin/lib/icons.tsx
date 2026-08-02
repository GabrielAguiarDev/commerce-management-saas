/**
 * Console iconography. Every glyph draws with `currentColor` so it inherits the
 * colour of whatever control it sits in.
 */

interface IconProps {
  size?: number;
}

export function MarcaIcone({ size = 19 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M10 3 3.5 17h3l3.5-8 3.5 8h3L10 3Z" fill="currentColor" />
      <rect x="7.4" y="12" width="5.2" height="1.9" rx=".9" fill="currentColor" />
    </svg>
  );
}

export function ColapsarIcone({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.4" y="3.8" width="1.6" height="10.4" fill="currentColor" />
    </svg>
  );
}

export function VisaoIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="7" rx="1.6" fill="currentColor" />
      <rect x="10" y="2" width="6" height="4" rx="1.6" fill="currentColor" opacity=".55" />
      <rect x="2" y="11" width="6" height="5" rx="1.6" fill="currentColor" opacity=".55" />
      <rect x="10" y="8" width="6" height="8" rx="1.6" fill="currentColor" />
    </svg>
  );
}

export function ClientesIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="7" cy="6" r="3.1" fill="currentColor" />
      <path d="M1.6 15.4c0-2.7 2.4-4.4 5.4-4.4s5.4 1.7 5.4 4.4H1.6Z" fill="currentColor" />
      <circle cx="13.6" cy="6.6" r="2.2" fill="currentColor" opacity=".5" />
      <path
        d="M12 11.2c2.6-.5 4.4 1.1 4.4 4.2h-2.7c0-1.8-.6-3.2-1.7-4.2Z"
        fill="currentColor"
        opacity=".5"
      />
    </svg>
  );
}

export function ClientesNovoIcone({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="7" cy="6" r="3.1" fill="currentColor" />
      <path d="M1.6 15.4c0-2.7 2.4-4.4 5.4-4.4s5.4 1.7 5.4 4.4H1.6Z" fill="currentColor" />
      <path d="M14 3.4v4.2M11.9 5.5h4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FinanceiroIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M9 1.6v14.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M12.2 5.1c0-1.3-1.4-2.1-3.2-2.1s-3.2.9-3.2 2.2c0 1.4 1.3 1.9 3.2 2.3 2 .4 3.4 1 3.4 2.5 0 1.4-1.5 2.3-3.4 2.3s-3.4-.9-3.4-2.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SuporteIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M2 4.4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2H7l-4 3.2v-3.2H4c-1.1 0-2-.9-2-2V4.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PlanosIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="9.5" width="4" height="6.5" rx="1.4" fill="currentColor" opacity=".5" />
      <rect x="7" y="6" width="4" height="10" rx="1.4" fill="currentColor" opacity=".75" />
      <rect x="12" y="2" width="4" height="14" rx="1.4" fill="currentColor" />
    </svg>
  );
}

export function ModulosIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6.2" height="6.2" rx="1.7" fill="currentColor" />
      <rect x="9.8" y="2" width="6.2" height="6.2" rx="1.7" fill="currentColor" opacity=".45" />
      <rect x="2" y="9.8" width="6.2" height="6.2" rx="1.7" fill="currentColor" opacity=".45" />
      <rect x="10.6" y="10.6" width="4.6" height="4.6" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ConfigIcone({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M7.7 1.6h2.6l.35 1.9 1.5.87 1.8-.7 1.3 2.26-1.42 1.3v1.74l1.42 1.3-1.3 2.26-1.8-.7-1.5.87-.35 1.9H7.7l-.35-1.9-1.5-.87-1.8.7-1.3-2.26 1.42-1.3V7.23L2.75 5.93l1.3-2.26 1.8.7 1.5-.87L7.7 1.6Z"
        fill="currentColor"
      />
      {/* Punched out with the sidebar colour so the gear reads as a ring. */}
      <circle cx="9" cy="9" r="2.15" fill="var(--side)" />
    </svg>
  );
}

export function SairIcone({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M7.2 2.6H4.4c-.9 0-1.6.7-1.6 1.6v9.6c0 .9.7 1.6 1.6 1.6h2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.4 5.8 14.6 9l-3.2 3.2M14.2 9H7.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SinoIcone({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M9 2.2c-2.5 0-4.2 1.9-4.2 4.3 0 2.7-.5 4-1.2 4.8-.3.4 0 1 .5 1h9.8c.5 0 .8-.6.5-1-.7-.8-1.2-2.1-1.2-4.8 0-2.4-1.7-4.3-4.2-4.3Z"
        fill="currentColor"
      />
      <path d="M7.2 14.1a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IdiomaIcone({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="6.6" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="9" cy="9" rx="3" ry="6.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.6 6.8h12.8M2.6 11.2h12.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function SolIcone({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3.4" fill="currentColor" />
      <path
        d="M9 .8v2.6M9 14.6v2.6M.8 9h2.6M14.6 9h2.6M3.2 3.2l1.9 1.9M12.9 12.9l1.9 1.9M14.8 3.2l-1.9 1.9M5.1 12.9l-1.9 1.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LuaIcone({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M15.2 11.4A6.8 6.8 0 0 1 6.6 2.8a6.9 6.9 0 1 0 8.6 8.6Z" fill="currentColor" />
    </svg>
  );
}

export function BaixarIcone({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M9 2.6v8.2M5.8 7.8 9 11l3.2-3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.2 13.4v1.2c0 .6.5 1 1 1h9.6c.5 0 1-.4 1-1v-1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EditarIcone({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M11.6 2.9l3.5 3.5-8 8H3.6v-3.5l8-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lixeira — excluir um plano do catálogo. */
export function LixeiraIcone({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M3.4 5.2h11.2M7.4 5.2V3.8h3.2v1.4M4.9 5.2l.7 8.6a1.2 1.2 0 0 0 1.2 1.1h4.4a1.2 1.2 0 0 0 1.2-1.1l.7-8.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Phone outline that marks the "mobile access" module. */
export function AcessoIcone() {
  return (
    <svg width="8" height="11" viewBox="0 0 10 14" fill="none">
      <rect x="0.6" y="0.6" width="8.8" height="12.8" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <rect x="3.6" y="10.6" width="2.8" height="1.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}

/** Seta do select. Herda a cor de quem a contém, então acompanha o tema. */
export function ChevronBaixoIcone({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M4.5 7 9 11.5 13.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
