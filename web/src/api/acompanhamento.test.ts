import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  servicoAcompanhamentoApi,
  type HistoricoParticipacao,
  type Participacao,
  type ResultadoAtividade,
  type VisitaAgendada,
} from './acompanhamento';
import { api, descartarTokenCsrf, registrarTratadoresSessao } from './cliente';
import { ErroRequisicao } from './erros';

// <-------------------SIMULAÇÃO DO BACKEND------------------->
// Mesmo arranjo de estudos.test.ts: cada teste define como o "backend" responde
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

const PARTICIPACAO: Participacao = {
  id: 120,
  participanteId: 45,
  participanteNome: 'Ana Participante',
  dataInclusao: '2026-11-10T12:00:00Z',
  situacao: 'ATIVA',
};

const HISTORICO: HistoricoParticipacao = {
  participacaoId: 120,
  itens: [
    {
      tipo: 'RETIRADA',
      dataRetirada: '2026-11-20T14:00:00Z',
      motivo: 'Retirada solicitada',
      retiradaPorId: 12,
    },
  ],
};

const VISITA: VisitaAgendada = {
  id: 7,
  participacaoId: 120,
  visitaPrevistaId: 2,
  nomeVisita: 'Visita inicial',
  dataHora: '2026-11-12T12:00:00Z',
  situacao: 'REALIZADA',
  motivo: null,
  registradoPorId: 12,
  registradoEm: '2026-11-12T13:00:00Z',
};

const RESULTADO: ResultadoAtividade = {
  id: 40,
  visitaAgendadaId: 7,
  atividadePrevistaId: 5,
  descricaoAtividade: 'Medir a pressão.',
  texto: 'Pressão 12 por 8 (fictício).',
  registradoPorId: 12,
  registradoEm: '2026-11-12T13:10:00Z',
  atualizadoPorId: null,
  atualizadoEm: null,
};

const CSRF: Resposta = { status: 200, data: { token: 'abc', headerName: 'X-CSRF-TOKEN' } };
const VISITA_URL = '/estudos/30/participacoes/120/visitas/7';

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

