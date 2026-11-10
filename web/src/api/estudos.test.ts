import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';
import { servicoCoordenadoresApi, servicoEstudosApi, type Estudo } from './estudos';

// <-------------------SIMULAÇÃO DO BACKEND------------------->
// Mesmo arranjo de protocolo.test.ts: cada teste define como o "backend" responde
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

const ESTUDO: Estudo = {
  id: 1,
  titulo: 'Sono e rotina de estudantes',
  objetivo: 'Objetivo.',
  dataInicio: '2026-11-03',
  dataFim: '2027-02-28',
  limiteParticipantes: 45,
  estado: 'ENCERRADO',
  responsavelId: 2,
  responsavelNome: 'Paula Pesquisadora',
  coordenadorId: 3,
  justificativaEncerramento: 'Estudo cancelado antes da inclusão de participantes.',
};

// Só as chamadas à API de estudos (sem a consulta do token CSRF)
const semCsrf = (chamadas: InternalAxiosRequestConfig[]) => chamadas.filter((c) => c.url !== '/auth/csrf');

const corpo = (chamada: InternalAxiosRequestConfig) =>
  chamada.data === undefined ? undefined : JSON.parse(chamada.data as string);

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

// <-------------------ROTAS E MÉTODOS------------------->
describe('servicoEstudosApi', () => {
  it('listar: GET /estudos, sem token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /estudos': { status: 200, data: [ESTUDO] } });

    expect(await servicoEstudosApi.listar()).toEqual([ESTUDO]);
    expect(chamadas[0].headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('cadastrar: POST /estudos com token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /auth/csrf': CSRF, 'POST /estudos': { status: 201, data: ESTUDO } });
    const entrada = {
      titulo: ESTUDO.titulo,
      objetivo: ESTUDO.objetivo,
      dataInicio: ESTUDO.dataInicio,
      dataFim: ESTUDO.dataFim,
      limiteParticipantes: 45,
    };

    expect(await servicoEstudosApi.cadastrar(entrada)).toEqual(ESTUDO);
    const [post] = semCsrf(chamadas);
    expect(corpo(post)).toEqual(entrada);
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('alterarEstado: PATCH /estudos/{id}/estado com token CSRF e devolve o estudo atualizado', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /estudos/1/estado': { status: 200, data: ESTUDO },
    });

    const atualizado = await servicoEstudosApi.alterarEstado(1, {
      estado: 'ENCERRADO',
      justificativaEncerramento: 'Estudo cancelado antes da inclusão de participantes.',
    });

    expect(atualizado).toEqual(ESTUDO);
    const [patch] = semCsrf(chamadas);
    expect(patch.method).toBe('patch');
    expect(corpo(patch)).toEqual({
      estado: 'ENCERRADO',
      justificativaEncerramento: 'Estudo cancelado antes da inclusão de participantes.',
    });
    expect(patch.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('alterarEstado: envia só o estado quando não é encerramento', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /estudos/1/estado': { status: 200, data: { ...ESTUDO, estado: 'RECRUTAMENTO' } },
    });

    await servicoEstudosApi.alterarEstado(1, { estado: 'RECRUTAMENTO' });

    expect(corpo(semCsrf(chamadas)[0])).toEqual({ estado: 'RECRUTAMENTO' });
  });

  it('alterarEstado: repassa a recusa do backend com código e mensagem', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /estudos/1/estado': {
        status: 400,
        data: {
          codigo: 'PROTOCOLO_INCOMPLETO',
          mensagem: 'Cadastre pelo menos um critério de inclusão para iniciar o recrutamento.',
        },
      },
    });

    const erro = await servicoEstudosApi.alterarEstado(1, { estado: 'RECRUTAMENTO' }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({
      status: 400,
      codigo: 'PROTOCOLO_INCOMPLETO',
      message: 'Cadastre pelo menos um critério de inclusão para iniciar o recrutamento.',
    });
  });

  it('alterarEstado: repassa o 404 de estudo de outro pesquisador', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'PATCH /estudos/9/estado': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
    });

    const erro = await servicoEstudosApi.alterarEstado(9, { estado: 'EXECUCAO' }).catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });
});

// <-------------------COORDENADOR DO ESTUDO------------------->
describe('servicoCoordenadoresApi', () => {
  it('listar: GET /estudos/coordenadores, sem token CSRF', async () => {
    const opcoes = [{ id: 3, nome: 'Carlos Coordenador' }];
    const chamadas = simularBackend({ 'GET /estudos/coordenadores': { status: 200, data: opcoes } });

    expect(await servicoCoordenadoresApi.listar()).toEqual(opcoes);
    expect(chamadas[0].headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('atribuir: PUT /estudos/{id}/coordenador com token CSRF e devolve o estudo atualizado', async () => {
    const atualizado = { ...ESTUDO, estado: 'PLANEJAMENTO', coordenadorId: 6 };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/coordenador': { status: 200, data: atualizado },
    });

    expect(await servicoCoordenadoresApi.atribuir(1, 6)).toEqual(atualizado);
    const [put] = semCsrf(chamadas);
    expect(put.method).toBe('put');
    expect(corpo(put)).toEqual({ coordenadorId: 6 });
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('atribuir: repassa COORDENADOR_INVALIDO e ESTUDO_ENCERRADO com a mensagem do backend', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/coordenador': {
        status: 400,
        data: { codigo: 'COORDENADOR_INVALIDO', mensagem: 'Escolha uma conta ativa com perfil de coordenador.' },
      },
      'PUT /estudos/2/coordenador': {
        status: 400,
        data: { codigo: 'ESTUDO_ENCERRADO', mensagem: 'Não é permitido alterar o coordenador de um estudo encerrado.' },
      },
    });

    const invalido = await servicoCoordenadoresApi.atribuir(1, 4).catch((e: unknown) => e);
    const encerrado = await servicoCoordenadoresApi.atribuir(2, 3).catch((e: unknown) => e);

    expect(invalido).toBeInstanceOf(ErroRequisicao);
    expect(invalido).toMatchObject({ status: 400, codigo: 'COORDENADOR_INVALIDO' });
    expect(encerrado).toMatchObject({
      status: 400,
      codigo: 'ESTUDO_ENCERRADO',
      message: 'Não é permitido alterar o coordenador de um estudo encerrado.',
    });
  });

  it('atribuir: repassa o 404 de estudo de outro pesquisador', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/9/coordenador': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
    });

    const erro = await servicoCoordenadoresApi.atribuir(9, 3).catch((e: unknown) => e);

    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });
});
