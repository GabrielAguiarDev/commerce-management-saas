import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    // Carrega os modulos exatamente como Server Actions, sem neutralizar o
    // pacote `server-only` no codigo de producao.
    conditions: ["react-server"],
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "lib/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
