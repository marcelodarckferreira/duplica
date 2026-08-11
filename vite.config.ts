/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [{
      extends: true,
      test: {
        environment: "jsdom",
        setupFiles: ["./src/shared/testing/setup.ts"],
        environmentOptions: {
          jsdom: {
            url: "http://localhost/"
          }
        },
        globals: true,
        // tests/e2e/ é a suíte Playwright (rodada via `npm run test:e2e`,
        // não pelo Vitest) — sem isso, o glob padrão do Vitest pega os
        // *.spec.ts de lá também e tenta rodá-los como testes unitários.
        exclude: ["**/node_modules/**", "tests/e2e/**"]
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: 'playwright',
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});