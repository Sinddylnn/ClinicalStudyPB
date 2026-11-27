import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// <-------------------PREPARAÇÃO DOS TESTES------------------->
// findBy e waitFor esperam até 3 s: com a cobertura ligada, alguns fluxos passam de 1 s
configure({ asyncUtilTimeout: 3000 });

// desmonta os componentes renderizados após cada teste
afterEach(() => {
  cleanup();
});