import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';
import { servicoProtocoloApi, type VisitaPrevista } from './protocolo';

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

// Formatos do backend: CriterioResposta traz o tipo; VisitaPrevistaResposta traz as atividades
const CRITERIOS = [
  { id: 1, tipo: 'INCLUSAO', descricao: 'Adultos.' },
  { id: 2, tipo: 'EXCLUSAO', descricao: 'Gestantes.' },
  { id: 3, tipo: 'INCLUSAO', descricao: 'Moradores da Paraíba.' },
];

const VISITAS: VisitaPrevista[] = [
  { id: 4, nome: 'Visita inicial', descricao: null, ordem: 1, atividades: [{ id: 7, descricao: 'Questionário.' }] },
];

// Só as chamadas à API do protocolo (sem a consulta do token CSRF)
const semCsrf = (chamadas: InternalAxiosRequestConfig[]) => chamadas.filter((c) => c.url !== '/auth/csrf');

// Corpo enviado: o Axios serializa o objeto em JSON antes do adapter
const corpo = (chamada: InternalAxiosRequestConfig) =>
  chamada.data === undefined ? undefined : JSON.parse(chamada.data as string);

const acessoNegado = vi.fn();

beforeEach(() => {
  descartarTokenCsrf();
  acessoNegado.mockReset();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado });
});

