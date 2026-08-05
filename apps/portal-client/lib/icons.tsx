import type { ModuleKey } from "@/types/types";

/**
 * Os ícones do menu, desenhados à mão em vez de virem de uma biblioteca.
 *
 * São nove traçados sobre a mesma grade de 24 e a mesma espessura, então o
 * conjunto fica coerente e o portal não carrega um pacote inteiro por causa
 * disso. Todos herdam `currentColor` — quem decide a cor é o item do menu.
 */
type Dash = ["rect" | "circle" | "path", Record<string, string | number>];

const DASHES: Record<ModuleKey, Dash[]> = {
  dashboard: [
    ["rect", { x: 3, y: 3, width: 7.5, height: 7.5, rx: 1.6 }],
    ["rect", { x: 13.5, y: 3, width: 7.5, height: 7.5, rx: 1.6 }],
    ["rect", { x: 3, y: 13.5, width: 7.5, height: 7.5, rx: 1.6 }],
    ["rect", { x: 13.5, y: 13.5, width: 7.5, height: 7.5, rx: 1.6 }],
  ],
  sales: [
    ["path", { d: "M3 4h2.2l2.4 10.2h9.6l2.2-7.2H6.4" }],
    ["circle", { cx: 9.5, cy: 19, r: 1.6 }],
    ["circle", { cx: 17, cy: 19, r: 1.6 }],
  ],
  products: [
    ["path", { d: "M12.6 3H20v7.4l-8.9 8.9a1.6 1.6 0 0 1-2.3 0L3.7 13.2a1.6 1.6 0 0 1 0-2.3Z" }],
    ["circle", { cx: 16.4, cy: 6.6, r: 1.3 }],
  ],
  stock: [
    ["rect", { x: 3.5, y: 12.5, width: 8, height: 8, rx: 1.4 }],
    ["rect", { x: 12.5, y: 12.5, width: 8, height: 8, rx: 1.4 }],
    ["rect", { x: 8, y: 3.5, width: 8, height: 8, rx: 1.4 }],
  ],
  register: [
    ["rect", { x: 2.8, y: 6, width: 18.4, height: 12, rx: 2.2 }],
    ["circle", { cx: 12, cy: 12, r: 2.6 }],
    ["path", { d: "M6.4 9.6v4.8M17.6 9.6v4.8" }],
  ],
  costs: [
    ["path", { d: "M5.5 3h13v18l-3.2-2-3.3 2-3.3-2-3.2 2Z" }],
    ["path", { d: "M9 8h6M9 12h6" }],
  ],
  reports: [
    ["path", { d: "M4 20h16" }],
    ["rect", { x: 5.5, y: 12, width: 3.6, height: 5, rx: 1 }],
    ["rect", { x: 10.8, y: 8, width: 3.6, height: 9, rx: 1 }],
    ["rect", { x: 16.1, y: 4.5, width: 3.6, height: 12.5, rx: 1 }],
  ],
  support: [
    ["path", { d: "M20.5 11.5a8.5 8.5 0 1 1-3.6-6.93" }],
    ["path", { d: "M20.5 11.5A8.5 8.5 0 0 1 7.2 18.6L3.5 19.8l1.2-3.7" }],
    ["path", { d: "M9.6 9.2a2.5 2.5 0 1 1 3.5 2.3c-.7.35-1.1.9-1.1 1.6" }],
    ["circle", { cx: 12, cy: 16.4, r: 0.9 }],
  ],
  settings: [
    ["circle", { cx: 12, cy: 12, r: 3 }],
    [
      "path",
      {
        d: "M19.1 14.6a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.91 1.37v.17a1.8 1.8 0 1 1-3.6 0v-.09a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.91h-.17a1.8 1.8 0 1 1 0-3.6h.09a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06a1.8 1.8 0 1 1 2.55-2.55l.06.06a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .91-1.37v-.17a1.8 1.8 0 1 1 3.6 0v.09a1.5 1.5 0 0 0 .91 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.91h.17a1.8 1.8 0 1 1 0 3.6h-.09a1.5 1.5 0 0 0-1.37.91Z",
      },
    ],
  ],
};

export function ModuleIcon({ module, size = 20 }: { module: ModuleKey; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {DASHES[module].map(([type, attrs], i) => {
        if (type === "rect") return <rect key={i} {...attrs} />;
        if (type === "circle") return <circle key={i} {...attrs} />;
        return <path key={i} {...attrs} />;
      })}
    </svg>
  );
}
