import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';
import { servicoProtocoloApi, type Protocolo } from './protocolo';

// <-------------------SIMULAÇÃO DO BACKEND------------------->
// Mesmo arranjo de usuarios.test.ts: cada teste define como o "backend" responde
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

const PROTOCOLO: Protocolo = {
  estudoId: 1,
  criteriosInclusao: [{ id: 1, descricao: 'Adultos.' }],
  criteriosExclusao: [],
  semCriteriosExclusao: true,
  pendenciasRecrutamento: ['VISITA_PREVISTA'],
};

// Só as chamadas à API do protocolo (sem a consulta do token CSRF)
const semCsrf = (chamadas: InternalAxiosRequestConfig[]) => chamadas.filter((c) => c.url !== '/auth/csrf');

// Corpo enviado: o Axios serializa o objeto em JSON antes do adapter
const corpo = (chamada: InternalAxiosRequestConfig) =>
  chamada.data === undefined ? undefined : JSON.parse(chamada.data as string);

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

// <-------------------ROTAS E MÉTODOS------------------->
describe('servicoProtocoloApi', () => {
  it('obter: GET /estudos/{id}/protocolo, sem token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /estudos/1/protocolo': { status: 200, data: PROTOCOLO } });

    expect(await servicoProtocoloApi.obter(1)).toEqual(PROTOCOLO);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('adicionarCriterio: POST /estudos/{id}/criterios com tipo e descrição', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/1/criterios': { status: 201, data: { id: 5, descricao: 'Gestantes.' } },
    });

    const criado = await servicoProtocoloApi.adicionarCriterio(1, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' });

    expect(criado).toEqual({ id: 5, descricao: 'Gestantes.' });
    const [post] = semCsrf(chamadas);
    expect(post.method).toBe('post');
    expect(corpo(post)).toEqual({ tipo: 'EXCLUSAO', descricao: 'Gestantes.' });
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('editarCriterio: PUT /estudos/{id}/criterios/{criterioId} só com a descrição', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/criterios/5': { status: 200, data: { id: 5, descricao: 'Lactantes.' } },
    });

    expect(await servicoProtocoloApi.editarCriterio(1, 5, 'Lactantes.')).toEqual({ id: 5, descricao: 'Lactantes.' });
    const [put] = semCsrf(chamadas);
    expect(put.method).toBe('put');
    expect(corpo(put)).toEqual({ descricao: 'Lactantes.' });
  });

  it('removerCriterio: DELETE /estudos/{id}/criterios/{criterioId}, sem corpo', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'DELETE /estudos/1/criterios/5': { status: 204 },
    });

    await expect(servicoProtocoloApi.removerCriterio(1, 5)).resolves.toBeUndefined();
    const [remocao] = semCsrf(chamadas);
    expect(remocao.method).toBe('delete');
    expect(corpo(remocao)).toBeUndefined();
    expect(remocao.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('definirSemExclusao: PATCH /estudos/{id}/protocolo e devolve o protocolo', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /estudos/1/protocolo': { status: 200, data: PROTOCOLO },
    });

    expect(await servicoProtocoloApi.definirSemExclusao(1, true)).toEqual(PROTOCOLO);
    const [patch] = semCsrf(chamadas);
    expect(patch.method).toBe('patch');
    expect(corpo(patch)).toEqual({ semCriteriosExclusao: true });
  });

  it('repassa o erro do backend no formato ErroApi', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /estudos/1/protocolo': {
        status: 400,
        data: { codigo: 'EXCLUSAO_JA_DEFINIDA', mensagem: 'Remova os critérios de exclusão.' },
      },
    });

    const erro = await servicoProtocoloApi.definirSemExclusao(1, true).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 400, codigo: 'EXCLUSAO_JA_DEFINIDA' });
  });
});