describe('servicoAcompanhamentoApi', () => {
  it('listarParticipacoes: GET /estudos/{id}/participacoes, sem token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /estudos/30/participacoes': { status: 200, data: [PARTICIPACAO] } });

    expect(await servicoAcompanhamentoApi.listarParticipacoes(30)).toEqual([PARTICIPACAO]);
    expect(chamadas[0].headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('obterHistorico: GET /estudos/{id}/participacoes/{participacaoId}/historico', async () => {
    simularBackend({ 'GET /estudos/30/participacoes/120/historico': { status: 200, data: HISTORICO } });

    expect(await servicoAcompanhamentoApi.obterHistorico(30, 120)).toEqual(HISTORICO);
  });

  it('obterHistorico: repassa o 404 de participação fora do vínculo', async () => {
    simularBackend({
      'GET /estudos/30/participacoes/9/historico': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
    });

    const erro = await servicoAcompanhamentoApi.obterHistorico(30, 9).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('obterVisita e listarResultados: GET da visita e dos resultados dela', async () => {
    simularBackend({
      [`GET ${VISITA_URL}`]: { status: 200, data: VISITA },
      [`GET ${VISITA_URL}/resultados`]: { status: 200, data: [RESULTADO] },
    });

    expect(await servicoAcompanhamentoApi.obterVisita(30, 120, 7)).toEqual(VISITA);
    expect(await servicoAcompanhamentoApi.listarResultados(30, 120, 7)).toEqual([RESULTADO]);
  });

  it('registrarResultado: POST com a atividade e o texto, levando o token CSRF', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${VISITA_URL}/resultados`]: { status: 201, data: RESULTADO },
    });

    const entrada = { atividadePrevistaId: 5, texto: 'Pressão 12 por 8 (fictício).' };
    expect(await servicoAcompanhamentoApi.registrarResultado(30, 120, 7, entrada)).toEqual(RESULTADO);

    const post = chamadas.find((c) => c.method === 'post');
    expect(JSON.parse(post?.data as string)).toEqual(entrada);
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('editarResultado: PUT só com o texto, levando o token CSRF', async () => {
    const editado = { ...RESULTADO, texto: 'Novo texto.', atualizadoPorId: 12, atualizadoEm: '2026-11-13T10:00:00Z' };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`PUT ${VISITA_URL}/resultados/40`]: { status: 200, data: editado },
    });

    expect(await servicoAcompanhamentoApi.editarResultado(30, 120, 7, 40, 'Novo texto.')).toEqual(editado);

    const put = chamadas.find((c) => c.method === 'put');
    expect(JSON.parse(put?.data as string)).toEqual({ texto: 'Novo texto.' });
    expect(put?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('registrarResultado: repassa o 409 de resultado já registrado', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${VISITA_URL}/resultados`]: {
        status: 409,
        data: { codigo: 'RESULTADO_JA_REGISTRADO', mensagem: 'Já existe resultado para esta atividade.' },
      },
    });

    await expect(
      servicoAcompanhamentoApi.registrarResultado(30, 120, 7, { atividadePrevistaId: 5, texto: 'Ok.' }),
    ).rejects.toMatchObject({ status: 409, codigo: 'RESULTADO_JA_REGISTRADO' });
  });

  // <-------------------AGENDAMENTO (PR #41)------------------->
  it('agendarVisita: POST .../visitas com a visita prevista e a data, levando o token CSRF', async () => {
    const agendada = { ...VISITA, id: 8, situacao: 'AGENDADA', registradoPorId: null, registradoEm: null };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/30/participacoes/120/visitas': { status: 201, data: agendada },
    });

    const entrada = { visitaPrevistaId: 2, dataHora: '2026-11-20T12:30:00Z' };
    expect(await servicoAcompanhamentoApi.agendarVisita(30, 120, entrada)).toEqual(agendada);

    const post = chamadas.find((c) => c.method === 'post');
    expect(JSON.parse(post?.data as string)).toEqual(entrada);
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('agendarVisita: repassa o 409 VISITA_JA_AGENDADA e o 400 DATA_VISITA_INVALIDA', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/30/participacoes/120/visitas': {
        status: 409,
        data: { codigo: 'VISITA_JA_AGENDADA', mensagem: 'Já existe um agendamento pendente para essa visita.' },
      },
      'POST /estudos/30/participacoes/121/visitas': {
        status: 400,
        data: { codigo: 'DATA_VISITA_INVALIDA', mensagem: 'A data da visita está fora do período permitido.' },
      },
    });
    const entrada = { visitaPrevistaId: 2, dataHora: '2026-11-20T12:30:00Z' };

    await expect(servicoAcompanhamentoApi.agendarVisita(30, 120, entrada)).rejects.toMatchObject({
      status: 409,
      codigo: 'VISITA_JA_AGENDADA',
    });
    await expect(servicoAcompanhamentoApi.agendarVisita(30, 121, entrada)).rejects.toMatchObject({
      status: 400,
      codigo: 'DATA_VISITA_INVALIDA',
    });
  });

  it('reagendarVisita: PUT .../visitas/{id} só com a nova data, levando o token CSRF', async () => {
    const reagendada = { ...VISITA, situacao: 'AGENDADA', dataHora: '2026-12-01T13:00:00Z' };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`PUT ${VISITA_URL}`]: { status: 200, data: reagendada },
    });

    expect(await servicoAcompanhamentoApi.reagendarVisita(30, 120, 7, { dataHora: '2026-12-01T13:00:00Z' })).toEqual(
      reagendada,
    );

    const put = chamadas.find((c) => c.method === 'put');
    expect(JSON.parse(put?.data as string)).toEqual({ dataHora: '2026-12-01T13:00:00Z' });
    expect(put?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('listarVisitas: monta as visitas a partir do histórico, sem a retirada', async () => {
    const historico: HistoricoParticipacao = {
      participacaoId: 120,
      itens: [
        {
          tipo: 'VISITA',
          visitaAgendadaId: 7,
          nomeVisita: 'Visita inicial',
          dataHora: '2026-11-12T12:00:00Z',
          situacao: 'AGENDADA',
          motivo: null,
          registradoPorId: null,
          registradoEm: null,
          resultados: [],
          correcoes: [],
        },
        {
          tipo: 'VISITA',
          visitaAgendadaId: 8,
          nomeVisita: 'Visita de acompanhamento',
          dataHora: '2026-11-05T12:00:00Z',
          situacao: 'REALIZADA',
          motivo: null,
          registradoPorId: 12,
          registradoEm: '2026-11-05T13:00:00Z',
          resultados: [{ atividadePrevistaId: 5, descricaoAtividade: 'Medir a pressão.', texto: 'Ok.' }],
          correcoes: [],
        },
        {
          tipo: 'VISITA',
          visitaAgendadaId: 9,
          nomeVisita: 'Visita final',
          dataHora: '2026-11-20T12:00:00Z',
          situacao: 'CANCELADA',
          motivo: 'Unidade fechada.',
          registradoPorId: 12,
          registradoEm: '2026-11-10T13:00:00Z',
          resultados: [],
          correcoes: [],
        },
        ...HISTORICO.itens,
      ],
    };
    simularBackend({ 'GET /estudos/30/participacoes/120/historico': { status: 200, data: historico } });

    expect(await servicoAcompanhamentoApi.listarVisitas(30, 120)).toEqual([
      {
        id: 7,
        nomeVisita: 'Visita inicial',
        dataHora: '2026-11-12T12:00:00Z',
        situacao: 'AGENDADA',
        motivo: null,
        possuiResultados: false,
      },
      {
        id: 8,
        nomeVisita: 'Visita de acompanhamento',
        dataHora: '2026-11-05T12:00:00Z',
        situacao: 'REALIZADA',
        motivo: null,
        possuiResultados: true,
      },
      {
        id: 9,
        nomeVisita: 'Visita final',
        dataHora: '2026-11-20T12:00:00Z',
        situacao: 'CANCELADA',
        motivo: 'Unidade fechada.',
        possuiResultados: false,
      },
    ]);
  });
});

