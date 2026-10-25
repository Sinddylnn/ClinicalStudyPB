import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { login, logout, sessaoAtual, type UsuarioSessao } from './autenticacao';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';

// <-------------------SIMULAÇÃO DO BACKEND------------------->
// Mesmo arranjo de cliente.test.ts: cada teste define como o "backend" responde
type Resposta = { status: number; data?: unknown };

function simularBackend(rotas: Record<string, Resposta>) {
  const chamadas: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = (config) => {
    chamadas.push(config);
    const { status, data } = rotas[`${config.method?.toUpperCase()} ${config.url}`] ?? { status: 404 };
    const resposta = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
    if (status >= 400) {
      return Promise.reject(new AxiosError('falha', 'ERR_BAD_RESPONSE', config, null, resposta));
    }
    return Promise.resolve(resposta);
  };
  return chamadas;
}

const CSRF: Resposta = { status: 200, data: { token: 'abc', headerName: 'X-CSRF-TOKEN' } };

const PAULA: UsuarioSessao = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula@exemplo.com',
  perfil: 'PESQUISADOR',
};

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

// <-------------------LOGIN------------------->
describe('login', () => {
  it('envia e-mail aparado e senha exata, e devolve o usuário', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /auth/login': { status: 200, data: PAULA },
    });

    const usuario = await login('  paula@exemplo.com ', ' senha com espaço ');

    expect(usuario).toEqual(PAULA);
    const post = chamadas.find((c) => c.url === '/auth/login');
    expect(JSON.parse(post?.data)).toEqual({ email: 'paula@exemplo.com', senha: ' senha com espaço ' });
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('repassa CREDENCIAIS_INVALIDAS como ErroRequisicao', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /auth/login': {
        status: 401,
        data: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha inválidos.' },
      },
    });

    const erro = await login('paula@exemplo.com', 'errada').catch((e) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro.codigo).toBe('CREDENCIAIS_INVALIDAS');
  });
});

// <-------------------LOGOUT------------------->
describe('logout', () => {
  it('envia POST /auth/logout com o token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /auth/csrf': CSRF, 'POST /auth/logout': { status: 204 } });

    await logout();

    expect(chamadas.find((c) => c.url === '/auth/logout')?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });
});

// <-------------------SESSÃO ATUAL------------------->
describe('sessaoAtual', () => {
  it('devolve o usuário da sessão', async () => {
    simularBackend({ 'GET /auth/sessao': { status: 200, data: PAULA } });
    await expect(sessaoAtual()).resolves.toEqual(PAULA);
  });

  it('devolve null sem sessão válida (401)', async () => {
    simularBackend({
      'GET /auth/sessao': {
        status: 401,
        data: { codigo: 'AUTENTICACAO_NECESSARIA', mensagem: 'Autenticação necessária.' },
      },
    });
    await expect(sessaoAtual()).resolves.toBeNull();
  });

  it('repassa outras falhas', async () => {
    simularBackend({ 'GET /auth/sessao': { status: 500 } });
    await expect(sessaoAtual()).rejects.toBeInstanceOf(ErroRequisicao);
  });
});
