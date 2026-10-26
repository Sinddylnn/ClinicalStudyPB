import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';
import { servicoUsuarios, type Usuario } from './usuarios';

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

const CARLOS: Usuario = {
  id: 3,
  nome: 'Carlos Coordenador',
  email: 'carlos@exemplo.com',
  perfil: 'COORDENADOR',
  ativo: true,
};

// Só as chamadas à API de usuários (sem a consulta do token CSRF)
const semCsrf = (chamadas: InternalAxiosRequestConfig[]) => chamadas.filter((c) => c.url !== '/auth/csrf');

// Corpo enviado: o Axios serializa o objeto em JSON antes do adapter
const corpo = (chamada: InternalAxiosRequestConfig) =>
  chamada.data === undefined ? undefined : JSON.parse(chamada.data as string);

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

// <-------------------ROTAS E MÉTODOS------------------->
describe('servicoUsuarios', () => {
  it('listar: GET /usuarios, sem corpo e sem token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /usuarios': { status: 200, data: [CARLOS] } });

    const usuarios = await servicoUsuarios.listar();

    expect(usuarios).toEqual([CARLOS]);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]).toMatchObject({ method: 'get', url: '/usuarios' });
    expect(corpo(chamadas[0])).toBeUndefined();
    expect(chamadas[0].headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('cadastrar: POST /usuarios com nome, e-mail, senha e perfil', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /usuarios': { status: 201, data: CARLOS },
    });
    const entrada = {
      nome: 'Carlos Coordenador',
      email: 'carlos@exemplo.com',
      senha: 'Senha123',
      perfil: 'COORDENADOR' as const,
    };

    const criado = await servicoUsuarios.cadastrar(entrada);

    expect(criado).toEqual(CARLOS);
    const [post] = semCsrf(chamadas);
    expect(post).toMatchObject({ method: 'post', url: '/usuarios' });
    expect(corpo(post)).toEqual(entrada);
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('editar: PUT /usuarios/{id} com nome, e-mail e perfil, sem senha nem situação', async () => {
    const editado = { ...CARLOS, nome: 'Carlos Lima' };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /usuarios/3': { status: 200, data: editado },
    });

    const resposta = await servicoUsuarios.editar(3, {
      nome: 'Carlos Lima',
      email: 'carlos@exemplo.com',
      perfil: 'COORDENADOR',
    });

    expect(resposta).toEqual(editado);
    const [put] = semCsrf(chamadas);
    expect(put).toMatchObject({ method: 'put', url: '/usuarios/3' });
    expect(corpo(put)).toEqual({ nome: 'Carlos Lima', email: 'carlos@exemplo.com', perfil: 'COORDENADOR' });
    expect(corpo(put)).not.toHaveProperty('senha');
    expect(corpo(put)).not.toHaveProperty('ativo');
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('desativar: PATCH /usuarios/{id}/desativar, sem corpo', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /usuarios/3/desativar': { status: 200, data: { ...CARLOS, ativo: false } },
    });

    const resposta = await servicoUsuarios.desativar(3);

    expect(resposta.ativo).toBe(false);
    const [patch] = semCsrf(chamadas);
    expect(patch).toMatchObject({ method: 'patch', url: '/usuarios/3/desativar' });
    expect(corpo(patch)).toBeUndefined();
    expect(patch.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('reativar: PATCH /usuarios/{id}/reativar, sem corpo', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /usuarios/4/reativar': { status: 200, data: { ...CARLOS, id: 4, ativo: true } },
    });

    const resposta = await servicoUsuarios.reativar(4);

    expect(resposta).toMatchObject({ id: 4, ativo: true });
    const [patch] = semCsrf(chamadas);
    expect(patch).toMatchObject({ method: 'patch', url: '/usuarios/4/reativar' });
    expect(corpo(patch)).toBeUndefined();
    expect(patch.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('repassa o erro do backend como ErroRequisicao', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /usuarios': {
        status: 409,
        data: { codigo: 'EMAIL_JA_CADASTRADO', mensagem: 'Já existe um usuário cadastrado com este e-mail.' },
      },
    });

    const erro = await servicoUsuarios
      .cadastrar({ nome: 'Carlos', email: 'carlos@exemplo.com', senha: 'Senha123', perfil: 'COORDENADOR' })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 409, codigo: 'EMAIL_JA_CADASTRADO' });
  });
});
