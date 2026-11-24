import { defineConfig, devices } from '@playwright/test';

// <-------------------CONFIGURAÇÃO DO E2E (PLAYWRIGHT)------------------->
// Os testes usam o backend real. Antes de rodar:
//   1. na raiz do projeto: docker compose up -d --build   (backend na porta 8080)
//   2. na pasta web:       npm run e2e
// O servidor do Vite sobe sozinho na porta 5173 (ou reaproveita um já aberto).
const PORTA = 5173;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Os cenários compartilham o mesmo estudo e rodam um por vez
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Recife',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORTA} --strictPort`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      VITE_ESTUDOS_API: 'real',
      VITE_CANDIDATOS_API: 'real',
      VITE_PROTOCOLO_API: 'real',
      VITE_ACOMPANHAMENTO_API: 'real',
    },
  },
});
