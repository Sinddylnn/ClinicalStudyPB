import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  servicoCandidatosApi,
  type AvaliacaoElegibilidade,
  type Candidato,
  type DadosInclusao,
  type RegistroConsentimento,
} from './candidatos';
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

const CSRF: Resposta = { status: 200, data: { token: 'abc', headerName: 'X-CSRF-TOKEN' } };

const CANDIDATO: Candidato = {
  id: 7,
  estudoId: 3,
  nome: 'Ana Souza',
  email: 'ana.souza@exemplo.com',
  elegibilidade: 'ELEGIVEL',
  consentimento: 'ACEITOU',
  dataInclusao: null,
};

const AVALIACAO: AvaliacaoElegibilidade = {
  candidato: CANDIDATO,
  situacao: 'ELEGIVEL',
  itens: [{ criterioId: 1, tipo: 'INCLUSAO', descricao: 'Estudantes de graduação.', resposta: 'ATENDIDO' }],
  avaliadoPor: 'Carla Coordenadora',
  avaliadoEm: '2026-11-03T10:00:00',
};

const CONSENTIMENTO: RegistroConsentimento = {
  candidato: CANDIDATO,
  observacao: null,
  registradoPor: 'Carla Coordenadora',
  registradoEm: '2026-11-03T10:30:00',
};

const INCLUSAO: DadosInclusao = {
  candidato: CANDIDATO,
  avaliadoEm: AVALIACAO.avaliadoEm,
  consentimentoEm: CONSENTIMENTO.registradoEm,
  incluidos: 2,
  contas: [{ id: 11, nome: 'Ana Souza', email: 'ana.souza@exemplo.com' }],
};

const BASE = '/estudos/3/candidatos';

// Só as chamadas à API de candidatos (sem a consulta do token CSRF)
const semCsrf = (chamadas: InternalAxiosRequestConfig[]) => chamadas.filter((c) => c.url !== '/auth/csrf');

const corpo = (chamada: InternalAxiosRequestConfig) =>
  chamada.data === undefined ? undefined : JSON.parse(chamada.data as string);

const falha = (promessa: Promise<unknown>) => promessa.catch((e: unknown) => e);

beforeEach(() => {
  descartarTokenCsrf();
  registrarTratadoresSessao({ naoAutenticado: undefined, acessoNegado: undefined });
});