// <-------------------ROTAS DO BACKEND------------------->
describe('servicoProtocoloApi', () => {
  it('oferece editar e remover, publicados pelo backend', () => {
    expect(servicoProtocoloApi.recursos).toEqual({ editarRemover: true });
  });

  it('obter: compõe GET /criterios, GET /criterios/exclusao e GET /visitas, separando inclusão e exclusão', async () => {
    const chamadas = simularBackend({
      'GET /estudos/1/criterios': { status: 200, data: CRITERIOS },
      'GET /estudos/1/criterios/exclusao': { status: 200, data: { semCriteriosExclusao: false } },
      'GET /estudos/1/visitas': { status: 200, data: VISITAS },
    });

    expect(await servicoProtocoloApi.obter(1)).toEqual({
      estudoId: 1,
      criteriosInclusao: [
        { id: 1, descricao: 'Adultos.' },
        { id: 3, descricao: 'Moradores da Paraíba.' },
      ],
      criteriosExclusao: [{ id: 2, descricao: 'Gestantes.' }],
      semCriteriosExclusao: false,
      visitas: VISITAS,
    });
    // As três consultas, sem CSRF
    expect(chamadas.map((c) => `${c.method?.toUpperCase()} ${c.url}`).sort()).toEqual([
      'GET /estudos/1/criterios',
      'GET /estudos/1/criterios/exclusao',
      'GET /estudos/1/visitas',
    ]);
    expect(chamadas.every((c) => c.headers.get('X-CSRF-TOKEN') === undefined)).toBe(true);
  });

  it('obter: usa a declaração "sem exclusão" devolvida pelo backend', async () => {
    simularBackend({
      'GET /estudos/1/criterios': { status: 200, data: [CRITERIOS[0]] },
      'GET /estudos/1/criterios/exclusao': { status: 200, data: { semCriteriosExclusao: true } },
      'GET /estudos/1/visitas': { status: 200, data: [] },
    });

    expect(await servicoProtocoloApi.obter(1)).toEqual({
      estudoId: 1,
      criteriosInclusao: [{ id: 1, descricao: 'Adultos.' }],
      criteriosExclusao: [],
      semCriteriosExclusao: true,
      visitas: [],
    });
  });

  it('obter: repassa o 404 de estudo de outro pesquisador', async () => {
    simularBackend({
      'GET /estudos/9/criterios': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
      'GET /estudos/9/criterios/exclusao': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
      'GET /estudos/9/visitas': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
    });

    const erro = await servicoProtocoloApi.obter(9).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('adicionarCriterio: POST /estudos/{id}/criterios com tipo e descrição, sem o tipo na resposta', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/1/criterios': { status: 201, data: { id: 5, tipo: 'EXCLUSAO', descricao: 'Gestantes.' } },
    });

    const criado = await servicoProtocoloApi.adicionarCriterio(1, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' });

    expect(criado).toEqual({ id: 5, descricao: 'Gestantes.' });
    const [post] = semCsrf(chamadas);
    expect(post.method).toBe('post');
    expect(corpo(post)).toEqual({ tipo: 'EXCLUSAO', descricao: 'Gestantes.' });
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('definirSemExclusao: PUT /estudos/{id}/criterios/exclusao e devolve o valor gravado', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/criterios/exclusao': { status: 200, data: { semCriteriosExclusao: true } },
    });

    expect(await servicoProtocoloApi.definirSemExclusao(1, true)).toBe(true);
    const [put] = semCsrf(chamadas);
    expect(put.method).toBe('put');
    expect(corpo(put)).toEqual({ semCriteriosExclusao: true });
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('adicionarVisita: POST /estudos/{id}/visitas com nome, descrição e ordem', async () => {
    const nova = { id: 8, nome: 'Visita final', descricao: null, ordem: 3, atividades: [] };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/1/visitas': { status: 201, data: nova },
    });

    expect(await servicoProtocoloApi.adicionarVisita(1, { nome: 'Visita final', descricao: null, ordem: 3 })).toEqual(
      nova,
    );
    const [post] = semCsrf(chamadas);
    expect(corpo(post)).toEqual({ nome: 'Visita final', descricao: null, ordem: 3 });
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('adicionarAtividade: POST /estudos/{id}/visitas/{visitaId}/atividades com a descrição', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/1/visitas/4/atividades': { status: 201, data: { id: 9, descricao: 'Aferir pressão.' } },
    });

    expect(await servicoProtocoloApi.adicionarAtividade(1, 4, 'Aferir pressão.')).toEqual({
      id: 9,
      descricao: 'Aferir pressão.',
    });
    const [post] = semCsrf(chamadas);
    expect(corpo(post)).toEqual({ descricao: 'Aferir pressão.' });
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('repassa ORDEM_VISITA_DUPLICADA e os erros de campo do backend', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/1/visitas': {
        status: 400,
        data: { codigo: 'ORDEM_VISITA_DUPLICADA', mensagem: 'Já existe uma visita prevista com essa ordem.' },
      },
      'POST /estudos/1/visitas/4/atividades': {
        status: 400,
        data: {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos: { descricao: 'Informe a descrição da atividade.' },
        },
      },
    });

    const duplicada = await servicoProtocoloApi
      .adicionarVisita(1, { nome: 'Outra', descricao: null, ordem: 1 })
      .catch((e: unknown) => e);
    expect(duplicada).toMatchObject({ status: 400, codigo: 'ORDEM_VISITA_DUPLICADA' });

    const invalida = await servicoProtocoloApi.adicionarAtividade(1, 4, ' ').catch((e: unknown) => e);
    expect(invalida).toMatchObject({ errosCampos: { descricao: 'Informe a descrição da atividade.' } });
  });

  it('repassa ESTUDO_FORA_PLANEJAMENTO', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/3/criterios': {
        status: 400,
        data: {
          codigo: 'ESTUDO_FORA_PLANEJAMENTO',
          mensagem: 'Os critérios só podem ser alterados enquanto o estudo estiver em planejamento.',
        },
      },
    });

    const erro = await servicoProtocoloApi
      .adicionarCriterio(3, { tipo: 'INCLUSAO', descricao: 'Adultos.' })
      .catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 400, codigo: 'ESTUDO_FORA_PLANEJAMENTO' });
  });

  it('editar e remover critério: PUT com tipo e descrição e DELETE /estudos/{id}/criterios/{criterioId}', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/criterios/5': { status: 200, data: { id: 5, tipo: 'EXCLUSAO', descricao: 'Lactantes.' } },
      'DELETE /estudos/1/criterios/5': { status: 204 },
    });

    // A resposta traz o tipo, mas o Criterio da tela guarda só id e descrição
    expect(await servicoProtocoloApi.editarCriterio(1, 5, { tipo: 'EXCLUSAO', descricao: 'Lactantes.' })).toEqual({
      id: 5,
      descricao: 'Lactantes.',
    });
    await expect(servicoProtocoloApi.removerCriterio(1, 5)).resolves.toBeUndefined();

    const [put, remocao] = semCsrf(chamadas);
    expect(put.method).toBe('put');
    expect(put.url).toBe('/estudos/1/criterios/5');
    expect(corpo(put)).toEqual({ tipo: 'EXCLUSAO', descricao: 'Lactantes.' });
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('abc');
    expect(remocao.method).toBe('delete');
    expect(corpo(remocao)).toBeUndefined();
    expect(remocao.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('repassa CRITERIOS_EXCLUSAO_INCONSISTENTES ao editar uma exclusão com a declaração marcada', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/criterios/5': {
        status: 400,
        data: {
          codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
          mensagem: 'Desmarque a ausência de critérios de exclusão antes de cadastrar ou editar uma exclusão.',
        },
      },
    });

    const erro = await servicoProtocoloApi
      .editarCriterio(1, 5, { tipo: 'EXCLUSAO', descricao: 'Lactantes.' })
      .catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({
      status: 400,
      codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
      message: 'Desmarque a ausência de critérios de exclusão antes de cadastrar ou editar uma exclusão.',
    });
    // Erro de regra de negócio não é tratado como acesso negado
    expect(acessoNegado).not.toHaveBeenCalled();
  });

  it('editar e remover visita: PUT e DELETE /estudos/{id}/visitas/{visitaId}', async () => {
    const editada = { ...VISITAS[0], nome: 'Visita de abertura' };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/visitas/4': { status: 200, data: editada },
      'DELETE /estudos/1/visitas/4': { status: 204 },
    });

    expect(
      await servicoProtocoloApi.editarVisita(1, 4, { nome: 'Visita de abertura', descricao: null, ordem: 1 }),
    ).toEqual(editada);
    await servicoProtocoloApi.removerVisita(1, 4);

    const [put, remocao] = semCsrf(chamadas);
    expect(corpo(put)).toEqual({ nome: 'Visita de abertura', descricao: null, ordem: 1 });
    expect(remocao.method).toBe('delete');
  });

  it('editar e remover atividade: PUT e DELETE /estudos/{id}/visitas/{visitaId}/atividades/{atividadeId}', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'PUT /estudos/1/visitas/4/atividades/7': { status: 200, data: { id: 7, descricao: 'Outra.' } },
      'DELETE /estudos/1/visitas/4/atividades/7': { status: 204 },
    });

    expect(await servicoProtocoloApi.editarAtividade(1, 4, 7, 'Outra.')).toEqual({ id: 7, descricao: 'Outra.' });
    await servicoProtocoloApi.removerAtividade(1, 4, 7);

    const [put, remocao] = semCsrf(chamadas);
    expect(corpo(put)).toEqual({ descricao: 'Outra.' });
    expect(remocao.url).toBe('/estudos/1/visitas/4/atividades/7');
  });
});
