import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@aguiar/ui` é publicado como TypeScript, sem passo de build: o Next é quem
  // o compila junto com o app. É o que mantém a lib editável sem `pnpm build`
  // a cada mudança. `@aguiar/brand` entra pelo mesmo motivo — é TS puro, e a
  // lib o importa —, e sem ele na lista o build quebra no `import` da marca.
  transpilePackages: ["@aguiar/ui", "@aguiar/brand"],
};

export default nextConfig;
