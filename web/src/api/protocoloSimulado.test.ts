import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reiniciarEstudosSimulados, servicoEstudosSimulado } from './estudosSimulado';
import type { CriterioCadastroEntrada, ServicoProtocolo } from './protocolo';
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

const FORA_PLANEJAMENTO_CRITERIOS = {
  status: 400,
  codigo: 'ESTUDO_FORA_PLANEJAMENTO',
  message: 'Os critérios só podem ser alterados enquanto o estudo estiver em planejamento.',
};

const FORA_PLANEJAMENTO_VISITAS = {
  status: 400,
  codigo: 'ESTUDO_FORA_PLANEJAMENTO',
  message: 'As visitas previstas só podem ser alteradas enquanto o estudo estiver em planejamento.',
};

describe('servicoProtocoloSimulado: critérios', () => {
  let servico: ServicoProtocolo;

  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
    servico = criarServicoProtocoloSimulado(servicoEstudosSimulado, PROTOCOLOS_INICIAIS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('oferece edição e remoção, como o backend', () => {
    expect(servico.recursos).toEqual({ editarRemover: true });
  });

  it('devolve o protocolo do estudo com critérios e visitas', async () => {
    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao).toHaveLength(2);
    expect(protocolo.criteriosExclusao).toEqual([]);
    expect(protocolo.semCriteriosExclusao).toBe(false);
    expect(protocolo.visitas.map((v) => [v.ordem, v.nome, v.atividades.length])).toEqual([
      [1, 'Visita inicial', 2],
      [2, 'Acompanhamento', 0],
    ]);
  });

  it('responde com listas vazias quando o estudo ainda não tem protocolo', async () => {
    expect(await executar(servico.obter(SEM_PROTOCOLO))).toEqual({
      estudoId: SEM_PROTOCOLO,
      criteriosInclusao: [],
      criteriosExclusao: [],
      semCriteriosExclusao: false,
      visitas: [],
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
  });

  it('responde VALIDACAO_INVALIDA com as mensagens do backend', async () => {
    expect(await falha(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'INCLUSAO', descricao: '   ' }))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { descricao: 'Informe a descrição do critério.' },
    });
    expect(await falha(servico.editarCriterio(PLANEJAMENTO, 1, { tipo: 'INCLUSAO', descricao: 'a'.repeat(1001) }))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { descricao: 'A descrição deve ter no máximo 1000 caracteres.' },
    });
  });

  it('responde VALIDACAO_INVALIDA sem o tipo do critério, junto com os outros campos', async () => {
    const semTipo = { descricao: ' ' } as unknown as CriterioCadastroEntrada;
    expect(await falha(servico.adicionarCriterio(PLANEJAMENTO, semTipo))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { tipo: 'Informe o tipo do critério.', descricao: 'Informe a descrição do critério.' },
    });
    expect(
      await falha(servico.editarCriterio(PLANEJAMENTO, 1, { descricao: 'Adultos.' } as unknown as CriterioCadastroEntrada)),
    ).toMatchObject({ codigo: 'VALIDACAO_INVALIDA', errosCampos: { tipo: 'Informe o tipo do critério.' } });
    // Nada foi gravado
    expect((await executar(servico.obter(PLANEJAMENTO))).criteriosInclusao[0].descricao).toBe(
      'Estudantes de graduação matriculados, com idade entre 18 e 30 anos.',
    );
  });

  it('aceita descrição com 1.000 caracteres, contados sem os espaços das pontas', async () => {
    const descricao = 'a'.repeat(1000);
    expect(await executar(servico.editarCriterio(PLANEJAMENTO, 1, { tipo: 'INCLUSAO', descricao: `  ${descricao}  ` }))).toEqual({ id: 1, descricao });
  });

  it('edita e remove critérios de cada lista', async () => {
    expect(await executar(servico.editarCriterio(PLANEJAMENTO, 1, { tipo: 'INCLUSAO', descricao: ' Estudantes de 18 a 25 anos. ' }))).toEqual({
      id: 1,
      descricao: 'Estudantes de 18 a 25 anos.',
    });
    await executar(servico.removerCriterio(PLANEJAMENTO, 2));

    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao).toEqual([{ id: 1, descricao: 'Estudantes de 18 a 25 anos.' }]);
  });

  it('responde 404 para critério de outro estudo ou inexistente', async () => {
    // O critério 4 é do estudo 3: não pode ser alterado pelo estudo 1
    expect(await falha(servico.editarCriterio(PLANEJAMENTO, 4, { tipo: 'EXCLUSAO', descricao: 'Outro texto.' }))).toMatchObject({ status: 404 });
    expect(await falha(servico.removerCriterio(PLANEJAMENTO, 99))).toMatchObject({ status: 404 });
  });

  it('responde ESTUDO_FORA_PLANEJAMENTO para qualquer alteração de critério fora de Planejamento', async () => {
    expect(await falha(servico.adicionarCriterio(RECRUTAMENTO, { tipo: 'INCLUSAO', descricao: 'Novo.' }))).toMatchObject(
      FORA_PLANEJAMENTO_CRITERIOS,
    );
    expect(await falha(servico.editarCriterio(RECRUTAMENTO, 3, { tipo: 'INCLUSAO', descricao: 'Outro.' }))).toMatchObject(FORA_PLANEJAMENTO_CRITERIOS);
    expect(await falha(servico.removerCriterio(RECRUTAMENTO, 3))).toMatchObject(FORA_PLANEJAMENTO_CRITERIOS);
    expect(await falha(servico.definirSemExclusao(RECRUTAMENTO, false))).toMatchObject(FORA_PLANEJAMENTO_CRITERIOS);

    // A consulta continua liberada
    expect((await executar(servico.obter(RECRUTAMENTO))).criteriosInclusao).toHaveLength(1);
  });

  it('marca "sem exclusão" e devolve o valor gravado', async () => {
    expect(await executar(servico.definirSemExclusao(PLANEJAMENTO, true))).toBe(true);
    expect((await executar(servico.obter(PLANEJAMENTO))).semCriteriosExclusao).toBe(true);
  });

  it('responde CRITERIOS_EXCLUSAO_INCONSISTENTES ao cadastrar exclusão com a declaração marcada, sem desmarcá-la', async () => {
    await executar(servico.definirSemExclusao(PLANEJAMENTO, true));

    expect(
      await falha(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' })),
    ).toMatchObject({
      status: 400,
      codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
      message: 'Desmarque a ausência de critérios de exclusão antes de cadastrar ou editar uma exclusão.',
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

  it('confere campos, estudo e estado nesta ordem, como o backend', async () => {
    const declarado = {
      estudoId: RECRUTAMENTO,
      criteriosInclusao: [],
      criteriosExclusao: [],
      semCriteriosExclusao: true,
      visitas: [],
    };
    const comDeclaracao = criarServicoProtocoloSimulado(servicoEstudosSimulado, [
      { ...declarado, estudoId: PLANEJAMENTO },
      declarado,
    ]);

    // Campo inválido vem antes do 404, como o @Valid
    expect(await falha(comDeclaracao.adicionarCriterio(99, { tipo: 'EXCLUSAO', descricao: ' ' }))).toMatchObject({
      codigo: 'VALIDACAO_INVALIDA',
    });
    expect(
      await falha(comDeclaracao.adicionarCriterio(99, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' })),
    ).toMatchObject({ status: 404 });
    expect(
      await falha(comDeclaracao.adicionarCriterio(RECRUTAMENTO, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' })),
    ).toMatchObject({ codigo: 'ESTUDO_FORA_PLANEJAMENTO' });
    expect(
      await falha(comDeclaracao.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' })),
    ).toMatchObject({ codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES' });
  });

  it('na edição, confere campos, estudo, estado, critério e exclusão nesta ordem, como o CriterioService', async () => {
    const declarado = {
      estudoId: RECRUTAMENTO,
      criteriosInclusao: [{ id: 3, descricao: 'Adultos.' }],
      criteriosExclusao: [],
      semCriteriosExclusao: true,
      visitas: [],
    };
    const comDeclaracao = criarServicoProtocoloSimulado(servicoEstudosSimulado, [
      { ...declarado, estudoId: PLANEJAMENTO, criteriosInclusao: [{ id: 1, descricao: 'Estudantes.' }] },
      declarado,
    ]);
    const exclusao = (descricao: string) => ({ tipo: 'EXCLUSAO' as const, descricao });

    expect(await falha(comDeclaracao.editarCriterio(99, 99, exclusao(' ')))).toMatchObject({
      codigo: 'VALIDACAO_INVALIDA',
    });
    expect(await falha(comDeclaracao.editarCriterio(99, 1, exclusao('Gestantes.')))).toMatchObject({
      status: 404,
      message: 'Estudo não encontrado.',
    });
    expect(await falha(comDeclaracao.editarCriterio(RECRUTAMENTO, 99, exclusao('Gestantes.')))).toMatchObject({
      codigo: 'ESTUDO_FORA_PLANEJAMENTO',
    });
    expect(await falha(comDeclaracao.editarCriterio(PLANEJAMENTO, 99, exclusao('Gestantes.')))).toMatchObject({
      status: 404,
      message: 'Critério não encontrado.',
    });
    expect(await falha(comDeclaracao.editarCriterio(PLANEJAMENTO, 1, exclusao('Gestantes.')))).toMatchObject({
      status: 400,
      codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
      message: 'Desmarque a ausência de critérios de exclusão antes de cadastrar ou editar uma exclusão.',
    });

    // Nada mudou: o critério continua na inclusão e a declaração continua marcada
    const protocolo = await executar(comDeclaracao.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao).toEqual([{ id: 1, descricao: 'Estudantes.' }]);
    expect(protocolo.criteriosExclusao).toEqual([]);
    expect(protocolo.semCriteriosExclusao).toBe(true);

    // Editar como inclusão segue permitido com a declaração marcada
    expect(
      await executar(comDeclaracao.editarCriterio(PLANEJAMENTO, 1, { tipo: 'INCLUSAO', descricao: 'Universitários.' })),
    ).toEqual({ id: 1, descricao: 'Universitários.' });
  });

  it('grava o tipo enviado na edição: o critério passa para a outra lista, em ordem de id', async () => {
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' }));

    expect(await executar(servico.editarCriterio(PLANEJAMENTO, 1, { tipo: 'EXCLUSAO', descricao: 'Menores.' }))).toEqual({
      id: 1,
      descricao: 'Menores.',
    });

    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao.map((c) => c.id)).toEqual([2]);
    expect(protocolo.criteriosExclusao).toEqual([
      { id: 1, descricao: 'Menores.' },
      { id: 5, descricao: 'Trabalho noturno.' },
    ]);
  });

  it('deixa as exclusões pendentes ao remover a última, sem declarar ausência sozinho', async () => {
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' }));
    const [exclusao] = (await executar(servico.obter(PLANEJAMENTO))).criteriosExclusao;
    await executar(servico.removerCriterio(PLANEJAMENTO, exclusao.id));

    // Seção 3: a definição volta a ficar pendente, sem declarar ausência sozinha
    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    expect(protocolo.criteriosExclusao).toEqual([]);
    expect(protocolo.semCriteriosExclusao).toBe(false);
  });

  it('mantém "sem exclusão" ao adicionar um critério de inclusão', async () => {
    await executar(servico.definirSemExclusao(PLANEJAMENTO, true));
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'INCLUSAO', descricao: 'Outro critério.' }));
    expect((await executar(servico.obter(PLANEJAMENTO))).semCriteriosExclusao).toBe(true);
  });

  it('responde CRITERIOS_EXCLUSAO_INCONSISTENTES ao marcar "sem exclusão" com exclusões cadastradas', async () => {
    await executar(servico.adicionarCriterio(PLANEJAMENTO, { tipo: 'EXCLUSAO', descricao: 'Trabalho noturno.' }));
    expect(await falha(servico.definirSemExclusao(PLANEJAMENTO, true))).toMatchObject({
      status: 400,
      codigo: 'CRITERIOS_EXCLUSAO_INCONSISTENTES',
      message: 'O estudo possui critérios de exclusão cadastrados.',
    });
    // Desmarcar não conflita com as exclusões
    expect(await executar(servico.definirSemExclusao(PLANEJAMENTO, false))).toBe(false);
  });

  it('não altera os dados iniciais recebidos', async () => {
    await executar(servico.removerCriterio(PLANEJAMENTO, 1));
    await executar(servico.removerVisita(PLANEJAMENTO, 1));
    const outro = criarServicoProtocoloSimulado(servicoEstudosSimulado, PROTOCOLOS_INICIAIS);
    const protocolo = await executar(outro.obter(PLANEJAMENTO));
    expect(protocolo.criteriosInclusao).toHaveLength(2);
    expect(protocolo.visitas).toHaveLength(2);
  });

  it('não deixa quem recebe o protocolo alterar o que está guardado', async () => {
    const protocolo = await executar(servico.obter(PLANEJAMENTO));
    protocolo.visitas[0].atividades.push({ id: 99, descricao: 'Alterada por fora.' });
    expect((await executar(servico.obter(PLANEJAMENTO))).visitas[0].atividades).toHaveLength(2);
  });

  it('procura o estudo na fonte de estudos recebida, sem misturar com os simulados', async () => {
    const [modelo] = await executar(servicoEstudosSimulado.listar());
    const estudosReais = {
      listar: vi.fn().mockResolvedValue([{ ...modelo, id: 10, estado: 'PLANEJAMENTO' }]),
      cadastrar: vi.fn(),
      alterarEstado: vi.fn(),
    };
    const servicoReal = criarServicoProtocoloSimulado(estudosReais, []);

    expect((await executar(servicoReal.obter(10))).criteriosInclusao).toEqual([]);
    expect(await falha(servicoReal.obter(PLANEJAMENTO))).toMatchObject({ status: 404 });
  });
});

describe('servicoProtocoloSimulado: visitas e atividades', () => {
  let servico: ServicoProtocolo;

  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
    servico = criarServicoProtocoloSimulado(servicoEstudosSimulado, PROTOCOLOS_INICIAIS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const visitasDo = async (estudoId: number) => (await executar(servico.obter(estudoId))).visitas;

  it('adiciona a visita com textos aparados, descrição em branco como null e lista em ordem', async () => {
    const nova = await executar(
      servico.adicionarVisita(PLANEJAMENTO, { nome: '  Visita extra ', descricao: '   ', ordem: 5 }),
    );
    expect(nova).toEqual({ id: 6, nome: 'Visita extra', descricao: null, ordem: 5, atividades: [] });

    // Ordens com intervalo são válidas; a lista segue a ordem, não a data de cadastro
    await executar(servico.adicionarVisita(PLANEJAMENTO, { nome: 'Intermediária', descricao: 'Revisão.', ordem: 3 }));
    expect((await visitasDo(PLANEJAMENTO)).map((v) => v.ordem)).toEqual([1, 2, 3, 5]);
  });

  it('cria o protocolo na primeira visita', async () => {
    await executar(servico.adicionarVisita(SEM_PROTOCOLO, { nome: 'Visita inicial', descricao: null, ordem: 1 }));
    expect(await visitasDo(SEM_PROTOCOLO)).toHaveLength(1);
  });

  it('responde VALIDACAO_INVALIDA com as mensagens do backend, por campo', async () => {
    expect(
      await falha(servico.adicionarVisita(PLANEJAMENTO, { nome: ' ', descricao: 'a'.repeat(1001), ordem: 0 })),
    ).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: {
        nome: 'Informe o nome da visita.',
        descricao: 'A descrição deve ter no máximo 1000 caracteres.',
        ordem: 'A ordem da visita deve ser maior que zero.',
      },
    });
    expect(
      await falha(servico.adicionarVisita(PLANEJAMENTO, { nome: 'a'.repeat(151), descricao: null, ordem: 9 })),
    ).toMatchObject({ errosCampos: { nome: 'O nome deve ter no máximo 150 caracteres.' } });
    // 150 caracteres depois de aparar são aceitos
    await executar(servico.adicionarVisita(PLANEJAMENTO, { nome: ` ${'a'.repeat(150)} `, descricao: null, ordem: 9 }));
  });

  it('responde ORDEM_VISITA_DUPLICADA ao repetir a ordem, sem gravar', async () => {
    expect(
      await falha(servico.adicionarVisita(PLANEJAMENTO, { nome: 'Repetida', descricao: null, ordem: 2 })),
    ).toMatchObject({
      status: 400,
      codigo: 'ORDEM_VISITA_DUPLICADA',
      message: 'Já existe uma visita prevista com essa ordem.',
    });
    expect(await visitasDo(PLANEJAMENTO)).toHaveLength(2);
  });

  it('edita a visita mantendo a própria ordem e as atividades, e recusa a ordem de outra', async () => {
    const editada = await executar(
      servico.editarVisita(PLANEJAMENTO, 1, { nome: 'Visita de abertura', descricao: null, ordem: 1 }),
    );
    expect(editada).toMatchObject({ id: 1, nome: 'Visita de abertura', descricao: null, ordem: 1 });
    expect(editada.atividades).toHaveLength(2);

    expect(
      await falha(servico.editarVisita(PLANEJAMENTO, 1, { nome: 'Visita de abertura', descricao: null, ordem: 2 })),
    ).toMatchObject({ codigo: 'ORDEM_VISITA_DUPLICADA' });

    // Trocar para uma ordem livre reordena a lista
    await executar(servico.editarVisita(PLANEJAMENTO, 1, { nome: 'Visita de abertura', descricao: null, ordem: 4 }));
    expect((await visitasDo(PLANEJAMENTO)).map((v) => v.id)).toEqual([2, 1]);
  });

  it('remove a visita junto com as atividades', async () => {
    await executar(servico.removerVisita(PLANEJAMENTO, 1));
    const visitas = await visitasDo(PLANEJAMENTO);
    expect(visitas.map((v) => v.id)).toEqual([2]);
    expect(visitas.flatMap((v) => v.atividades)).toEqual([]);
    // As atividades não ficam acessíveis por outro caminho
    expect(await falha(servico.editarAtividade(PLANEJAMENTO, 1, 1, 'Outra.'))).toMatchObject({ status: 404 });
  });

  it('adiciona, edita e remove atividades na visita', async () => {
    const nova = await executar(servico.adicionarAtividade(PLANEJAMENTO, 2, '  Revisar o diário de sono. '));
    expect(nova).toEqual({ id: 6, descricao: 'Revisar o diário de sono.' });

    expect(await executar(servico.editarAtividade(PLANEJAMENTO, 2, 6, ' Revisar o diário. '))).toEqual({
      id: 6,
      descricao: 'Revisar o diário.',
    });
    expect((await visitasDo(PLANEJAMENTO))[1].atividades).toEqual([{ id: 6, descricao: 'Revisar o diário.' }]);

    await executar(servico.removerAtividade(PLANEJAMENTO, 1, 2));
    expect((await visitasDo(PLANEJAMENTO))[0].atividades.map((a) => a.id)).toEqual([1]);
  });

  it('responde VALIDACAO_INVALIDA para a atividade com as mensagens do backend', async () => {
    expect(await falha(servico.adicionarAtividade(PLANEJAMENTO, 2, '  '))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { descricao: 'Informe a descrição da atividade.' },
    });
    expect(await falha(servico.editarAtividade(PLANEJAMENTO, 1, 1, 'a'.repeat(1001)))).toMatchObject({
      errosCampos: { descricao: 'A descrição deve ter no máximo 1000 caracteres.' },
    });
  });

  it('responde 404 para visita de outro estudo e atividade de outra visita', async () => {
    // A visita 3 é do estudo 3
    expect(await falha(servico.adicionarAtividade(PLANEJAMENTO, 3, 'Atividade.'))).toMatchObject({
      status: 404,
      message: 'Visita prevista não encontrada.',
    });
    expect(await falha(servico.removerVisita(PLANEJAMENTO, 99))).toMatchObject({ status: 404 });
    // A atividade 1 é da visita 1, não da 2
    expect(await falha(servico.removerAtividade(PLANEJAMENTO, 2, 1))).toMatchObject({
      status: 404,
      message: 'Atividade prevista não encontrada.',
    });
    expect(await falha(servico.editarAtividade(PLANEJAMENTO, 2, 1, 'Outra.'))).toMatchObject({
      status: 404,
      message: 'Atividade prevista não encontrada.',
    });
    // A visita é conferida antes da atividade
    expect(await falha(servico.editarAtividade(PLANEJAMENTO, 99, 1, 'Outra.'))).toMatchObject({
      status: 404,
      message: 'Visita prevista não encontrada.',
    });
    expect(await falha(servico.editarVisita(PLANEJAMENTO, 3, { nome: 'Visita', descricao: null, ordem: 9 }))).toMatchObject({
      status: 404,
      message: 'Visita prevista não encontrada.',
    });
    expect(await falha(servico.adicionarVisita(99, { nome: 'Visita', descricao: null, ordem: 1 }))).toMatchObject({
      status: 404,
    });
  });

  it('responde ESTUDO_FORA_PLANEJAMENTO para qualquer alteração de visita fora de Planejamento', async () => {
    const entrada = { nome: 'Nova', descricao: null, ordem: 9 };
    expect(await falha(servico.adicionarVisita(RECRUTAMENTO, entrada))).toMatchObject(FORA_PLANEJAMENTO_VISITAS);
    expect(await falha(servico.editarVisita(RECRUTAMENTO, 3, entrada))).toMatchObject(FORA_PLANEJAMENTO_VISITAS);
    expect(await falha(servico.removerVisita(RECRUTAMENTO, 3))).toMatchObject(FORA_PLANEJAMENTO_VISITAS);
    expect(await falha(servico.adicionarAtividade(RECRUTAMENTO, 3, 'Nova.'))).toMatchObject(FORA_PLANEJAMENTO_VISITAS);
    expect(await falha(servico.editarAtividade(RECRUTAMENTO, 3, 3, 'Nova.'))).toMatchObject(FORA_PLANEJAMENTO_VISITAS);
    expect(await falha(servico.removerAtividade(RECRUTAMENTO, 3, 3))).toMatchObject(FORA_PLANEJAMENTO_VISITAS);
    // Fora de Planejamento, a ordem repetida nem chega a ser conferida
    expect(await falha(servico.adicionarVisita(RECRUTAMENTO, { ...entrada, ordem: 1 }))).toMatchObject({
      codigo: 'ESTUDO_FORA_PLANEJAMENTO',
    });
    expect(await visitasDo(RECRUTAMENTO)).toHaveLength(3);
  });

  it('confere os campos da visita antes do estudo, como o @Valid do backend', async () => {
    expect(await falha(servico.adicionarVisita(99, { nome: '', descricao: null, ordem: 1 }))).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
    });
    expect(await falha(servico.adicionarVisita(RECRUTAMENTO, { nome: '', descricao: null, ordem: 1 }))).toMatchObject({
      codigo: 'VALIDACAO_INVALIDA',
    });
  });
});
