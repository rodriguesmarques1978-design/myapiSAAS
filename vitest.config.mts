import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// .mts e não .ts: o package.json não tem "type": "module", por isso um .ts
// seria carregado como CommonJS e o Vite avisa por causa do import/export.
export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig.json, senão os imports "@/lib/..." não resolvem
    // fora do build do Next.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
