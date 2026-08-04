import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@aguiar/ui` é publicado como TypeScript, sem passo de build: o Next é quem
  // o compila junto com o app. É o que mantém a lib editável sem `pnpm build`
  // a cada mudança.
  transpilePackages: ["@aguiar/ui"],
};

export default nextConfig;
