import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PARTICIPACOES_INICIAIS,
  criarServicoAcompanhamentoSimulado,
  type ParticipacaoSimulada,
} from './acompanhamentoSimulado';
import { ErroRequisicao } from './erros';
import type { Estudo, ServicoEstudos } from './estudos';
import type { Protocolo, ServicoProtocolo } from './protocolo';

// <-------------------TESTES DO SERVIÇO SIMULADO------------------->
async function executar<T>(promessa: Promise<T>): Promise<T> {
  const resultado = promessa.then(
    (valor) => ({ valor }),
    (erro: unknown) => ({ erro }),
  );
  await vi.runAllTimersAsync();
  const final = await resultado;
  if ('erro' in final) throw final.erro;
  return final.valor;
}

// O estudo 3 está em Recrutamento e o 4, encerrado; os dois estão na lista da sessão
function criarEstudos(): ServicoEstudos {
  return {
    listar: vi.fn().mockResolvedValue([
      { id: 3, estado: 'RECRUTAMENTO' },
      { id: 4, estado: 'ENCERRADO' },
    ] as Estudo[]),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
}

// Visitas previstas 3, 4 e 5, cada uma com uma atividade de mesmo ID; a 4 ganha uma segunda atividade
const PROTOCOLO = {
  visitas: [
    { id: 3, atividades: [{ id: 3, descricao: 'Registrar hábitos.' }] },
    {
      id: 4,
      atividades: [
        { id: 4, descricao: 'Conferir os registros.' },
        { id: 6, descricao: 'Medir a pressão (fictício).' },
      ],
    },
    { id: 5, atividades: [{ id: 5, descricao: 'Questionário final.' }] },
  ],
} as unknown as Protocolo;

const protocolo = { obter: vi.fn().mockResolvedValue(PROTOCOLO) } as unknown as ServicoProtocolo;

// Participação no estudo encerrado, com uma visita realizada
const ENCERRADA: ParticipacaoSimulada = {
  id: 2,
  estudoId: 4,
  participanteId: 20,
  participanteNome: 'Bruno Participante',
  dataInclusao: '2026-11-01T12:00:00Z',
  situacao: 'RETIRADA',
  dataRetirada: '2026-11-05T12:00:00Z',
  visitas: [
    {
      id: 9,
      visitaPrevistaId: 3,
      nomeVisita: 'Visita inicial',
      dataHora: '2026-11-02T12:00:00Z',
      situacao: 'REALIZADA',
      motivo: null,
      registradoPorId: 3,
      registradoEm: '2026-11-02T13:00:00Z',
      resultados: [],
      correcoes: [],
    },
  ],
  retirada: { tipo: 'RETIRADA', dataRetirada: '2026-11-05T12:00:00Z', motivo: 'Mudou de cidade.', retiradaPorId: 3 },
};

const criar = () => criarServicoAcompanhamentoSimulado(criarEstudos(), [...PARTICIPACOES_INICIAIS, ENCERRADA], protocolo);

describe('servicoAcompanhamentoSimulado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista só as participações do estudo, sem visitas nem retirada', async () => {
    expect(await executar(criar().listarParticipacoes(4))).toEqual([
      {
        id: 2,
        participanteId: 20,
        participanteNome: 'Bruno Participante',
        dataInclusao: '2026-11-01T12:00:00Z',
        situacao: 'RETIRADA',
        dataRetirada: '2026-11-05T12:00:00Z',
      },
    ]);
  });

  it('monta o histórico com as visitas e a retirada, sem deixar a tela alterar os dados guardados', async () => {
    const servico = criar();

    const historico = await executar(servico.obterHistorico(3, 1));
    expect(historico.itens.map((i) => (i.tipo === 'VISITA' ? i.situacao : i.tipo))).toEqual([
      'REALIZADA',
      'AUSENTE',
      'REALIZADA',
      'AGENDADA',
    ]);
    historico.itens.length = 0;
    expect((await executar(servico.obterHistorico(3, 1))).itens).toHaveLength(4);

    const retirado = await executar(servico.obterHistorico(4, 2));
    expect(retirado.itens.at(-1)).toMatchObject({ tipo: 'RETIRADA', motivo: 'Mudou de cidade.' });
  });

  it('responde 404 para estudo fora da sessão, participação de outro estudo e visita de outra participação', async () => {
    const servico = criar();

    await expect(executar(servico.listarParticipacoes(9))).rejects.toMatchObject({
      status: 404,
      codigo: 'RECURSO_NAO_ENCONTRADO',
    });
    await expect(executar(servico.obterHistorico(3, 2))).rejects.toMatchObject({ status: 404 });
    await expect(executar(servico.obterVisita(3, 1, 9))).rejects.toMatchObject({ status: 404 });
  });

  it('devolve a visita com a visita prevista e os resultados com os IDs', async () => {
    const servico = criar();

    expect(await executar(servico.obterVisita(3, 1, 1))).toMatchObject({
      id: 1,
      participacaoId: 1,
      visitaPrevistaId: 3,
      situacao: 'REALIZADA',
    });
    const [resultado] = await executar(servico.listarResultados(3, 1, 1));
    expect(resultado).toMatchObject({ id: 1, atividadePrevistaId: 3, visitaAgendadaId: 1 });
  });

  it('registra o resultado aparado, com a descrição da atividade, e aparece no histórico', async () => {
    const servico = criar();

    const novo = await executar(
      servico.registrarResultado(3, 1, 4, { atividadePrevistaId: 6, texto: '  Pressão 12 por 8 (fictício).  ' }),
    );

    expect(novo).toMatchObject({
      id: 2,
      visitaAgendadaId: 4,
      atividadePrevistaId: 6,
      descricaoAtividade: 'Medir a pressão (fictício).',
      texto: 'Pressão 12 por 8 (fictício).',
      atualizadoEm: null,
    });
    expect(novo.registradoEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    const historico = await executar(servico.obterHistorico(3, 1));
    const visita = historico.itens.find((i) => i.tipo === 'VISITA' && i.visitaAgendadaId === 4);
    expect(visita).toMatchObject({ resultados: [{ atividadePrevistaId: 6, texto: 'Pressão 12 por 8 (fictício).' }] });
  });

  it('edita o resultado e guarda quando foi editado', async () => {
    const servico = criar();

    const editado = await executar(servico.editarResultado(3, 1, 1, 1, 'Texto corrigido.'));

    expect(editado).toMatchObject({ id: 1, texto: 'Texto corrigido.', atualizadoPorId: 3 });
    expect(editado.atualizadoEm).not.toBeNull();
    await expect(executar(servico.editarResultado(3, 1, 1, 99, 'Outro.'))).rejects.toMatchObject({ status: 404 });
  });

  it('confere o texto antes de tudo: vazio ou acima de 1.000 caracteres', async () => {
    const servico = criar();

    const vazio = await executar(servico.registrarResultado(3, 1, 4, { atividadePrevistaId: 4, texto: '   ' })).catch(
      (e: unknown) => e,
    );
    expect(vazio).toBeInstanceOf(ErroRequisicao);
    expect(vazio).toMatchObject({ codigo: 'VALIDACAO_INVALIDA', errosCampos: { texto: 'Informe o resultado.' } });

    await expect(
      executar(servico.registrarResultado(3, 1, 4, { atividadePrevistaId: 4, texto: 'a'.repeat(1001) })),
    ).rejects.toMatchObject({ errosCampos: { texto: 'O resultado pode ter até 1000 caracteres.' } });
  });

  it('recusa visita não realizada, atividade de outra visita, resultado repetido e estudo encerrado', async () => {
    const servico = criar();
    const tentar = (estudoId: number, participacaoId: number, visitaId: number, atividadePrevistaId: number) =>
      executar(servico.registrarResultado(estudoId, participacaoId, visitaId, { atividadePrevistaId, texto: 'Ok.' }));

    // Visita 2 está ausente e a 3 ainda está agendada
    await expect(tentar(3, 1, 2, 4)).rejects.toMatchObject({ status: 400, codigo: 'RESULTADO_INVALIDO' });
    await expect(tentar(3, 1, 3, 5)).rejects.toMatchObject({ codigo: 'RESULTADO_INVALIDO' });
    // A atividade 5 é da visita final, não da de acompanhamento
    await expect(tentar(3, 1, 4, 5)).rejects.toMatchObject({
      codigo: 'RESULTADO_INVALIDO',
      message: 'A atividade não pertence à visita prevista desta visita.',
    });
    // A visita 1 já tem resultado para a atividade 3
    await expect(tentar(3, 1, 1, 3)).rejects.toMatchObject({ status: 409, codigo: 'RESULTADO_JA_REGISTRADO' });
    await expect(tentar(4, 2, 9, 3)).rejects.toMatchObject({ codigo: 'ESTADO_ESTUDO_INVALIDO' });
  });
});
