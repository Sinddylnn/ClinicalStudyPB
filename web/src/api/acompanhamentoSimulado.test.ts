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

// <-------------------AGENDAMENTO E REAGENDAMENTO (RF12)------------------->
// Hoje é 14/11/2026 às 12:00 em Recife. Cada erro é conferido sozinho: os dados de cada caso só
// quebram a regra testada, sem depender da ordem exata das conferências
describe('servicoAcompanhamentoSimulado: agendamento de visitas', () => {
  const AGORA = '2026-11-14T15:00:00Z';

  // Estados e períodos que cada caso precisa; a lista é a mesma referência para mudar o estado no teste
  function criarEstudosAgendamento(): { servico: ServicoEstudos; estudos: Estudo[] } {
    const estudos = [
      { id: 3, estado: 'RECRUTAMENTO', dataInicio: '2026-10-20', dataFim: '2026-12-20' },
      { id: 4, estado: 'ENCERRADO', dataInicio: '2026-09-01', dataFim: '2026-12-31' },
      { id: 5, estado: 'EXECUCAO', dataInicio: '2026-09-01', dataFim: '2026-12-31' },
      { id: 6, estado: 'PLANEJAMENTO', dataInicio: '2026-11-20', dataFim: '2027-03-31' },
      { id: 7, estado: 'RECRUTAMENTO', dataInicio: '2026-12-01', dataFim: '2027-04-30' },
    ] as Estudo[];
    return {
      estudos,
      servico: { listar: vi.fn(() => Promise.resolve(estudos)), cadastrar: vi.fn(), alterarEstado: vi.fn() },
    };
  }

  // Mesmo protocolo para todos os estudos: visitas previstas 3, 4 e 5
  const PROTOCOLO_AGENDAMENTO = {
    visitas: [
      { id: 3, nome: 'Visita inicial', ordem: 1, atividades: [] },
      { id: 4, nome: 'Visita de acompanhamento', ordem: 2, atividades: [] },
      { id: 5, nome: 'Visita final', ordem: 3, atividades: [] },
    ],
  } as unknown as Protocolo;
  const protocoloAgendamento = {
    obter: vi.fn().mockResolvedValue(PROTOCOLO_AGENDAMENTO),
  } as unknown as ServicoProtocolo;

  const ativa = (id: number, estudoId: number, nome: string): ParticipacaoSimulada => ({
    id,
    estudoId,
    participanteId: 100 + id,
    participanteNome: nome,
    dataInclusao: '2026-10-25T12:00:00Z',
    situacao: 'ATIVA',
    visitas: [],
  });

  // Retirada no estudo 3: a visita que estava agendada foi cancelada pela retirada
  const RETIRADA: ParticipacaoSimulada = {
    ...ativa(12, 3, 'Joana Retirada'),
    situacao: 'RETIRADA',
    dataRetirada: '2026-11-10T12:00:00Z',
    visitas: [
      {
        id: 30,
        visitaPrevistaId: 4,
        nomeVisita: 'Visita de acompanhamento',
        dataHora: '2026-11-25T12:00:00Z',
        situacao: 'CANCELADA',
        motivo: 'Retirada do participante',
        registradoPorId: 3,
        registradoEm: '2026-11-10T12:00:00Z',
        resultados: [],
        correcoes: [],
      },
    ],
  };

  const PARTICIPACOES = [
    ...PARTICIPACOES_INICIAIS,
    ativa(10, 6, 'Ana Planejamento'),
    ativa(11, 4, 'Bruno Encerrado'),
    RETIRADA,
    ativa(13, 5, 'Carla Execução'),
    ativa(14, 7, 'Davi Futuro'),
  ];

  function criarAgendamento() {
    const { servico, estudos } = criarEstudosAgendamento();
    return {
      estudos,
      servico: criarServicoAcompanhamentoSimulado(servico, PARTICIPACOES, protocoloAgendamento),
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(AGORA));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agenda a visita prevista com a situação AGENDADA e ela aparece nas visitas e no histórico', async () => {
    const { servico } = criarAgendamento();

    const visita = await executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 4, dataHora: '2026-11-20T12:30:00Z' }));

    expect(visita).toEqual({
      id: 31,
      participacaoId: 1,
      visitaPrevistaId: 4,
      nomeVisita: 'Visita de acompanhamento',
      dataHora: '2026-11-20T12:30:00Z',
      situacao: 'AGENDADA',
      motivo: null,
      registradoPorId: null,
      registradoEm: null,
    });
    expect(await executar(servico.listarVisitas(3, 1))).toContainEqual({
      id: 31,
      nomeVisita: 'Visita de acompanhamento',
      dataHora: '2026-11-20T12:30:00Z',
      situacao: 'AGENDADA',
    });
    const historico = await executar(servico.obterHistorico(3, 1));
    expect(historico.itens).toContainEqual(expect.objectContaining({ tipo: 'VISITA', visitaAgendadaId: 31 }));
  });

  it('lista as visitas da participação em qualquer situação e responde 404 fora do vínculo', async () => {
    const { servico } = criarAgendamento();

    const visitas = await executar(servico.listarVisitas(3, 1));
    expect(visitas.map((v) => v.situacao)).toEqual(['REALIZADA', 'AUSENTE', 'REALIZADA', 'AGENDADA']);
    await expect(executar(servico.listarVisitas(3, 13))).rejects.toMatchObject({ status: 404 });
  });

  it('aceita hoje com hora já passada, o último dia às 22h de Recife e estudo em Execução', async () => {
    const { servico } = criarAgendamento();

    // 07:00 de hoje em Recife, antes do momento atual: a comparação é por dia
    await expect(
      executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 4, dataHora: '2026-11-14T10:00:00Z' })),
    ).resolves.toMatchObject({ situacao: 'AGENDADA' });
    // 20/12 às 22:00 em Recife já é 21/12 em UTC
    await expect(
      executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 3, dataHora: '2026-12-21T01:00:00Z' })),
    ).resolves.toMatchObject({ situacao: 'AGENDADA' });
    await expect(
      executar(servico.agendarVisita(5, 13, { visitaPrevistaId: 3, dataHora: '2026-11-18T12:00:00Z' })),
    ).resolves.toMatchObject({ participacaoId: 13 });
  });

  it('permite agendar de novo uma visita prevista já realizada', async () => {
    const { servico } = criarAgendamento();

    // A visita inicial (prevista 3) da Maria está realizada
    await expect(
      executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 3, dataHora: '2026-11-30T12:00:00Z' })),
    ).resolves.toMatchObject({ visitaPrevistaId: 3, situacao: 'AGENDADA' });
  });

  it('recusa campos ausentes ou inválidos com VALIDACAO_INVALIDA e o erro no campo', async () => {
    const { servico } = criarAgendamento();
    const agendar = (entrada: object) =>
      executar(servico.agendarVisita(3, 1, entrada as { visitaPrevistaId: number; dataHora: string }));

    await expect(agendar({ dataHora: '2026-11-20T12:00:00Z' })).rejects.toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { visitaPrevistaId: 'Informe a visita prevista.' },
    });
    await expect(agendar({ visitaPrevistaId: 0, dataHora: '2026-11-20T12:00:00Z' })).rejects.toMatchObject({
      errosCampos: { visitaPrevistaId: 'A visita prevista deve ser válida.' },
    });
    await expect(agendar({ visitaPrevistaId: 4, dataHora: '' })).rejects.toMatchObject({
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { dataHora: 'Informe a data e hora da visita.' },
    });
  });

  it('responde 404 para estudo fora da sessão, participação de outro estudo e visita prevista fora do protocolo', async () => {
    const { servico } = criarAgendamento();
    const valida = '2026-11-20T12:00:00Z';

    await expect(
      executar(servico.agendarVisita(99, 1, { visitaPrevistaId: 4, dataHora: valida })),
    ).rejects.toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
    // A participação 13 é do estudo 5
    await expect(
      executar(servico.agendarVisita(3, 13, { visitaPrevistaId: 4, dataHora: valida })),
    ).rejects.toMatchObject({ status: 404, message: 'Participação não encontrada.' });
    await expect(
      executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 99, dataHora: valida })),
    ).rejects.toMatchObject({ status: 404, message: 'Visita prevista não encontrada.' });
  });

  it('recusa estudo em Planejamento ou Encerrado com ESTADO_ESTUDO_INVALIDO', async () => {
    const { servico } = criarAgendamento();

    await expect(
      executar(servico.agendarVisita(6, 10, { visitaPrevistaId: 3, dataHora: '2026-11-25T12:00:00Z' })),
    ).rejects.toMatchObject({ status: 400, codigo: 'ESTADO_ESTUDO_INVALIDO' });
    await expect(
      executar(servico.agendarVisita(4, 11, { visitaPrevistaId: 3, dataHora: '2026-11-25T12:00:00Z' })),
    ).rejects.toMatchObject({ codigo: 'ESTADO_ESTUDO_INVALIDO', message: 'O estudo não permite agendamento de visitas.' });
  });

  it('recusa participante retirado com PARTICIPACAO_INVALIDA', async () => {
    const { servico } = criarAgendamento();

    await expect(
      executar(servico.agendarVisita(3, 12, { visitaPrevistaId: 3, dataHora: '2026-11-25T12:00:00Z' })),
    ).rejects.toMatchObject({
      status: 400,
      codigo: 'PARTICIPACAO_INVALIDA',
      message: 'Não é possível agendar visita para participante retirado.',
    });
  });

  it('recusa com DATA_VISITA_INVALIDA o dia anterior a hoje, antes do início e depois do fim do estudo', async () => {
    const { servico } = criarAgendamento();
    const agendar = (estudoId: number, participacaoId: number, dataHora: string) =>
      executar(servico.agendarVisita(estudoId, participacaoId, { visitaPrevistaId: 4, dataHora }));

    await expect(agendar(3, 1, '2026-11-13T15:00:00Z')).rejects.toMatchObject({
      status: 400,
      codigo: 'DATA_VISITA_INVALIDA',
      message: 'A data da visita está fora do período permitido.',
    });
    // O estudo 7 só começa em 01/12
    await expect(agendar(7, 14, '2026-11-20T12:00:00Z')).rejects.toMatchObject({ codigo: 'DATA_VISITA_INVALIDA' });
    // 21/12 às 09:00 em Recife, um dia depois do fim do estudo 3
    await expect(agendar(3, 1, '2026-12-21T12:00:00Z')).rejects.toMatchObject({ codigo: 'DATA_VISITA_INVALIDA' });
  });

  it('recusa com 409 uma segunda visita AGENDADA para a mesma visita prevista', async () => {
    const { servico } = criarAgendamento();

    // A visita final (prevista 5) da Maria já está agendada
    await expect(
      executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 5, dataHora: '2026-11-25T12:00:00Z' })),
    ).rejects.toMatchObject({
      status: 409,
      codigo: 'VISITA_JA_AGENDADA',
      message: 'Já existe um agendamento pendente para essa visita.',
    });
  });

  it('reagenda a visita AGENDADA mantendo o ID e a visita prevista, sem 409', async () => {
    const { servico } = criarAgendamento();

    const visita = await executar(servico.reagendarVisita(3, 1, 3, { dataHora: '2026-12-15T13:00:00Z' }));

    expect(visita).toMatchObject({ id: 3, visitaPrevistaId: 5, situacao: 'AGENDADA', dataHora: '2026-12-15T13:00:00Z' });
    expect((await executar(servico.listarVisitas(3, 1))).find((v) => v.id === 3)?.dataHora).toBe('2026-12-15T13:00:00Z');
  });

  it('recusa reagendar visita que não está AGENDADA com TRANSICAO_VISITA_INVALIDA', async () => {
    const { servico } = criarAgendamento();

    await expect(
      executar(servico.reagendarVisita(3, 1, 1, { dataHora: '2026-12-15T13:00:00Z' })),
    ).rejects.toMatchObject({
      status: 400,
      codigo: 'TRANSICAO_VISITA_INVALIDA',
      message: 'Apenas visitas agendadas podem ser reagendadas.',
    });
  });

  it('recusa reagendar sem data, com data inválida, fora do vínculo, de retirado ou com o estudo encerrado', async () => {
    const { servico, estudos } = criarAgendamento();

    await expect(executar(servico.reagendarVisita(3, 1, 3, { dataHora: '' }))).rejects.toMatchObject({
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { dataHora: 'Informe a nova data e hora.' },
    });
    await expect(
      executar(servico.reagendarVisita(3, 1, 3, { dataHora: '2026-11-13T12:00:00Z' })),
    ).rejects.toMatchObject({ codigo: 'DATA_VISITA_INVALIDA' });
    // A visita 30 é da participação 12
    await expect(
      executar(servico.reagendarVisita(3, 1, 30, { dataHora: '2026-12-15T13:00:00Z' })),
    ).rejects.toMatchObject({ status: 404, message: 'Visita não encontrada.' });
    await expect(
      executar(servico.reagendarVisita(3, 12, 30, { dataHora: '2026-12-15T13:00:00Z' })),
    ).rejects.toMatchObject({ codigo: 'PARTICIPACAO_INVALIDA' });

    estudos[0].estado = 'ENCERRADO';
    await expect(
      executar(servico.reagendarVisita(3, 1, 3, { dataHora: '2026-12-15T13:00:00Z' })),
    ).rejects.toMatchObject({ codigo: 'ESTADO_ESTUDO_INVALIDO', message: 'O estudo não permite reagendamento de visitas.' });
  });
});

