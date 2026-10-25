import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';

// <-------------------SIMULAÇÃO DO BACKEND------------------->
// Substitui a rede: cada teste define como o "backend" responde
type Resposta = { status: number; data?: unknown };
type Rota = (config: InternalAxiosRequestConfig) => Resposta;

function responder(config: InternalAxiosRequestConfig, { status, data }: Resposta) {
  const resposta = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
  if (status >= 400) {
    return Promise.reject(new AxiosError('falha', 'ERR_BAD_RESPONSE', config, null, resposta));
  }
  return Promise.resolve(resposta);
}

function simularBackend(rotas: Record<string, Rota>) {
  const chamadas: InternalAxiosRequestConfig[] = [];
  api.defaults.adapter = (config) => {
    chamadas.push(config);
    const rota = rotas[`${config.method?.toUpperCase()} ${config.url}`];
    return responder(config, rota ? rota(config) : { status: 404 });
  };
  return chamadas;
}

const csrf = (token: string): Rota => () => ({
  status: 200,
  data: { token, headerName: 'X-CSRF-TOKEN' },
});

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

// <-------------------CONVERSÃO DE ERROS------------------->
describe('erros da API', () => {
  it('converte o erro do backend em ErroRequisicao', async () => {
    simularBackend({
      'GET /usuarios': () => ({
        status: 400,
        data: {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos: { email: 'E-mail inválido.' },
        },
      }),
    });

    const erro = await api.get('/usuarios').catch((e) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 400, codigo: 'VALIDACAO_INVALIDA' });
    expect(erro.errosCampos).toEqual({ email: 'E-mail inválido.' });
  });

  it('usa mensagem padrão quando o servidor não responde', async () => {
    api.defaults.adapter = (config) => Promise.reject(new AxiosError('sem rede', 'ERR_NETWORK', config));

    const erro = await api.get('/usuarios').catch((e) => e);

    expect(erro).toMatchObject({ status: 0, codigo: 'SEM_CONEXAO' });
  });

  it('mantém o erro da consulta do token quando a alteração não chega a ser enviada', async () => {
    // Ex.: proxy do Vite sem backend ligado responde 502 em texto puro
    simularBackend({ 'GET /auth/csrf': () => ({ status: 502, data: 'Bad Gateway' }) });

    const erro = await api.post('/auth/login', {}).catch((e) => e);

    expect(erro).toMatchObject({ status: 502, codigo: 'ERRO_HTTP' });
  });
});

// <-------------------PROTEÇÃO CSRF------------------->
describe('token CSRF', () => {
  it('busca o token e envia no cabeçalho indicado em alterações', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': csrf('token-1'),
      'POST /usuarios': () => ({ status: 201 }),
    });

    await api.post('/usuarios', {});

    const post = chamadas.find((c) => c.method === 'post');
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('token-1');
  });

  it('reaproveita o token e não o envia em consultas', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': csrf('token-1'),
      'GET /usuarios': () => ({ status: 200, data: [] }),
      'POST /usuarios': () => ({ status: 201 }),
    });

    await api.get('/usuarios');
    await api.post('/usuarios', {});
    await api.post('/usuarios', {});

    expect(chamadas.filter((c) => c.url === '/auth/csrf')).toHaveLength(1);
    expect(chamadas.find((c) => c.url === '/usuarios')?.headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('busca um novo token depois do login', async () => {
    let numero = 0;
    const chamadas = simularBackend({
      'GET /auth/csrf': () => csrf(`token-${++numero}`)({} as InternalAxiosRequestConfig),
      'POST /auth/login': () => ({ status: 200, data: {} }),
      'POST /usuarios': () => ({ status: 201 }),
    });

    await api.post('/auth/login', {});
    await api.post('/usuarios', {});

    const post = chamadas.find((c) => c.url === '/usuarios');
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('token-2');
  });

  it('repete uma vez com novo token quando recebe CSRF_INVALIDO', async () => {
    let numero = 0;
    simularBackend({
      'GET /auth/csrf': () => csrf(`token-${++numero}`)({} as InternalAxiosRequestConfig),
      'POST /usuarios': (config) =>
        config.headers.get('X-CSRF-TOKEN') === 'token-2'
          ? { status: 201 }
          : { status: 403, data: { codigo: 'CSRF_INVALIDO', mensagem: 'Atualize a proteção.' } },
    });

    const resposta = await api.post('/usuarios', {});

    expect(resposta.status).toBe(201);
  });

  it('repete no máximo uma vez quando CSRF_INVALIDO persiste', async () => {
    let numero = 0;
    const chamadas = simularBackend({
      'GET /auth/csrf': () => csrf(`token-${++numero}`)({} as InternalAxiosRequestConfig),
      'POST /usuarios': () => ({
        status: 403,
        data: { codigo: 'CSRF_INVALIDO', mensagem: 'Atualize a proteção.' },
      }),
    });
    // Trava de segurança do teste: interrompe se houver repetição sem fim
    const adapter = api.defaults.adapter as (c: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
    api.defaults.adapter = (config) => {
      if (chamadas.length > 20) return Promise.reject(new Error('repetição sem fim'));
      return adapter(config);
    };

    const erro = await api.post('/usuarios', {}).catch((e) => e);

    expect(erro).toMatchObject({ status: 403, codigo: 'CSRF_INVALIDO' });
    expect(chamadas.filter((c) => c.method === 'post')).toHaveLength(2);
  });

  it('busca o token uma única vez em alterações simultâneas', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': csrf('token-1'),
      'POST /usuarios': () => ({ status: 201 }),
    });

    await Promise.all([api.post('/usuarios', {}), api.post('/usuarios', {})]);

    expect(chamadas.filter((c) => c.url === '/auth/csrf')).toHaveLength(1);
  });
});

// <-------------------TRATAMENTO DE SESSÃO------------------->
describe('tratadores de sessão', () => {
  it('avisa quando a sessão não é válida (401)', async () => {
    const naoAutenticado = vi.fn();
    registrarTratadoresSessao({ naoAutenticado });
    simularBackend({
      'GET /usuarios': () => ({
        status: 401,
        data: { codigo: 'AUTENTICACAO_NECESSARIA', mensagem: 'Faça login.' },
      }),
    });

    await api.get('/usuarios').catch(() => undefined);

    expect(naoAutenticado).toHaveBeenCalledOnce();
  });

  it('não trata credenciais inválidas no login como sessão expirada', async () => {
    const naoAutenticado = vi.fn();
    registrarTratadoresSessao({ naoAutenticado });
    simularBackend({
      'GET /auth/csrf': csrf('token-1'),
      'POST /auth/login': () => ({
        status: 401,
        data: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha inválidos.' },
      }),
    });

    const erro = await api.post('/auth/login', {}).catch((e) => e);

    expect(erro).toMatchObject({ status: 401, codigo: 'CREDENCIAIS_INVALIDAS' });
    expect(naoAutenticado).not.toHaveBeenCalled();
  });

  it('avisa quando o perfil não tem permissão (403)', async () => {
    const acessoNegado = vi.fn();
    registrarTratadoresSessao({ acessoNegado });
    simularBackend({
      'GET /usuarios': () => ({
        status: 403,
        data: { codigo: 'ACESSO_NEGADO', mensagem: 'Seu perfil não permite esta operação.' },
      }),
    });

    await api.get('/usuarios').catch(() => undefined);

    expect(acessoNegado).toHaveBeenCalledOnce();
  });
});
