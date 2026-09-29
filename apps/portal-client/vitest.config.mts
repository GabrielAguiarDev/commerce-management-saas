import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    // Faz `server-only` resolver para seu entrypoint vazio. O alias existe
    // apenas no runner; o boundary continua ativo no bundle do Next.
    conditions: ["react-server"],
  },
  test: {
    environment: "node",
    include: ["app/**/*.test.ts", "lib/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