describe('servicoAcompanhamentoSimulado: retirada', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retira com o motivo aparado, cancela só as visitas agendadas e registra no histórico', async () => {
    const servico = criar();

    const retirada = await executar(servico.retirarParticipante(3, 1, { motivo: '  Mudou de cidade.  ' }));

    expect(retirada).toMatchObject({ participacaoId: 1, situacao: 'RETIRADA', motivoRetirada: 'Mudou de cidade.', retiradaPorId: 3 });
    expect(retirada.dataRetirada).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    const [participacao] = await executar(servico.listarParticipacoes(3));
    expect(participacao).toMatchObject({ situacao: 'RETIRADA', dataRetirada: retirada.dataRetirada });

    const { itens } = await executar(servico.obterHistorico(3, 1));
    expect(itens.map((i) => (i.tipo === 'VISITA' ? i.situacao : i.tipo))).toEqual([
      'REALIZADA',
      'AUSENTE',
      'REALIZADA',
      'CANCELADA',
      'RETIRADA',
    ]);
    expect(itens[3]).toMatchObject({ motivo: 'Retirada do participante', registradoPorId: 3 });
    expect(itens[4]).toMatchObject({ motivo: 'Mudou de cidade.', retiradaPorNome: 'Carlos Coordenador' });
  });

  it('confere o motivo antes de tudo: vazio ou acima de 500 caracteres', async () => {
    const servico = criar();

    await expect(executar(servico.retirarParticipante(9, 1, { motivo: '  ' }))).rejects.toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { motivo: 'Informe o motivo da retirada.' },
    });
    await expect(executar(servico.retirarParticipante(3, 1, { motivo: 'a'.repeat(501) }))).rejects.toMatchObject({
      errosCampos: { motivo: 'O motivo pode ter até 500 caracteres.' },
    });
  });

  it('recusa estudo encerrado, participação fora do estudo e retirada repetida', async () => {
    const servico = criar();

    await expect(executar(servico.retirarParticipante(4, 2, { motivo: 'Ok.' }))).rejects.toMatchObject({
      codigo: 'ESTADO_ESTUDO_INVALIDO',
    });
    await expect(executar(servico.retirarParticipante(3, 2, { motivo: 'Ok.' }))).rejects.toMatchObject({ status: 404 });

    await executar(servico.retirarParticipante(3, 1, { motivo: 'Ok.' }));
    await expect(executar(servico.retirarParticipante(3, 1, { motivo: 'De novo.' }))).rejects.toMatchObject({
      codigo: 'PARTICIPACAO_INVALIDA',
      message: 'O participante já foi retirado do estudo.',
    });
  });

  it('depois da retirada, não aceita resultados nem agendamentos', async () => {
    const servico = criar();
    await executar(servico.retirarParticipante(3, 1, { motivo: 'Ok.' }));

    await expect(
      executar(servico.registrarResultado(3, 1, 4, { atividadePrevistaId: 4, texto: 'Ok.' })),
    ).rejects.toMatchObject({ codigo: 'PARTICIPACAO_INVALIDA' });
    await expect(executar(servico.editarResultado(3, 1, 1, 1, 'Ok.'))).rejects.toMatchObject({
      codigo: 'PARTICIPACAO_INVALIDA',
    });
    await expect(
      executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 5, dataHora: '2026-12-15T13:00:00Z' })),
    ).rejects.toMatchObject({ codigo: 'PARTICIPACAO_INVALIDA' });
  });
});
