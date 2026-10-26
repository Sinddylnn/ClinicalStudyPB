import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessaoAtual, type UsuarioSessao } from '../api/autenticacao';
import ProvedorAutenticacao from '../autenticacao/ProvedorAutenticacao';
import AppRoutes from './AppRoutes';

// <-------------------SIMULAÇÕES------------------->
// A sessão vem de GET /auth/sessao, aqui simulada
vi.mock('../api/autenticacao', () => ({ login: vi.fn(), logout: vi.fn(), sessaoAtual: vi.fn() }));
vi.mock('../api/cliente', () => ({ registrarTratadoresSessao: vi.fn() }));
vi.mock('../api/usuarios', () => ({ servicoUsuarios: { listar: vi.fn().mockResolvedValue([]) } }));

const PAULA: UsuarioSessao = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula@exemplo.com',
  perfil: 'PESQUISADOR',
};

// <-------------------TESTES DAS ROTAS------------------->
function renderizarEm(caminho: string) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <ProvedorAutenticacao>
        <AppRoutes />
      </ProvedorAutenticacao>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
});

describe('AppRoutes', () => {
  it('mostra a página inicial na rota /', async () => {
    renderizarEm('/');
    expect(await screen.findByRole('heading', { name: 'ClinicalStudyPB' })).toBeInTheDocument();
  });

  it('mostra a barra com o usuário da sessão na página inicial', async () => {
    renderizarEm('/');
    expect(await screen.findByRole('button', { name: /Paula Pesquisadora/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menu principal' })).toBeInTheDocument();
  });

  it('mostra a página não encontrada para rota inexistente', () => {
    renderizarEm('/rota-inexistente');
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });

  it('leva ao login quando não há sessão', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(null);
    renderizarEm('/');
    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
  });

  it('mostra a lista de usuários ao administrador', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue({ ...PAULA, perfil: 'ADMINISTRADOR' });
    renderizarEm('/usuarios');
    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Nenhum usuário cadastrado' })).toBeInTheDocument();
  });

  it('leva ao acesso negado quando o perfil não pode abrir a rota', async () => {
    renderizarEm('/usuarios');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });
});
