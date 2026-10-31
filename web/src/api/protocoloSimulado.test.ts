import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarEstudosSimulados, servicoEstudosSimulado } from './estudosSimulado';
import type { ServicoProtocolo } from './protocolo';
import { criarServicoProtocoloSimulado, PROTOCOLOS_INICIAIS } from './protocoloSimulado';

// <-------------------TESTES DO SERVIÇO SIMULADO DO PROTOCOLO------------------->
const PLANEJAMENTO = 1;
const SEM_PROTOCOLO = 2;
const RECRUTAMENTO = 3;

// Avança o atraso simulado sem esperar de verdade
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

const falha = (promessa: Promise<unknown>) => executar(promessa).catch((e: unknown) => e);

describe('servicoProtocoloSimulado', () => {
  let servico: ServicoProtocolo;

  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
    servico = criarServicoProtocoloSimulado(servicoEstudosSimulado, PROTOCOLOS_INICIAIS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('devolve o protocolo do estudo com as pendências para o recrutamento', async () => {
    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao).toHaveLength(2);
    expect(protocolo.criteriosExclusao).toEqual([]);
    expect(protocolo.semCriteriosExclusao).toBe(false);
    expect(protocolo.pendenciasRecrutamento).toEqual(['CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA']);
  });

  it('responde com listas vazias quando o estudo ainda não tem protocolo', async () => {
    expect(await executar(servico.obter(SEM_PROTOCOLO))).toEqual({
      estudoId: SEM_PROTOCOLO,
      criteriosInclusao: [],
      criteriosExclusao: [],
      semCriteriosExclusao: false,
      // O estudo 2 também não tem coordenador atribuído
      pendenciasRecrutamento: ['COORDENADOR', 'CRITERIO_INCLUSAO', 'CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA'],
    });
  });

  it('responde 404 para estudo fora da lista da sessão', async () => {
    expect(await falha(servico.obter(99))).toMatchObject({ status: 404, codigo: 'RECURSO_NAO_ENCONTRADO' });
    expect(await falha(servico.adicionarCriterio(99, { tipo: 'INCLUSAO', descricao: 'Adultos.' }))).toMatchObject({
      status: 404,
    });
  });

  it('adiciona o critério com texto aparado e cria o protocolo no primeiro critério', async () => {
    const novo = await executar(
      servico.adicionarCriterio(SEM_PROTOCOLO, { tipo: 'INCLUSAO', descricao: '  Pessoas acima de 65 anos. ' }),
    );
    expect(novo).toEqual({ id: 5, descricao: 'Pessoas acima de 65 anos.' });

    const protocolo = await executar(servico.obter(SEM_PROTOCOLO));
    expect(protocolo.criteriosInclusao).toEqual([novo]);
    expect(protocolo.pendenciasRecrutamento).toEqual(['COORDENADOR', 'CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA']);
  });

  it('responde VALIDACAO_INVALIDA para descrição vazia ou acima de 1.000 caracteres', async () => {
    expect(await falha(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'INCLUSAO', descricao: '   ' }))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { descricao: 'Descreva o critério.' },
    });
    expect(await falha(servico.editarCriterio(PLANEJAMENTO, 1, 'a'.repeat(1001)))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { descricao: 'Use até 1.000 caracteres.' },
    });
  });

  it('aceita descrição com 1.000 caracteres, contados sem os espaços das pontas', async () => {
    const descricao = 'a'.repeat(1000);
    expect(await executar(servico.editarCriterio(PLANEJAMENTO, 1, `  ${descricao}  `))).toEqual({ id: 1, descricao });
  });

  it('edita e remove critérios de cada lista', async () => {
    expect(await executar(servico.editarCriterio(PLANEJAMENTO, 1, ' Estudantes de 18 a 25 anos. '))).toEqual({
      id: 1,
      descricao: 'Estudantes de 18 a 25 anos.',
    });
    await executar(servico.removerCriterio(PLANEJAMENTO, 2));

    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao).toEqual([{ id: 1, descricao: 'Estudantes de 18 a 25 anos.' }]);
  });

  it('responde 404 para critério de outro estudo ou inexistente', async () => {
    // O critério 4 é do estudo 3: não pode ser alterado pelo estudo 1
    expect(await falha(servico.editarCriterio(PLANEJAMENTO, 4, 'Outro texto.'))).toMatchObject({ status: 404 });
    expect(await falha(servico.removerCriterio(PLANEJAMENTO, 99))).toMatchObject({ status: 404 });
  });

  it('responde ESTUDO_FORA_DE_PLANEJAMENTO para qualquer alteração fora de Planejamento', async () => {
    const esperado = { status: 400, codigo: 'ESTUDO_FORA_DE_PLANEJAMENTO' };
    expect(await falha(servico.adicionarCriterio(RECRUTAMENTO, { tipo: 'INCLUSAO', descricao: 'Novo.' }))).toMatchObject(
      esperado,
    );
    expect(await falha(servico.editarCriterio(RECRUTAMENTO, 3, 'Outro.'))).toMatchObject(esperado);
    expect(await falha(servico.removerCriterio(RECRUTAMENTO, 3))).toMatchObject(esperado);
    expect(await falha(servico.definirSemExclusao(RECRUTAMENTO, false))).toMatchObject(esperado);

    // A consulta continua liberada
    expect((await executar(servico.obter(RECRUTAMENTO))).criteriosInclusao).toHaveLength(1);
  });

  it('marca "sem exclusão" e passa a considerar as exclusões definidas', async () => {
    const marcado = await executar(servico.definirSemExclusao(PLANEJAMENTO, true));
    expect(marcado.semCriteriosExclusao).toBe(true);
    expect(marcado.pendenciasRecrutamento).toEqual(['VISITA_PREVISTA']);
  });

  it('responde SEM_EXCLUSAO_DECLARADA ao cadastrar exclusão com a declaração marcada, sem desmarcá-la', async () => {
    await executar(servico.definirSemExclusao(PLANEJAMENTO, true));

    expect(
      await falha(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' })),
    ).toMatchObject({
      status: 400,
      codigo: 'SEM_EXCLUSAO_DECLARADA',
      message: 'Desmarque a opção de que o estudo não possui critérios de exclusão antes de cadastrar um.',
    });
    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.semCriteriosExclusao).toBe(true);
    expect(protocolo.criteriosExclusao).toEqual([]);

    // Depois de desmarcar, o cadastro é aceito e a declaração continua desmarcada
    await executar(servico.definirSemExclusao(PLANEJAMENTO, false));
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' }));
    const depois = await executar(servico.obter(PLANEJAMENTO));
    expect(depois.criteriosExclusao).toHaveLength(1);
    expect(depois.semCriteriosExclusao).toBe(false);
  });

  it('confere campos e estado do estudo antes da declaração "sem exclusão"', async () => {
    const declarado = { estudoId: RECRUTAMENTO, criteriosInclusao: [], criteriosExclusao: [], semCriteriosExclusao: true };
    const comDeclaracao = criarServicoProtocoloSimulado(servicoEstudosSimulado, [
      { ...declarado, estudoId: PLANEJAMENTO },
      declarado,
    ]);

    expect(
      await falha(comDeclaracao.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: ' ' })),
    ).toMatchObject({ codigo: 'VALIDACAO_INVALIDA' });
    expect(
      await falha(comDeclaracao.adicionarCriterio(RECRUTAMENTO, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' })),
    ).toMatchObject({ codigo: 'ESTUDO_FORA_DE_PLANEJAMENTO' });
    expect(await falha(comDeclaracao.adicionarCriterio(99, { tipo: 'EXCLUSAO', descricao: ' ' }))).toMatchObject({
      status: 404,
    });
  });

  it('deixa as exclusões pendentes ao remover a última, sem declarar ausência sozinho', async () => {
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' }));
    const [exclusao] = (await executar(servico.obter(PLANEJAMENTO))).criteriosExclusao;
    await executar(servico.removerCriterio(PLANEJAMENTO, exclusao.id));

    // Seção 3: a definição volta a ficar pendente, sem declarar ausência sozinha
    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.semCriteriosExclusao).toBe(false);
    expect(protocolo.pendenciasRecrutamento).toEqual(['CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA']);
  });

  it('mantém "sem exclusão" ao adicionar um critério de inclusão', async () => {
    await executar(servico.definirSemExclusao(PLANEJAMENTO, true));
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'INCLUSAO', descricao: 'Outro critério.' }));
    expect((await executar(servico.obter(PLANEJAMENTO))).semCriteriosExclusao).toBe(true);
  });

  it('responde EXCLUSAO_JA_DEFINIDA ao marcar "sem exclusão" com exclusões cadastradas', async () => {
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' }));
    expect(await falha(servico.definirSemExclusao(PLANEJAMENTO, true))).toMatchObject({
      status: 400,
      codigo: 'EXCLUSAO_JA_DEFINIDA',
    });
    // Desmarcar não conflita com as exclusões
    expect((await executar(servico.definirSemExclusao(PLANEJAMENTO, false))).semCriteriosExclusao).toBe(false);
  });

  it('não altera os dados iniciais recebidos', async () => {
    await executar(servico.removerCriterio(PLANEJAMENTO, 1));
    const outro = criarServicoProtocoloSimulado(servicoEstudosSimulado, PROTOCOLOS_INICIAIS);
    expect((await executar(outro.obter(PLANEJAMENTO))).criteriosInclusao).toHaveLength(2);
  });

  it('aponta o coordenador como pendência conforme o estudo recebido', async () => {
    const [modelo] = await executar(servicoEstudosSimulado.listar());
    const estudos = {
      listar: vi.fn().mockResolvedValue([{ ...modelo, id: 10, coordenadorId: null }]),
      cadastrar: vi.fn(),
    };
    const semCoordenador = criarServicoProtocoloSimulado(estudos, []);
    expect((await executar(semCoordenador.obter(10))).pendenciasRecrutamento[0]).toBe('COORDENADOR');

    estudos.listar.mockResolvedValue([{ ...modelo, id: 10, coordenadorId: 3 }]);
    expect((await executar(semCoordenador.definirSemExclusao(10, true))).pendenciasRecrutamento).toEqual([
      'CRITERIO_INCLUSAO',
      'VISITA_PREVISTA',
    ]);
  });

  it('procura o estudo na fonte de estudos recebida, sem misturar com os simulados', async () => {
    const [modelo] = await executar(servicoEstudosSimulado.listar());
    const estudosReais = {
      listar: vi.fn().mockResolvedValue([{ ...modelo, id: 10, estado: 'PLANEJAMENTO' }]),
      cadastrar: vi.fn(),
    };
    const servicoReal = criarServicoProtocoloSimulado(estudosReais, []);

    expect((await executar(servicoReal.obter(10))).criteriosInclusao).toEqual([]);
    expect(await falha(servicoReal.obter(PLANEJAMENTO))).toMatchObject({ status: 404 });
  });
});
