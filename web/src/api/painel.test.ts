import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { Participacao, ResumoVisitaAgendada, ServicoAcompanhamento } from './acompanhamento';
import type { Candidato, ServicoCandidatos } from './candidatos';
import { api } from './cliente';
import { ErroRequisicao } from './erros';
import { servicoPainelApi, type PainelEstudo } from './painel';
import { criarServicoPainelSimulado, servicoPainelSimulado } from './painelSimulado';

// <-------------------SIMULAÇÃO DO BACKEND------------------->
// Mesmo arranjo de acompanhamento.test.ts: cada teste define como o "backend" responde
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

const PAINEL: PainelEstudo = {
  estudoId: 3,
  candidatosCadastrados: 8,
  participantesIncluidos: 5,
  participantesAtivos: 4,
  participantesRetirados: 1,
  visitasRealizadas: 6,
  visitasPendentes: 2,
};

// <-------------------SERVIÇO REAL------------------->
describe('servicoPainelApi', () => {
  it('consulta GET /estudos/{estudoId}/painel e devolve as contagens', async () => {
    const chamadas = simularBackend({ 'GET /estudos/3/painel': { status: 200, data: PAINEL } });

    await expect(servicoPainelApi.consultar(3)).resolves.toEqual(PAINEL);
    expect(chamadas).toHaveLength(1);
  });

  it('repassa o 404 do estudo fora do vínculo como ErroRequisicao', async () => {
    simularBackend({
      'GET /estudos/9/painel': {
        status: 404,
        data: { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Estudo não encontrado.' },
      },
    });

    const erro = await servicoPainelApi.consultar(9).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
  });
});

// <-------------------SERVIÇO SIMULADO------------------->
const participacao = (id: number, situacao: Participacao['situacao']): Participacao => ({
  id,
  participanteId: id + 10,
  participanteNome: `Pessoa ${id}`,
  dataInclusao: '2026-11-01T12:00:00Z',
  situacao,
});

const visita = (id: number, situacao: ResumoVisitaAgendada['situacao'], dataHora = '2026-12-01T12:00:00Z') => ({
  id,
  nomeVisita: `Visita ${id}`,
  dataHora,
  situacao,
  motivo: null,
  possuiResultados: false,
});

function criarDependencias(candidatos: number, participacoes: Participacao[], visitas: Record<number, ResumoVisitaAgendada[]>) {
  const servicoCandidatos = {
    listar: vi.fn().mockResolvedValue(Array.from({ length: candidatos }, (_, i) => ({ id: i + 1 }) as Candidato)),
  } as unknown as ServicoCandidatos;
  const servicoAcompanhamento = {
    listarParticipacoes: vi.fn().mockResolvedValue(participacoes),
    listarVisitas: vi.fn((_estudoId: number, participacaoId: number) => Promise.resolve(visitas[participacaoId] ?? [])),
  } as unknown as ServicoAcompanhamento;
  return { servicoCandidatos, servicoAcompanhamento };
}

describe('criarServicoPainelSimulado', () => {
  it('conta incluídos pelo total histórico e separa ativos e retirados', async () => {
    const { servicoCandidatos, servicoAcompanhamento } = criarDependencias(
      6,
      [participacao(1, 'ATIVA'), participacao(2, 'RETIRADA'), participacao(3, 'ATIVA')],
      {},
    );

    const painel = await criarServicoPainelSimulado(servicoCandidatos, servicoAcompanhamento).consultar(3);

    expect(painel).toMatchObject({
      estudoId: 3,
      candidatosCadastrados: 6,
      participantesIncluidos: 3,
      participantesAtivos: 2,
      participantesRetirados: 1,
    });
  });

  it('conta como pendente só a visita AGENDADA, mesmo com a data passada, e ignora ausências e cancelamentos', async () => {
    const { servicoCandidatos, servicoAcompanhamento } = criarDependencias(
      2,
      [participacao(1, 'ATIVA'), participacao(2, 'RETIRADA')],
      {
        1: [visita(1, 'REALIZADA'), visita(2, 'AGENDADA', '2026-01-10T12:00:00Z'), visita(3, 'AGENDADA')],
        2: [visita(4, 'REALIZADA'), visita(5, 'AUSENTE'), visita(6, 'CANCELADA')],
      },
    );

    const painel = await criarServicoPainelSimulado(servicoCandidatos, servicoAcompanhamento).consultar(3);

    expect(painel.visitasRealizadas).toBe(2);
    expect(painel.visitasPendentes).toBe(2);
    expect(servicoAcompanhamento.listarVisitas).toHaveBeenCalledWith(3, 1);
    expect(servicoAcompanhamento.listarVisitas).toHaveBeenCalledWith(3, 2);
  });

  it('com estudo sem participantes, devolve zero nas contagens', async () => {
    const { servicoCandidatos, servicoAcompanhamento } = criarDependencias(0, [], {});

    await expect(criarServicoPainelSimulado(servicoCandidatos, servicoAcompanhamento).consultar(1)).resolves.toEqual({
      estudoId: 1,
      candidatosCadastrados: 0,
      participantesIncluidos: 0,
      participantesAtivos: 0,
      participantesRetirados: 0,
      visitasRealizadas: 0,
      visitasPendentes: 0,
    });
  });

  it('usa os dados simulados das outras telas e responde 404 para estudo inexistente', async () => {
    const painel = await servicoPainelSimulado.consultar(3);
    expect(painel.estudoId).toBe(3);
    expect(painel.participantesIncluidos).toBe(painel.participantesAtivos + painel.participantesRetirados);

    await expect(servicoPainelSimulado.consultar(999)).rejects.toMatchObject({ status: 404 });
  });
});
