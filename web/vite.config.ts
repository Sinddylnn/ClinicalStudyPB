import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// <-------------------CONFIGURAÇÃO DO VITE------------------->
export default defineConfig({
  plugins: [react()],

  // <-------------------SERVIDOR DE DESENVOLVIMENTO------------------->
  // Encaminha /api ao backend: web e API ficam na mesma origem,
  // o que evita problemas de CORS, cookie de sessão e CSRF em desenvolvimento.
  // O backend não usa o prefixo: /api/usuarios chega lá como /usuarios
  server: {
    proxy: {
      '/api': {
        // No Docker o backend é outro container; fora dele permanece localhost
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8080',
        rewrite: (caminho) => caminho.replace(/^\/api/, ''),
      },
    },
  },

  // <-------------------TESTES (VITEST)------------------->
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Os testes que digitam nos formulários passam de 5 s em máquinas mais lentas ou ocupadas
    testTimeout: 15000,
    // Os testes usam sempre os serviços simulados, mesmo que o web/.env de quem roda aponte para o backend
    env: {
      VITE_ESTUDOS_API: 'simulado',
      VITE_CANDIDATOS_API: 'simulado',
      VITE_PROTOCOLO_API: 'simulado',
    },
    // Cobertura com Istanbul (kickoff): npm run test:coverage gera o resumo no terminal
    // e o relatório em coverage/index.html (pasta ignorada pelo Git)
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: ['src/**/*.test.*', 'src/test/**', 'src/main.tsx'],
    },
  },
});
