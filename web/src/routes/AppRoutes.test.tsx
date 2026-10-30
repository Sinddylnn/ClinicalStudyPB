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
// Estudos e protocolo simulados aqui: o web/.env local pode apontar para o backend real
vi.mock('../api/estudos', () => ({
  servicoEstudos: {
    listar: vi.fn().mockResolvedValue([
      {
        id: 1,
        titulo: 'Sono e rotina de estudantes',
        objetivo: 'Objetivo.',
        dataInicio: '2026-11-03',
        dataFim: '2027-02-28',
        limiteParticipantes: 45,
        estado: 'PLANEJAMENTO',
        responsavelId: 2,
        coordenadorId: null,
      },
    ]),
  },
}));
vi.mock('../api/protocolo', () => ({
  servicoProtocolo: {
    obter: vi.fn().mockResolvedValue({
      estudoId: 1,
      criteriosInclusao: [],
      criteriosExclusao: [],
      semCriteriosExclusao: false,
      pendenciasRecrutamento: ['CRITERIO_INCLUSAO', 'CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA'],
    }),
  },
}));

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
    expect(await screen.findByRole('heading', { name: 'Olá, Paula' })).toBeInTheDocument();
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
    expect(screen.getByText('Erro 403')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao início' })).toHaveAttribute('href', '/');
  });

  it('mantém a barra da sessão no acesso negado e na página não encontrada', async () => {
    renderizarEm('/usuarios');
    await screen.findByRole('heading', { name: 'Acesso negado' });
    expect(screen.getByRole('button', { name: /Paula Pesquisadora/ })).toBeInTheDocument();
  });

  it('mostra a página não encontrada sem a barra quando não há sessão', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(null);
    renderizarEm('/rota-inexistente');
    expect(screen.getByText('Erro 404')).toBeInTheDocument();
    // Espera a consulta da sessão terminar: sem usuário, a barra não aparece
    await vi.waitFor(() => expect(sessaoAtual).toHaveBeenCalled());
    expect(screen.queryByRole('navigation', { name: 'Menu principal' })).not.toBeInTheDocument();
  });

  it('mostra à pesquisadora o protocolo do estudo em /estudos/:id', async () => {
    renderizarEm('/estudos/1');
    expect(await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Resumo', selected: true })).toBeInTheDocument();
  });

  it('mantém /estudos/novo no cadastro, sem confundir com /estudos/:id', async () => {
    renderizarEm('/estudos/novo');
    expect(await screen.findByRole('heading', { name: 'Novo estudo' })).toBeInTheDocument();
  });

  it('abre a avaliação de elegibilidade só para o coordenador', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue({ ...PAULA, perfil: 'COORDENADOR' });
    renderizarEm('/estudos/1/candidatos/6/elegibilidade');
    expect(await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' })).toBeInTheDocument();
  });

  it('leva a pesquisadora ao acesso negado na avaliação de elegibilidade', async () => {
    renderizarEm('/estudos/1/candidatos/6/elegibilidade');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });

  it('leva o coordenador ao acesso negado no protocolo do estudo (consulta prevista para a T51)', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue({ ...PAULA, perfil: 'COORDENADOR' });
    renderizarEm('/estudos/1');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });
});