// <-------------------ROTAS E MÉTODOS------------------->
describe('servicoCandidatosApi', () => {
  it('listar: GET .../candidatos do estudo, sem token CSRF', async () => {
    const chamadas = simularBackend({ [`GET ${BASE}`]: { status: 200, data: [CANDIDATO] } });

    expect(await servicoCandidatosApi.listar(3)).toEqual([CANDIDATO]);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].headers.get('X-CSRF-TOKEN')).toBeUndefined();
  });

  it('cadastrar: POST .../candidatos com token CSRF', async () => {
    const chamadas = simularBackend({ 'GET /auth/csrf': CSRF, [`POST ${BASE}`]: { status: 201, data: CANDIDATO } });
    const entrada = { nome: 'Ana Souza', email: 'ana.souza@exemplo.com' };

    expect(await servicoCandidatosApi.cadastrar(3, entrada)).toEqual(CANDIDATO);
    const [post] = semCsrf(chamadas);
    expect(corpo(post)).toEqual(entrada);
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('obterElegibilidade: GET .../{candidatoId}/elegibilidade', async () => {
    simularBackend({ [`GET ${BASE}/7/elegibilidade`]: { status: 200, data: AVALIACAO } });

    expect(await servicoCandidatosApi.obterElegibilidade(3, 7)).toEqual(AVALIACAO);
  });

  it('avaliarElegibilidade: PUT .../elegibilidade com as respostas, inclusive as vazias', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`PUT ${BASE}/7/elegibilidade`]: { status: 200, data: AVALIACAO },
    });
    const entrada = {
      respostas: [
        { criterioId: 1, resposta: 'ATENDIDO' as const },
        { criterioId: 2, resposta: null },
      ],
    };

    expect(await servicoCandidatosApi.avaliarElegibilidade(3, 7, entrada)).toEqual(AVALIACAO);
    const [put] = semCsrf(chamadas);
    expect(put.method).toBe('put');
    expect(corpo(put)).toEqual(entrada);
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('obterConsentimento: GET .../{candidatoId}/consentimento', async () => {
    simularBackend({ [`GET ${BASE}/7/consentimento`]: { status: 200, data: CONSENTIMENTO } });

    expect(await servicoCandidatosApi.obterConsentimento(3, 7)).toEqual(CONSENTIMENTO);
  });

  it('registrarConsentimento: PUT .../consentimento com a resposta e a observação', async () => {
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`PUT ${BASE}/7/consentimento`]: { status: 200, data: CONSENTIMENTO },
    });
    const entrada = { resposta: 'ACEITOU' as const, observacao: null };

    expect(await servicoCandidatosApi.registrarConsentimento(3, 7, entrada)).toEqual(CONSENTIMENTO);
    const [put] = semCsrf(chamadas);
    expect(put.method).toBe('put');
    expect(corpo(put)).toEqual(entrada);
    expect(put.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });

  it('obterInclusao: GET .../{candidatoId}/inclusao', async () => {
    simularBackend({ [`GET ${BASE}/7/inclusao`]: { status: 200, data: INCLUSAO } });

    expect(await servicoCandidatosApi.obterInclusao(3, 7)).toEqual(INCLUSAO);
  });

  it('incluir: POST .../inclusao com a conta escolhida e devolve o candidato incluído', async () => {
    const incluido = { ...CANDIDATO, dataInclusao: '2026-11-03' };
    const chamadas = simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${BASE}/7/inclusao`]: { status: 201, data: incluido },
    });

    expect(await servicoCandidatosApi.incluir(3, 7, { contaId: 11 })).toEqual(incluido);
    const [post] = semCsrf(chamadas);
    expect(corpo(post)).toEqual({ contaId: 11 });
    expect(post.headers.get('X-CSRF-TOKEN')).toBe('abc');
  });
});

// <-------------------ERROS REPASSADOS ÀS TELAS------------------->
// As telas decidem o que mostrar pelo status e pelo código: o serviço não pode perdê-los
describe('servicoCandidatosApi: recusas do backend', () => {
  it('repassa o 409 de e-mail repetido com o erro no campo', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${BASE}`]: {
        status: 409,
        data: {
          codigo: 'EMAIL_JA_CADASTRADO',
          mensagem: 'Já existe um candidato com este e-mail no estudo.',
          errosCampos: { email: 'Já existe um candidato com este e-mail no estudo.' },
        },
      },
    });

    const erro = await falha(servicoCandidatosApi.cadastrar(3, { nome: 'Ana', email: 'ana.souza@exemplo.com' }));

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({
      status: 409,
      codigo: 'EMAIL_JA_CADASTRADO',
      errosCampos: { email: 'Já existe um candidato com este e-mail no estudo.' },
    });
  });

  it('repassa a regra de negócio do estudo fora de Recrutamento', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`PUT ${BASE}/7/consentimento`]: {
        status: 400,
        data: { codigo: 'ESTADO_INVALIDO', mensagem: 'O estudo não está em recrutamento.' },
      },
    });

    const erro = await falha(servicoCandidatosApi.registrarConsentimento(3, 7, { resposta: 'ACEITOU', observacao: null }));

    expect(erro).toMatchObject({ status: 400, codigo: 'ESTADO_INVALIDO', message: 'O estudo não está em recrutamento.' });
  });

  it('repassa a correção recusada depois da inclusão', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`PUT ${BASE}/7/elegibilidade`]: {
        status: 400,
        data: { codigo: 'CANDIDATO_JA_INCLUIDO', mensagem: 'O candidato já foi incluído no estudo.' },
      },
    });

    const erro = await falha(servicoCandidatosApi.avaliarElegibilidade(3, 7, { respostas: [] }));

    expect(erro).toMatchObject({ status: 400, codigo: 'CANDIDATO_JA_INCLUIDO' });
  });

  it('repassa o 409 de limite atingido na disputa pela última vaga', async () => {
    simularBackend({
      'GET /auth/csrf': CSRF,
      [`POST ${BASE}/7/inclusao`]: {
        status: 409,
        data: { codigo: 'LIMITE_ATINGIDO', mensagem: 'O estudo atingiu o limite de participantes.' },
      },
    });

    const erro = await falha(servicoCandidatosApi.incluir(3, 7, { contaId: 11 }));

    expect(erro).toMatchObject({ status: 409, codigo: 'LIMITE_ATINGIDO' });
  });

  it('repassa o 404 de estudo fora do escopo do coordenador', async () => {
    simularBackend({
      [`GET /estudos/9/candidatos`]: {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'O recurso solicitado não foi encontrado.' },
      },
    });

    const erro = await falha(servicoCandidatosApi.listar(9));

    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });
});
