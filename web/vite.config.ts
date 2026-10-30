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
