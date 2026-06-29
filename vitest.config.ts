import path from "node:path";
import { defineConfig } from "vitest/config";

// __dirname is safe here: this project has no "type": "module" in package.json, so
// Vite's config loader bundles this file as CJS, where __dirname is a real variable.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