describe('servicoAcompanhamentoApi: registro da situação da visita (RF13)', () => {
  it('registrarSituacao: PATCH .../situacao com a situação e o motivo, levando o token CSRF', async () => {
    const cancelada: VisitaAgendada = {
      ...VISITA,
      situacao: 'CANCELADA',
      motivo: 'Unidade de atendimento indisponível',
      registradoEm: '2026-11-16T15:00:00Z',
    };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`PATCH ${VISITA_URL}/situacao`]: { status: 200, data: cancelada },
    });

    const entrada = { situacao: 'CANCELADA' as const, motivo: 'Unidade de atendimento indisponível' };
    expect(await servicoAcompanhamentoApi.registrarSituacao(30, 120, 7, entrada)).toEqual(cancelada);

    const patch = chamadas.find((c) => c.method === 'patch');
    expect(JSON.parse(patch?.data as string)).toEqual(entrada);
    expect(patch?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('registrarSituacao: repassa a recusa de realização antes do dia da visita', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`PATCH ${VISITA_URL}/situacao`]: {
        status: 400,
        data: { codigo: 'TRANSICAO_VISITA_INVALIDA', mensagem: 'A visita ainda não pode ser registrada.' },
      },
    });

    await expect(
      servicoAcompanhamentoApi.registrarSituacao(30, 120, 7, { situacao: 'REALIZADA' }),
    ).rejects.toMatchObject({
      status: 400,
      codigo: 'TRANSICAO_VISITA_INVALIDA',
      message: 'A visita ainda não pode ser registrada.',
    });
  });

  it('corrigirSituacao: POST .../correcoes com situação, justificativa e motivo, devolvendo a correção', async () => {
    const correcao = {
      id: 901,
      visitaAgendadaId: 7,
      situacaoAnterior: 'CANCELADA',
      situacaoNova: 'REALIZADA',
      justificativa: 'A visita ocorreu, mas havia sido registrada como cancelada',
      corrigidaPorId: 12,
      corrigidaEm: '2026-11-16T15:00:00Z',
    };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${VISITA_URL}/correcoes`]: { status: 201, data: correcao },
    });

    const entrada = {
      situacao: 'REALIZADA' as const,
      justificativa: 'A visita ocorreu, mas havia sido registrada como cancelada',
      motivo: null,
    };
    expect(await servicoAcompanhamentoApi.corrigirSituacao(30, 120, 7, entrada)).toEqual(correcao);

    const post = chamadas.find((c) => c.method === 'post');
    expect(JSON.parse(post?.data as string)).toEqual(entrada);
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('corrigirSituacao: repassa CORRECAO_BLOQUEADA de visita com resultados', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${VISITA_URL}/correcoes`]: {
        status: 400,
        data: { codigo: 'CORRECAO_BLOQUEADA', mensagem: 'A visita possui resultados registrados.' },
      },
    });

    await expect(
      servicoAcompanhamentoApi.corrigirSituacao(30, 120, 7, { situacao: 'AUSENTE', justificativa: 'Erro.' }),
    ).rejects.toMatchObject({ status: 400, codigo: 'CORRECAO_BLOQUEADA' });
  });
});

describe('servicoAcompanhamentoApi: retirada', () => {
  it('retirarParticipante: POST .../retirada com o motivo, levando o token CSRF', async () => {
    const resposta = {
      participacaoId: 120,
      situacao: 'RETIRADA',
      dataRetirada: '2026-11-16T16:00:00Z',
      motivoRetirada: 'Participante solicitou a retirada do estudo',
      retiradaPorId: 12,
    };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/30/participacoes/120/retirada': { status: 200, data: resposta },
    });

    const entrada = { motivo: 'Participante solicitou a retirada do estudo' };
    expect(await servicoAcompanhamentoApi.retirarParticipante(30, 120, entrada)).toEqual(resposta);

    const post = chamadas.find((c) => c.method === 'post');
    expect(JSON.parse(post?.data as string)).toEqual(entrada);
    expect(post?.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('retirarParticipante: repassa o erro de participação já retirada', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      'POST /estudos/30/participacoes/120/retirada': {
        status: 400,
        data: { codigo: 'PARTICIPACAO_JA_RETIRADA', mensagem: 'A participação já foi retirada.' },
      },
    });

    await expect(servicoAcompanhamentoApi.retirarParticipante(30, 120, { motivo: 'Ok.' })).rejects.toMatchObject({
      status: 400,
      codigo: 'PARTICIPACAO_JA_RETIRADA',
      message: 'A participação já foi retirada.',
    });
  });
});
