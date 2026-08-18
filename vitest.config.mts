import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Honours the "@/*" path alias declared in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      include: ["lib/**/*.ts", "types/**/*.ts", "components/**/hooks/**/*.ts"],
    },
  },
});
