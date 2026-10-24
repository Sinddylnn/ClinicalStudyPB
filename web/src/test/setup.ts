import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// <-------------------PREPARAÇÃO DOS TESTES------------------->
// desmonta os componentes renderizados após cada teste
afterEach(() => {
  cleanup();
});