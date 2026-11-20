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
      'AGENDADA',
    ]);
    historico.itens.length = 0;
    expect((await executar(servico.obterHistorico(3, 1))).itens).toHaveLength(5);

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

    // A visita inicial (prevista 3) já foi realizada: pode ser agendada de novo
    const visita = await executar(servico.agendarVisita(3, 1, { visitaPrevistaId: 3, dataHora: '2026-11-20T12:30:00Z' }));

    expect(visita).toEqual({
      id: 31,
      participacaoId: 1,
      visitaPrevistaId: 3,
      nomeVisita: 'Visita inicial',
      dataHora: '2026-11-20T12:30:00Z',
      situacao: 'AGENDADA',
      motivo: null,
      registradoPorId: null,
      registradoEm: null,
    });
    expect(await executar(servico.listarVisitas(3, 1))).toContainEqual({
      id: 31,
      nomeVisita: 'Visita inicial',
      dataHora: '2026-11-20T12:30:00Z',
      situacao: 'AGENDADA',
      motivo: null,
      possuiResultados: false,
    });
    const historico = await executar(servico.obterHistorico(3, 1));
    expect(historico.itens).toContainEqual(expect.objectContaining({ tipo: 'VISITA', visitaAgendadaId: 31 }));
  });

  it('lista as visitas da participação em qualquer situação e responde 404 fora do vínculo', async () => {
    const { servico } = criarAgendamento();

    const visitas = await executar(servico.listarVisitas(3, 1));
    expect(visitas.map((v) => v.situacao)).toEqual(['REALIZADA', 'AUSENTE', 'REALIZADA', 'AGENDADA', 'AGENDADA']);
    // A visita inicial tem resultado e a ausência guarda o motivo
    expect(visitas[0].possuiResultados).toBe(true);
    expect(visitas[1]).toMatchObject({ motivo: 'Participante não compareceu.', possuiResultados: false });
    await expect(executar(servico.listarVisitas(3, 13))).rejects.toMatchObject({ status: 404 });
  });

  it('aceita hoje com hora já passada, o último dia às 22h de Recife e estudo em Execução', async () => {
    const { servico } = criarAgendamento();

    // 07:00 de hoje em Recife, antes do momento atual: a comparação é por dia
    await expect(
      executar(servico.agendarVisita(5, 13, { visitaPrevistaId: 4, dataHora: '2026-11-14T10:00:00Z' })),
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
      'CANCELADA',
      'RETIRADA',
    ]);
    expect(itens[3]).toMatchObject({ motivo: 'Retirada do participante', registradoPorId: 3 });
    expect(itens[4]).toMatchObject({ motivo: 'Retirada do participante', registradoPorId: 3 });
    expect(itens[5]).toMatchObject({ motivo: 'Mudou de cidade.', retiradaPorNome: 'Carlos Coordenador' });
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
      codigo: 'PARTICIPACAO_JA_RETIRADA',
      message: 'A participação já foi retirada.',
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

// <-------------------REGISTRO E CORREÇÃO DA SITUAÇÃO DAS VISITAS (RF13)------------------->
// Hoje é 17/11/2026 (12:00 em Recife). Na participação 1 (dados iniciais): visita 1 realizada com
// resultado, 2 ausente com motivo, 4 realizada sem resultado, 5 agendada em 16/11 e 3 agendada em 10/12.
// Cada caso quebra uma regra só, sem depender da ordem em que o serviço confere as regras
describe('servicoAcompanhamentoSimulado: situação das visitas (RF13)', () => {
  const AGORA = '2026-11-17T15:00:00Z';

  function criarEstudosRegistro(): { servico: ServicoEstudos; estudos: Estudo[] } {
    const estudos = [
      { id: 3, estado: 'RECRUTAMENTO', dataInicio: '2026-10-20', dataFim: '2026-12-20' },
      { id: 4, estado: 'EXECUCAO', dataInicio: '2026-09-01', dataFim: '2026-12-31' },
    ] as Estudo[];
    return {
      estudos,
      servico: { listar: vi.fn(() => Promise.resolve(estudos)), cadastrar: vi.fn(), alterarEstado: vi.fn() },
    };
  }

  // Participação retirada no estudo 3. A visita 41, ainda agendada, só existe para isolar a regra da
  // retirada (na prática, a retirada cancela as agendadas); a 40 foi cancelada em data passada
  const RETIRADA_REGISTRO: ParticipacaoSimulada = {
    id: 12,
    estudoId: 3,
    participanteId: 112,
    participanteNome: 'Joana Retirada',
    dataInclusao: '2026-10-25T12:00:00Z',
    situacao: 'RETIRADA',
    dataRetirada: '2026-11-10T12:00:00Z',
    visitas: [
      {
        id: 40,
        visitaPrevistaId: 3,
        nomeVisita: 'Visita inicial',
        dataHora: '2026-11-05T12:00:00Z',
        situacao: 'CANCELADA',
        motivo: 'Retirada do participante',
        registradoPorId: 3,
        registradoEm: '2026-11-10T12:00:00Z',
        resultados: [],
        correcoes: [],
      },
      {
        id: 41,
        visitaPrevistaId: 4,
        nomeVisita: 'Visita de acompanhamento',
        dataHora: '2026-11-06T12:00:00Z',
        situacao: 'AGENDADA',
        motivo: null,
        registradoPorId: null,
        registradoEm: null,
        resultados: [],
        correcoes: [],
      },
    ],
  };

  // Participação no estudo 4, com uma visita agendada em data passada
  const OUTRO_ESTUDO: ParticipacaoSimulada = {
    id: 13,
    estudoId: 4,
    participanteId: 113,
    participanteNome: 'Carla Execução',
    dataInclusao: '2026-10-25T12:00:00Z',
    situacao: 'ATIVA',
    visitas: [
      {
        id: 50,
        visitaPrevistaId: 3,
        nomeVisita: 'Visita inicial',
        dataHora: '2026-11-10T12:00:00Z',
        situacao: 'AGENDADA',
        motivo: null,
        registradoPorId: null,
        registradoEm: null,
        resultados: [],
        correcoes: [],
      },
    ],
  };

  function criarRegistro() {
    const { servico, estudos } = criarEstudosRegistro();
    return {
      estudos,
      servico: criarServicoAcompanhamentoSimulado(
        servico,
        [...PARTICIPACOES_INICIAIS, RETIRADA_REGISTRO, OUTRO_ESTUDO],
        protocolo,
      ),
    };
  }

  const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  const visitaDoHistorico = async (servico: ReturnType<typeof criarRegistro>['servico'], id: number) => {
    const { itens } = await executar(servico.obterHistorico(3, 1));
    return itens.find((i) => i.tipo === 'VISITA' && i.visitaAgendadaId === id);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(AGORA));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // <-------------------REGISTRO------------------->
  it('registra a realização da visita agendada e a mudança aparece nas visitas e no histórico', async () => {
    const { servico } = criarRegistro();

    const visita = await executar(servico.registrarSituacao(3, 1, 5, { situacao: 'REALIZADA' }));

    expect(visita).toMatchObject({
      id: 5,
      participacaoId: 1,
      visitaPrevistaId: 4,
      situacao: 'REALIZADA',
      motivo: null,
      registradoPorId: 3,
    });
    expect(visita.registradoEm).toMatch(INSTANT);
    expect((await executar(servico.listarVisitas(3, 1))).find((v) => v.id === 5)?.situacao).toBe('REALIZADA');
    expect(await visitaDoHistorico(servico, 5)).toMatchObject({
      situacao: 'REALIZADA',
      registradoPorNome: 'Carlos Coordenador',
      registradoEm: visita.registradoEm,
    });
  });

  it('registra a ausência com o motivo aparado ou sem motivo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 5, { situacao: 'AUSENTE', motivo: '  Não compareceu.  ' })),
    ).resolves.toMatchObject({ situacao: 'AUSENTE', motivo: 'Não compareceu.' });
    await expect(executar(servico.registrarSituacao(4, 13, 50, { situacao: 'AUSENTE', motivo: '   ' }))).resolves.toMatchObject(
      { situacao: 'AUSENTE', motivo: null },
    );
  });

  it('cancela a qualquer momento, inclusive antes do dia da visita, com motivo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 3, { situacao: 'CANCELADA', motivo: 'Unidade fechada.' })),
    ).resolves.toMatchObject({ id: 3, situacao: 'CANCELADA', motivo: 'Unidade fechada.' });
  });

  it('exige o motivo do cancelamento', async () => {
    const { servico } = criarRegistro();

    for (const motivo of [undefined, null, '   ']) {
      await expect(
        executar(servico.registrarSituacao(3, 1, 5, { situacao: 'CANCELADA', motivo })),
      ).rejects.toMatchObject({ status: 400, codigo: 'VALIDACAO_INVALIDA', message: 'Informe o motivo do cancelamento.' });
    }
  });

  it('proíbe o motivo na realização', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 5, { situacao: 'REALIZADA', motivo: 'Veio.' })),
    ).rejects.toMatchObject({ codigo: 'VALIDACAO_INVALIDA', message: 'Uma visita realizada não deve ter motivo.' });
  });

  it('limita o motivo a 500 caracteres, com o erro no campo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 5, { situacao: 'AUSENTE', motivo: 'a'.repeat(501) })),
    ).rejects.toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { motivo: 'O motivo deve ter no máximo 500 caracteres.' },
    });
    await expect(
      executar(servico.registrarSituacao(3, 1, 5, { situacao: 'AUSENTE', motivo: 'a'.repeat(500) })),
    ).resolves.toMatchObject({ situacao: 'AUSENTE' });
  });

  it('exige a situação, com o erro no campo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 5, {} as Parameters<typeof servico.registrarSituacao>[3])),
    ).rejects.toMatchObject({ codigo: 'VALIDACAO_INVALIDA', errosCampos: { situacao: 'Informe a situação da visita.' } });
  });

  it('não aceita AGENDADA como situação registrada', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 5, { situacao: 'AGENDADA' } as unknown as Parameters<typeof servico.registrarSituacao>[3])),
    ).rejects.toMatchObject({ codigo: 'TRANSICAO_VISITA_INVALIDA', message: 'Informe uma situação final válida.' });
  });

  it('só registra visita AGENDADA: a situação final muda apenas por correção', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.registrarSituacao(3, 1, 2, { situacao: 'REALIZADA' })),
    ).rejects.toMatchObject({
      status: 400,
      codigo: 'TRANSICAO_VISITA_INVALIDA',
      message: 'Apenas visitas agendadas podem ser registradas.',
    });
  });

  it('recusa realização e ausência antes do dia da visita', async () => {
    const { servico } = criarRegistro();

    for (const situacao of ['REALIZADA', 'AUSENTE'] as const) {
      await expect(executar(servico.registrarSituacao(3, 1, 3, { situacao }))).rejects.toMatchObject({
        codigo: 'TRANSICAO_VISITA_INVALIDA',
        message: 'A visita ainda não pode ser registrada.',
      });
    }
  });

  it('compara o dia no fuso de Recife: vale a partir da meia-noite do dia da visita', async () => {
    // A visita 5 é em 16/11 às 09:00 em Recife
    vi.setSystemTime(new Date('2026-11-16T02:59:00Z')); // 15/11 às 23:59 em Recife
    const { servico } = criarRegistro();
    await expect(executar(servico.registrarSituacao(3, 1, 5, { situacao: 'REALIZADA' }))).rejects.toMatchObject({
      codigo: 'TRANSICAO_VISITA_INVALIDA',
    });

    vi.setSystemTime(new Date('2026-11-16T03:00:00Z')); // 16/11 à 00:00 em Recife
    await expect(executar(servico.registrarSituacao(3, 1, 5, { situacao: 'REALIZADA' }))).resolves.toMatchObject({
      situacao: 'REALIZADA',
    });
  });

  it('recusa o estudo fora de Recrutamento ou Execução', async () => {
    const { servico, estudos } = criarRegistro();

    for (const estado of ['ENCERRADO', 'PLANEJAMENTO'] as const) {
      estudos[0].estado = estado;
      await expect(executar(servico.registrarSituacao(3, 1, 5, { situacao: 'REALIZADA' }))).rejects.toMatchObject({
        codigo: 'ESTADO_ESTUDO_INVALIDO',
        message: 'O estudo não permite registrar visitas.',
      });
    }
  });

  it('aceita o estudo em Execução', async () => {
    const { servico } = criarRegistro();
    await expect(executar(servico.registrarSituacao(4, 13, 50, { situacao: 'REALIZADA' }))).resolves.toMatchObject({
      situacao: 'REALIZADA',
    });
  });

  it('recusa a visita de participante retirado', async () => {
    const { servico } = criarRegistro();

    await expect(executar(servico.registrarSituacao(3, 12, 41, { situacao: 'REALIZADA' }))).rejects.toMatchObject({
      codigo: 'PARTICIPACAO_INVALIDA',
      message: 'Não é possível registrar visita de participante retirado.',
    });
  });

  it('responde 404 para estudo fora da sessão, participação de outro estudo e visita de outra participação', async () => {
    const { servico } = criarRegistro();

    await expect(executar(servico.registrarSituacao(99, 1, 5, { situacao: 'REALIZADA' }))).rejects.toMatchObject({
      status: 404,
      codigo: 'RECURSO_NAO_ENCONTRADO',
    });
    await expect(executar(servico.registrarSituacao(3, 13, 50, { situacao: 'REALIZADA' }))).rejects.toMatchObject({
      status: 404,
      message: 'Participação não encontrada.',
    });
    await expect(executar(servico.registrarSituacao(3, 1, 50, { situacao: 'REALIZADA' }))).rejects.toMatchObject({
      status: 404,
      message: 'Visita não encontrada.',
    });
  });

  // <-------------------CORREÇÃO------------------->
  it('corrige a ausência para cancelada, devolve a correção e guarda o motivo anterior no histórico', async () => {
    const { servico } = criarRegistro();

    const correcao = await executar(
      servico.corrigirSituacao(3, 1, 2, {
        situacao: 'CANCELADA',
        justificativa: '  A visita foi cancelada antes.  ',
        motivo: ' Pedido do participante. ',
      }),
    );

    expect(correcao).toEqual({
      id: 1,
      visitaAgendadaId: 2,
      situacaoAnterior: 'AUSENTE',
      situacaoNova: 'CANCELADA',
      justificativa: 'A visita foi cancelada antes.',
      corrigidaPorId: 3,
      corrigidaEm: expect.stringMatching(INSTANT),
    });
    expect(await visitaDoHistorico(servico, 2)).toMatchObject({
      situacao: 'CANCELADA',
      motivo: 'Pedido do participante.',
      registradoPorId: 3,
      registradoEm: correcao.corrigidaEm,
      correcoes: [
        {
          id: 1,
          situacaoAnterior: 'AUSENTE',
          situacaoNova: 'CANCELADA',
          justificativa: 'A visita foi cancelada antes.',
          corrigidaPorId: 3,
          corrigidaPorNome: 'Carlos Coordenador',
          corrigidaEm: correcao.corrigidaEm,
          motivoAnterior: 'Participante não compareceu.',
          motivoNovo: 'Pedido do participante.',
        },
      ],
    });
  });

  it('ao corrigir cancelada para realizada, apaga o motivo da visita e o guarda na nova correção', async () => {
    const { servico } = criarRegistro();
    await executar(servico.corrigirSituacao(3, 1, 2, { situacao: 'CANCELADA', justificativa: 'Erro.', motivo: 'Chuva.' }));

    const segunda = await executar(
      servico.corrigirSituacao(3, 1, 2, { situacao: 'REALIZADA', justificativa: 'A visita ocorreu.', motivo: null }),
    );

    expect(segunda).toMatchObject({ id: 2, situacaoAnterior: 'CANCELADA', situacaoNova: 'REALIZADA' });
    const visita = await visitaDoHistorico(servico, 2);
    expect(visita).toMatchObject({ situacao: 'REALIZADA', motivo: null });
    expect(visita?.tipo === 'VISITA' && visita.correcoes[1]).toMatchObject({ motivoAnterior: 'Chuva.', motivoNovo: null });
  });

  it('corrige para ausente com ou sem motivo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa: 'Não veio.' })),
    ).resolves.toMatchObject({ situacaoAnterior: 'REALIZADA', situacaoNova: 'AUSENTE' });
    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'CANCELADA', justificativa: 'Foi cancelada.', motivo: 'Chuva.' })),
    ).resolves.toMatchObject({ situacaoAnterior: 'AUSENTE' });
    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa: 'Não veio.', motivo: 'Doente.' })),
    ).resolves.toMatchObject({ situacaoNova: 'AUSENTE' });
    expect(await visitaDoHistorico(servico, 4)).toMatchObject({ motivo: 'Doente.' });
  });

  it('exige a justificativa de 1 a 500 caracteres, com o erro no campo', async () => {
    const { servico } = criarRegistro();

    for (const justificativa of ['', '   ']) {
      await expect(
        executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa })),
      ).rejects.toMatchObject({
        codigo: 'VALIDACAO_INVALIDA',
        errosCampos: { justificativa: 'Informe a justificativa da correção.' },
      });
    }
    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa: 'a'.repeat(501) })),
    ).rejects.toMatchObject({ errosCampos: { justificativa: 'A justificativa deve ter no máximo 500 caracteres.' } });
    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa: ` ${'a'.repeat(500)} ` })),
    ).resolves.toMatchObject({ justificativa: 'a'.repeat(500) });
  });

  it('exige a nova situação, com o erro no campo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(
        servico.corrigirSituacao(3, 1, 4, { justificativa: 'Erro.' } as Parameters<typeof servico.corrigirSituacao>[3]),
      ),
    ).rejects.toMatchObject({ codigo: 'VALIDACAO_INVALIDA', errosCampos: { situacao: 'Informe a nova situação.' } });
  });

  it('segue a regra do motivo para a nova situação', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'CANCELADA', justificativa: 'Erro.', motivo: '  ' })),
    ).rejects.toMatchObject({ codigo: 'VALIDACAO_INVALIDA', message: 'Informe o motivo do cancelamento.' });
    await expect(
      executar(servico.corrigirSituacao(3, 1, 2, { situacao: 'REALIZADA', justificativa: 'Erro.', motivo: 'Veio.' })),
    ).rejects.toMatchObject({ codigo: 'VALIDACAO_INVALIDA', message: 'Uma visita realizada não deve ter motivo.' });
    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa: 'Erro.', motivo: 'a'.repeat(501) })),
    ).rejects.toMatchObject({ errosCampos: { motivo: 'O motivo deve ter no máximo 500 caracteres.' } });
  });

  it('nunca volta para AGENDADA, não repete a situação atual e não corrige visita ainda agendada', async () => {
    const { servico } = criarRegistro();
    const transicao = { codigo: 'TRANSICAO_VISITA_INVALIDA', message: 'A correção deve alterar uma situação final para outra.' };

    await expect(
      executar(
        servico.corrigirSituacao(3, 1, 4, {
          situacao: 'AGENDADA',
          justificativa: 'Erro.',
        } as unknown as Parameters<typeof servico.corrigirSituacao>[3]),
      ),
    ).rejects.toMatchObject(transicao);
    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'REALIZADA', justificativa: 'Erro.' })),
    ).rejects.toMatchObject(transicao);
    await expect(
      executar(servico.corrigirSituacao(3, 1, 5, { situacao: 'CANCELADA', justificativa: 'Erro.', motivo: 'Chuva.' })),
    ).rejects.toMatchObject(transicao);
  });

  it('só corrige para realizada ou ausente a partir do dia da visita', async () => {
    const { servico } = criarRegistro();
    await executar(servico.registrarSituacao(3, 1, 3, { situacao: 'CANCELADA', motivo: 'Chuva.' }));

    for (const situacao of ['REALIZADA', 'AUSENTE'] as const) {
      await expect(
        executar(servico.corrigirSituacao(3, 1, 3, { situacao, justificativa: 'Erro.' })),
      ).rejects.toMatchObject({ codigo: 'TRANSICAO_VISITA_INVALIDA', message: 'A visita ainda não pode ser registrada.' });
    }
  });

  it('bloqueia a correção da visita com resultados registrados', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.corrigirSituacao(3, 1, 1, { situacao: 'AUSENTE', justificativa: 'Erro.' })),
    ).rejects.toMatchObject({
      status: 400,
      codigo: 'CORRECAO_BLOQUEADA',
      message: 'A visita possui resultados registrados.',
    });
    expect(await visitaDoHistorico(servico, 1)).toMatchObject({ situacao: 'REALIZADA', correcoes: [] });
  });

  it('bloqueia a correção com o estudo encerrado', async () => {
    const { servico, estudos } = criarRegistro();
    estudos[0].estado = 'ENCERRADO';

    await expect(
      executar(servico.corrigirSituacao(3, 1, 4, { situacao: 'AUSENTE', justificativa: 'Erro.' })),
    ).rejects.toMatchObject({ codigo: 'ESTADO_ESTUDO_INVALIDO', message: 'O estudo não permite corrigir visitas.' });
  });

  it('bloqueia a correção de participante retirado', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.corrigirSituacao(3, 12, 40, { situacao: 'REALIZADA', justificativa: 'Erro.' })),
    ).rejects.toMatchObject({
      codigo: 'PARTICIPACAO_INVALIDA',
      message: 'Não é possível corrigir visita de participante retirado.',
    });
  });

  it('responde 404 na correção fora do vínculo', async () => {
    const { servico } = criarRegistro();

    await expect(
      executar(servico.corrigirSituacao(99, 1, 4, { situacao: 'AUSENTE', justificativa: 'Erro.' })),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      executar(servico.corrigirSituacao(3, 1, 50, { situacao: 'AUSENTE', justificativa: 'Erro.' })),
    ).rejects.toMatchObject({ status: 404, message: 'Visita não encontrada.' });
  });
});
