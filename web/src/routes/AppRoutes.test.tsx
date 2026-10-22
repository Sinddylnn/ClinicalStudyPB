import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import AppRoutes from './AppRoutes';

// <-------------------TESTES DAS ROTAS------------------->
function renderizarEm(caminho: string) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AppRoutes', () => {
  it('mostra a página inicial na rota /', () => {
    renderizarEm('/');
    expect(screen.getByRole('heading', { name: 'ClinicalStudyPB' })).toBeInTheDocument();
  });

  it('mostra a página não encontrada para rota inexistente', () => {
    renderizarEm('/rota-inexistente');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });
});