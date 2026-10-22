import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// configurações do Vite
export default defineConfig({
  plugins: [react()],

  // Encaminha /api ao backend: web e API ficam na mesma origem,
  // o que evita problemas de CORS, cookie de sessão e CSRF em desenvolvimento
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },

  // <-------------------TESTES (VITEST)------------------->
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});