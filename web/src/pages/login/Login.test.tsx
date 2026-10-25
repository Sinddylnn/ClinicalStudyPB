import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login, sessaoAtual, type UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import ProvedorAutenticacao from '../../autenticacao/ProvedorAutenticacao';
import Login from './Login';

// <-------------------SIMULAÇÕES------------------->
vi.mock('../../api/autenticacao', () => ({ login: vi.fn(), logout: vi.fn(), sessaoAtual: vi.fn() }));
vi.mock('../../api/cliente', () => ({ registrarTratadoresSessao: vi.fn() }));

const PAULA: UsuarioSessao = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula@exemplo.com',
  perfil: 'PESQUISADOR',
};

async function renderizarLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <ProvedorAutenticacao>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<h1>Página inicial</h1>} />
        </Routes>
      </ProvedorAutenticacao>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Entrar na sua conta' });
}

async function preencherEEntrar(email: string, senha: string) {
  const usuario = userEvent.setup();
  if (email) await usuario.type(screen.getByLabelText('E-mail'), email);
  if (senha) await usuario.type(screen.getByLabelText('Senha'), senha);
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sessaoAtual).mockResolvedValue(null);
});

// <-------------------TESTES DA TELA DE LOGIN------------------->
describe('Login', () => {
  it('aponta os campos vazios sem consultar a conta', async () => {
    await renderizarLogin();

    await preencherEEntrar('', '');

    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });

  it('mostra a mensagem genérica em CREDENCIAIS_INVALIDAS, mantém o e-mail e limpa a senha', async () => {
    vi.mocked(login).mockRejectedValue(
      new ErroRequisicao(401, { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'Credenciais inválidas.' }),
    );
    await renderizarLogin();

    await preencherEEntrar('admin@exemplo.com', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha inválidos. Confira os dados e tente novamente.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveValue('admin@exemplo.com');
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('mostra nos campos os errosCampos de VALIDACAO_INVALIDA', async () => {
    vi.mocked(login).mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'VALIDACAO_INVALIDA',
        mensagem: 'Confira os campos informados.',
        errosCampos: { email: 'Informe um e-mail válido.' },
      }),
    );
    await renderizarLogin();

    await preencherEEntrar('sem-arroba', 'segredo');

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mostra a mensagem geral em VALIDACAO_INVALIDA sem erros de e-mail ou senha', async () => {
    vi.mocked(login).mockRejectedValue(
      new ErroRequisicao(400, { codigo: 'VALIDACAO_INVALIDA', mensagem: 'Confira os campos informados.' }),
    );
    await renderizarLogin();

    await preencherEEntrar('paula@exemplo.com', 'segredo');

    expect(await screen.findByRole('alert')).toHaveTextContent('Confira os campos informados.');
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });

  it('mostra a mensagem do erro quando o servidor não responde', async () => {
    vi.mocked(login).mockRejectedValue(
      new ErroRequisicao(0, {
        codigo: 'SEM_CONEXAO',
        mensagem: 'Não foi possível conectar ao servidor. Tente novamente.',
      }),
    );
    await renderizarLogin();

    await preencherEEntrar('paula@exemplo.com', 'segredo');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
  });

  it('desabilita o botão enquanto entra e depois vai para o início', async () => {
    let concluir: (usuario: UsuarioSessao) => void = () => {};
    vi.mocked(login).mockReturnValue(new Promise((resolver) => (concluir = resolver)));
    await renderizarLogin();

    await preencherEEntrar('paula@exemplo.com', 'segredo');

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
    concluir(PAULA);
    expect(await screen.findByRole('heading', { name: 'Página inicial' })).toBeInTheDocument();
  });

  it('redireciona quem já está logado', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(PAULA);
    render(
      <MemoryRouter initialEntries={['/login']}>
        <ProvedorAutenticacao>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<h1>Página inicial</h1>} />
          </Routes>
        </ProvedorAutenticacao>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Página inicial' })).toBeInTheDocument();
  });
});
