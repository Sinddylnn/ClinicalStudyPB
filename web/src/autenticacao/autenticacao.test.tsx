import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login, logout, sessaoAtual, type UsuarioSessao } from '../api/autenticacao';
import { registrarTratadoresSessao } from '../api/cliente';
import { ErroRequisicao } from '../api/erros';
import BarraNavegacao from '../components/BarraNavegacao';
import Login from '../pages/login/Login';
import RotaProtegida from '../routes/RotaProtegida';
import { useUsuarioLogado } from './contextoAutenticacao';
import ProvedorAutenticacao from './ProvedorAutenticacao';

// <-------------------SIMULAÇÕES------------------->
// A rede fica fora: as chamadas de autenticação e o registro dos tratadores são simulados
vi.mock('../api/autenticacao', () => ({ login: vi.fn(), logout: vi.fn(), sessaoAtual: vi.fn() }));
vi.mock('../api/cliente', () => ({ registrarTratadoresSessao: vi.fn() }));

const PAULA: UsuarioSessao = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula@exemplo.com',
  perfil: 'PESQUISADOR',
};

const CARLOS: UsuarioSessao = {
  id: 3,
  nome: 'Carlos Coordenador',
  email: 'carlos@exemplo.com',
  perfil: 'COORDENADOR',
};

// Tratadores que o provedor registrou no cliente HTTP
function tratadores() {
  return vi.mocked(registrarTratadoresSessao).mock.calls.at(-1)![0];
}

function PaginaEstudos({ titulo = 'Estudos protegidos' }: { titulo?: string }) {
  const usuario = useUsuarioLogado();
  return (
    <>
      <BarraNavegacao usuario={usuario} />
      <h1>{titulo}</h1>
      <Link to="/estudos/novo">Ir para novo estudo</Link>
    </>
  );
}

function renderizarEm(caminho: string) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <ProvedorAutenticacao>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/acesso-negado" element={<h1>Acesso negado</h1>} />
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<h1>Início</h1>} />
          </Route>
          <Route element={<RotaProtegida perfis={['PESQUISADOR']} />}>
            <Route path="/estudos" element={<PaginaEstudos />} />
            <Route path="/estudos/novo" element={<PaginaEstudos titulo="Novo estudo protegido" />} />
          </Route>
          <Route element={<RotaProtegida perfis={['ADMINISTRADOR']} />}>
            <Route path="/usuarios" element={<h1>Usuários</h1>} />
          </Route>
        </Routes>
      </ProvedorAutenticacao>
    </MemoryRouter>,
  );
}

async function entrarComo(email: string) {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('E-mail'), email);
  await usuario.type(screen.getByLabelText('Senha'), 'segredo');
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
}

async function clicarEmSair() {
  const usuario = userEvent.setup();
  await usuario.click(await screen.findByRole('button', { name: /Paula Pesquisadora/ }));
  await usuario.click(screen.getByRole('menuitem', { name: 'Sair' }));
}

beforeEach(() => {
  vi.resetAllMocks();
});

// <-------------------ROTA PROTEGIDA------------------->
describe('RotaProtegida', () => {
  it('mostra carregando enquanto consulta a sessão', () => {
    vi.mocked(sessaoAtual).mockReturnValue(new Promise(() => {}));
    renderizarEm('/estudos');
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
  });

  it('sem sessão leva ao login e, após entrar, volta à página pedida', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue(PAULA);
    renderizarEm('/estudos');

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    // Primeiro acesso sem sessão não é expiração
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument();

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('E-mail'), 'paula@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), 'segredo');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Estudos protegidos' })).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('paula@exemplo.com', 'segredo');
    // O login acabou de confirmar a sessão: a volta à página pedida não revalida
    expect(sessaoAtual).toHaveBeenCalledTimes(1);
  });

  it('leva ao acesso negado quando o perfil não pode abrir a rota', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    renderizarEm('/usuarios');
    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });

  it('leva ao login avisando quando não consegue verificar a sessão (SEM_CONEXAO)', async () => {
    vi.mocked(sessaoAtual).mockRejectedValue(
      new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }),
    );
    renderizarEm('/estudos');

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível verificar sua sessão. Tente novamente.',
    );
  });

  it('tira o aviso de falha na verificação depois de entrar', async () => {
    vi.mocked(sessaoAtual).mockRejectedValue(
      new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }),
    );
    vi.mocked(login).mockResolvedValue(PAULA);
    vi.mocked(logout).mockResolvedValue();
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Entrar na sua conta' });

    const usuario = userEvent.setup();
    await usuario.type(screen.getByLabelText('E-mail'), 'paula@exemplo.com');
    await usuario.type(screen.getByLabelText('Senha'), 'segredo');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
    await clicarEmSair();

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível verificar sua sessão. Tente novamente.')).not.toBeInTheDocument();
  });
});

