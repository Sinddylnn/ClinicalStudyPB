import { afterEach, describe, expect, it, vi } from 'vitest';

// <-------------------RECURSOS DO ACOMPANHAMENTO------------------->
// recursosAcompanhamento é calculado ao carregar o módulo: cada caso define o modo e importa de novo
async function carregarRecursos(modo: string) {
  vi.stubEnv('VITE_ACOMPANHAMENTO_API', modo);
  vi.resetModules();
  return (await import('./acompanhamento')).recursosAcompanhamento;
}

describe('recursosAcompanhamento', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('no modo real, liga a retirada (PR #48) e a lista do pesquisador (PR #41), mas não o histórico', async () => {
    expect(await carregarRecursos('real')).toEqual({ historico: false, listaPesquisador: true, retirada: true });
  });

  it('no modo simulado, liga tudo', async () => {
    expect(await carregarRecursos('simulado')).toEqual({ historico: true, listaPesquisador: true, retirada: true });
  });
});
