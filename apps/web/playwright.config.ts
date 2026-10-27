import { defineConfig, devices } from '@playwright/test';

// Em CI usa o Chromium baixado pelo Playwright; localmente usa o Chrome do sistema,
// porque a extração do Chromium nesta máquina fica incompleta.
const navegador = process.env.CI ? {} : { channel: 'chrome' as const };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...navegador } },
    { name: 'mobile', use: { ...devices['Pixel 5'], ...navegador } },
  ],
});