// <-------------------TRATADORES DE SESSÃO------------------->
describe('tratadores de sessão', () => {
  it('leva ao login avisando que a sessão expirou (401 com alguém logado)', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Estudos protegidos' });

    act(() => tratadores().naoAutenticado?.());

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument();
  });

  it('depois da sessão expirada, volta à página de origem ao entrar de novo', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    vi.mocked(login).mockResolvedValue(PAULA);
    renderizarEm('/estudos/novo');
    await screen.findByRole('heading', { name: 'Novo estudo protegido' });

    act(() => tratadores().naoAutenticado?.());
    await screen.findByRole('heading', { name: 'Entrar na sua conta' });
    await entrarComo('paula@exemplo.com');

    expect(await screen.findByRole('heading', { name: 'Novo estudo protegido' })).toBeInTheDocument();
  });

  it('leva ao acesso negado (403 ACESSO_NEGADO)', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Estudos protegidos' });

    act(() => tratadores().acessoNegado?.());

    expect(await screen.findByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
  });
});

// <-------------------REVALIDAÇÃO DA SESSÃO------------------->
describe('revalidação da sessão', () => {
  it('ao trocar de rota com a sessão encerrada (401), vai para o login avisando e guarda a página', async () => {
    vi.mocked(sessaoAtual).mockResolvedValueOnce(PAULA).mockResolvedValue(null);
    vi.mocked(login).mockResolvedValue(PAULA);
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Estudos protegidos' });

    await userEvent.setup().click(screen.getByRole('link', { name: 'Ir para novo estudo' }));

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument();

    await entrarComo('paula@exemplo.com');
    expect(await screen.findByRole('heading', { name: 'Novo estudo protegido' })).toBeInTheDocument();
  });

  it('ao trocar de rota, atualiza a barra quando os dados da conta mudaram', async () => {
    vi.mocked(sessaoAtual)
      .mockResolvedValueOnce(PAULA)
      .mockResolvedValue({ ...PAULA, nome: 'Paula Lima' });
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Estudos protegidos' });

    await userEvent.setup().click(screen.getByRole('link', { name: 'Ir para novo estudo' }));

    expect(await screen.findByRole('button', { name: /Paula Lima/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo estudo protegido' })).toBeInTheDocument();
  });

  it('não desloga quando a revalidação falha por SEM_CONEXAO', async () => {
    vi.mocked(sessaoAtual)
      .mockResolvedValueOnce(PAULA)
      .mockRejectedValue(
        new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }),
      );
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Estudos protegidos' });

    await userEvent.setup().click(screen.getByRole('link', { name: 'Ir para novo estudo' }));

    await waitFor(() => expect(sessaoAtual).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'Novo estudo protegido' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Entrar na sua conta' })).not.toBeInTheDocument();
  });

  it('ao voltar para a aba com a sessão encerrada, vai para o login', async () => {
    vi.mocked(sessaoAtual).mockResolvedValueOnce(PAULA).mockResolvedValue(null);
    renderizarEm('/estudos');
    await screen.findByRole('heading', { name: 'Estudos protegidos' });

    const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument();
    visibilidade.mockRestore();
  });
});

// <-------------------SAIR------------------->
describe('sair', () => {
  it('encerra a sessão no servidor e vai para o login (204)', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    vi.mocked(logout).mockResolvedValue();
    renderizarEm('/estudos');

    await clicarEmSair();

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument();
  });

  it('sai e entra com outra conta → vai para /', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    vi.mocked(logout).mockResolvedValue();
    vi.mocked(login).mockResolvedValue(CARLOS);
    renderizarEm('/estudos/novo');

    await clicarEmSair();
    await screen.findByRole('heading', { name: 'Entrar na sua conta' });
    await entrarComo('carlos@exemplo.com');

    // Não herda a página de quem saiu (/estudos/novo levaria o coordenador ao acesso negado)
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acesso negado' })).not.toBeInTheDocument();
  });

  it('vai para o login quando a sessão já estava encerrada (401)', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    // Como o cliente real, avisa o tratador antes de recusar
    vi.mocked(logout).mockImplementation(async () => {
      tratadores().naoAutenticado?.();
      throw new ErroRequisicao(401, { codigo: 'AUTENTICACAO_NECESSARIA', mensagem: 'Sessão encerrada.' });
    });
    renderizarEm('/estudos');

    await clicarEmSair();

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument();
  });

  it('mantém a pessoa logada e avisa quando o logout falha (SEM_CONEXAO)', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    vi.mocked(logout).mockRejectedValue(
      new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }),
    );
    renderizarEm('/estudos');

    await clicarEmSair();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível sair. Tente novamente.');
    expect(screen.getByRole('heading', { name: 'Estudos protegidos' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeEnabled();
  });

  it('limpa o erro do Sair ao reabrir o menu da conta', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    vi.mocked(logout).mockRejectedValue(
      new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }),
    );
    renderizarEm('/estudos');
    await clicarEmSair();
    await screen.findByRole('alert');

    const usuario = userEvent.setup();
    const conta = screen.getByRole('button', { name: /Paula Pesquisadora/ });
    await usuario.click(conta); // fecha
    await usuario.click(conta); // reabre

    expect(screen.getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
