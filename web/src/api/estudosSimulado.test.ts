import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from './erros';
import type { Estudo, EstudoCadastroEntrada } from './estudos';
import type { Protocolo } from './protocolo';
import {
  criarServicoEstudosSimulado,
  criarServicosEstudosSimulados,
  reiniciarEstudosSimulados,
  servicoCoordenadoresSimulado,
  servicoEstudosSimulado,
  type ConsultasEstado,
} from './estudosSimulado';

// <-------------------TESTES DO SERVIÇO SIMULADO------------------->
const ENTRADA: EstudoCadastroEntrada = {
  titulo: '  Novo estudo  ',
  objetivo: ' Objetivo. ',
  dataInicio: '2026-12-01',
  dataFim: '2027-03-01',
  limiteParticipantes: 20,
};

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

describe('servicoEstudosSimulado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lista os estudos iniciais', async () => {
    const estudos = await executar(servicoEstudosSimulado.listar());
    expect(estudos.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('cadastra em planejamento, com texto aparado e no topo da lista', async () => {
    const novo = await executar(servicoEstudosSimulado.cadastrar(ENTRADA));
    expect(novo).toMatchObject({
      id: 4,
      titulo: 'Novo estudo',
      objetivo: 'Objetivo.',
      estado: 'PLANEJAMENTO',
    });
    const estudos = await executar(servicoEstudosSimulado.listar());
    expect(estudos[0].id).toBe(4);
  });

  it('responde VALIDACAO_INVALIDA com os erros por campo', async () => {
    const erro = await executar(servicoEstudosSimulado.cadastrar({ ...ENTRADA, titulo: '' })).catch(
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { titulo: 'Informe o título.' },
    });
  });

  it('responde DATA_INVALIDA quando o fim é anterior ao início', async () => {
    const erro = await executar(
      servicoEstudosSimulado.cadastrar({ ...ENTRADA, dataFim: '2026-11-30' }),
    ).catch((e: unknown) => e);
    expect(erro).toMatchObject({ status: 400, codigo: 'DATA_INVALIDA' });
  });

  it('não guarda o estudo recusado', async () => {
    await executar(servicoEstudosSimulado.cadastrar({ ...ENTRADA, titulo: '' })).catch(() => {});
    const estudos = await executar(servicoEstudosSimulado.listar());
    expect(estudos).toHaveLength(3);
  });
});

// <-------------------MUDANÇA DE ESTADO------------------->
const MODELO: Estudo = {
  id: 1,
  titulo: 'Estudo fictício',
  objetivo: 'Objetivo.',
  dataInicio: '2026-11-03',
  dataFim: '2027-02-28',
  limiteParticipantes: 10,
  estado: 'PLANEJAMENTO',
  responsavelId: 2,
  coordenadorId: 3,
  justificativaEncerramento: null,
};

// Protocolo completo: inclusão, exclusões declaradas ausentes e uma visita com atividade
const PROTOCOLO_COMPLETO: Protocolo = {
  estudoId: 1,
  criteriosInclusao: [{ id: 1, descricao: 'Adultos.' }],
  criteriosExclusao: [],
  semCriteriosExclusao: true,
  visitas: [{ id: 1, nome: 'Visita inicial', descricao: null, ordem: 1, atividades: [{ id: 1, descricao: 'Questionário.' }] }],
};

function criarConsultas(parcial: Partial<ConsultasEstado> = {}): ConsultasEstado {
  return {
    protocolo: vi.fn().mockResolvedValue(PROTOCOLO_COMPLETO),
    possuiInclusoes: vi.fn().mockResolvedValue(false),
    ...parcial,
  };
}

describe('servicoEstudosSimulado: alterarEstado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('grava o novo estado e devolve o estudo atualizado', async () => {
    const consultas = criarConsultas();
    const servico = criarServicoEstudosSimulado([MODELO], consultas);

    const atualizado = await executar(servico.alterarEstado(1, { estado: 'RECRUTAMENTO' }));

    expect(atualizado).toMatchObject({ id: 1, estado: 'RECRUTAMENTO', justificativaEncerramento: null });
    expect((await executar(servico.listar()))[0].estado).toBe('RECRUTAMENTO');
    // Para o recrutamento só importa o protocolo
    expect(consultas.protocolo).toHaveBeenCalledWith(1);
    expect(consultas.possuiInclusoes).not.toHaveBeenCalled();
  });

  it('guarda a justificativa aparada no encerramento antecipado', async () => {
    const servico = criarServicoEstudosSimulado([MODELO], criarConsultas());

    const encerrado = await executar(
      servico.alterarEstado(1, { estado: 'ENCERRADO', justificativaEncerramento: '  Cancelado.  ' }),
    );

    expect(encerrado).toMatchObject({ estado: 'ENCERRADO', justificativaEncerramento: 'Cancelado.' });
  });

  it('encerra a partir da execução sem consultar as inclusões', async () => {
    const consultas = criarConsultas({ possuiInclusoes: vi.fn().mockResolvedValue(true) });
    const servico = criarServicoEstudosSimulado([{ ...MODELO, estado: 'EXECUCAO' }], consultas);

    const encerrado = await executar(servico.alterarEstado(1, { estado: 'ENCERRADO', justificativaEncerramento: ' ' }));

    expect(encerrado).toMatchObject({ estado: 'ENCERRADO', justificativaEncerramento: null });
    expect(consultas.possuiInclusoes).not.toHaveBeenCalled();
  });

  it('recusa com o código do backend e mantém o estado anterior', async () => {
    // O coordenador vem do próprio estudo, não do protocolo
    const servico = criarServicoEstudosSimulado([{ ...MODELO, coordenadorId: null }], criarConsultas());

    const erro = await executar(servico.alterarEstado(1, { estado: 'RECRUTAMENTO' })).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 400, codigo: 'COORDENADOR_OBRIGATORIO' });
    expect((await executar(servico.listar()))[0].estado).toBe('PLANEJAMENTO');
  });

  it('identifica a primeira visita sem atividade, na ordem do protocolo', async () => {
    const visitas = [
      { id: 3, nome: 'Visita final', descricao: null, ordem: 3, atividades: [] },
      ...PROTOCOLO_COMPLETO.visitas,
      { id: 2, nome: 'Acompanhamento', descricao: null, ordem: 2, atividades: [] },
    ];
    const servico = criarServicoEstudosSimulado(
      [MODELO],
      criarConsultas({ protocolo: vi.fn().mockResolvedValue({ ...PROTOCOLO_COMPLETO, visitas }) }),
    );

    await expect(executar(servico.alterarEstado(1, { estado: 'RECRUTAMENTO' }))).rejects.toMatchObject({
      codigo: 'PROTOCOLO_INCOMPLETO',
      message: 'Cadastre pelo menos uma atividade na visita: Acompanhamento.',
    });
  });

  it('pede uma visita quando o protocolo ainda não tem nenhuma', async () => {
    const servico = criarServicoEstudosSimulado(
      [MODELO],
      criarConsultas({ protocolo: vi.fn().mockResolvedValue({ ...PROTOCOLO_COMPLETO, visitas: [] }) }),
    );

    await expect(executar(servico.alterarEstado(1, { estado: 'RECRUTAMENTO' }))).rejects.toMatchObject({
      codigo: 'PROTOCOLO_INCOMPLETO',
      message: 'Cadastre pelo menos uma visita prevista para iniciar o recrutamento.',
    });
  });

  it('conta o histórico de inclusões para iniciar a execução e para o encerramento antecipado', async () => {
    const semInclusao = criarServicoEstudosSimulado([{ ...MODELO, estado: 'RECRUTAMENTO' }], criarConsultas());
    await expect(executar(semInclusao.alterarEstado(1, { estado: 'EXECUCAO' }))).rejects.toMatchObject({
      codigo: 'ESTUDO_SEM_PARTICIPANTES',
    });

    const comInclusao = criarServicoEstudosSimulado(
      [{ ...MODELO, estado: 'RECRUTAMENTO' }],
      criarConsultas({ possuiInclusoes: vi.fn().mockResolvedValue(true) }),
    );
    await expect(
      executar(comInclusao.alterarEstado(1, { estado: 'ENCERRADO', justificativaEncerramento: 'Motivo.' })),
    ).rejects.toMatchObject({ codigo: 'ESTUDO_COM_PARTICIPANTES' });
    await expect(executar(comInclusao.alterarEstado(1, { estado: 'EXECUCAO' }))).resolves.toMatchObject({
      estado: 'EXECUCAO',
    });
  });

  it('confere os campos antes do estudo e recusa caminhos proibidos sem consultar nada', async () => {
    const consultas = criarConsultas();
    const servico = criarServicoEstudosSimulado([{ ...MODELO, estado: 'ENCERRADO' }], consultas);

    // Campo inválido vem antes do 404, como o @Valid do backend
    await expect(
      executar(servico.alterarEstado(99, { estado: 'ENCERRADO', justificativaEncerramento: 'a'.repeat(501) })),
    ).rejects.toMatchObject({ status: 400, codigo: 'VALIDACAO_INVALIDA' });
    await expect(executar(servico.alterarEstado(99, { estado: 'ENCERRADO' }))).rejects.toMatchObject({
      status: 404,
      codigo: 'RECURSO_NAO_ENCONTRADO',
    });
    // Reabrir um estudo encerrado
    await expect(executar(servico.alterarEstado(1, { estado: 'RECRUTAMENTO' }))).rejects.toMatchObject({
      status: 400,
      codigo: 'TRANSICAO_ESTADO_INVALIDA',
      message: 'Não é permitido mudar de ENCERRADO para RECRUTAMENTO.',
    });
    expect(consultas.protocolo).not.toHaveBeenCalled();
    expect(consultas.possuiInclusoes).not.toHaveBeenCalled();
  });
});

// <-------------------CONSULTAS PADRÃO------------------->
// O serviço em uso consulta os simulados de protocolo e candidatos por import dinâmico.
// Com timers reais: o import dinâmico não termina dentro do avanço dos timers falsos
describe('servicoEstudosSimulado: consultas aos outros simulados', () => {
  beforeEach(() => {
    reiniciarEstudosSimulados();
  });

  it('usa o protocolo e os candidatos simulados para decidir a mudança', async () => {
    // Estudo 2: sem coordenador
    await expect(servicoEstudosSimulado.alterarEstado(2, { estado: 'RECRUTAMENTO' })).rejects.toMatchObject({
      codigo: 'COORDENADOR_OBRIGATORIO',
    });
    // Estudo 1: falta definir as exclusões
    await expect(servicoEstudosSimulado.alterarEstado(1, { estado: 'RECRUTAMENTO' })).rejects.toMatchObject({
      codigo: 'PROTOCOLO_INCOMPLETO',
      message: 'Cadastre os critérios de exclusão ou confirme que não existem exclusões.',
    });
    // Depois de declarar a ausência de exclusões, falta a atividade da visita de acompanhamento
    const { servicoProtocolo } = await import('./protocolo');
    await servicoProtocolo.definirSemExclusao(1, true);
    await expect(servicoEstudosSimulado.alterarEstado(1, { estado: 'RECRUTAMENTO' })).rejects.toMatchObject({
      codigo: 'PROTOCOLO_INCOMPLETO',
      message: 'Cadastre pelo menos uma atividade na visita: Acompanhamento.',
    });
    // Com a atividade, o protocolo fica completo e o recrutamento abre
    await servicoProtocolo.adicionarAtividade(1, 2, 'Revisar o diário de sono.');
    await expect(servicoEstudosSimulado.alterarEstado(1, { estado: 'RECRUTAMENTO' })).resolves.toMatchObject({
      estado: 'RECRUTAMENTO',
    });
    // Estudo 3: já tem uma inclusão (Maria Souza)
    await expect(
      servicoEstudosSimulado.alterarEstado(3, { estado: 'ENCERRADO', justificativaEncerramento: 'Motivo.' }),
    ).rejects.toMatchObject({ codigo: 'ESTUDO_COM_PARTICIPANTES' });
    await expect(servicoEstudosSimulado.alterarEstado(3, { estado: 'EXECUCAO' })).resolves.toMatchObject({
      estado: 'EXECUCAO',
    });
  });
});

describe('servicoCoordenadoresSimulado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reiniciarEstudosSimulados();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const COORDENADORES = [
    { id: 6, nome: 'Bianca Coordenadora' },
    { id: 3, nome: 'Carlos Coordenador' },
  ];

  it('lista as contas ativas de coordenador', async () => {
    expect(await executar(servicoCoordenadoresSimulado.listar())).toEqual(COORDENADORES);
  });

  it('troca o coordenador e o estudo listado já vem atualizado', async () => {
    const { estudos, coordenadores } = criarServicosEstudosSimulados([MODELO], criarConsultas(), COORDENADORES);

    const atualizado = await executar(coordenadores.atribuir(1, 6));

    expect(atualizado).toMatchObject({ id: 1, coordenadorId: 6 });
    expect((await executar(estudos.listar()))[0].coordenadorId).toBe(6);
  });

  it('atribui também em recrutamento, mas não em estudo encerrado', async () => {
    const { coordenadores } = criarServicosEstudosSimulados(
      [
        { ...MODELO, id: 1, estado: 'RECRUTAMENTO' },
        { ...MODELO, id: 2, estado: 'ENCERRADO' },
      ],
      criarConsultas(),
      COORDENADORES,
    );

    expect(await executar(coordenadores.atribuir(1, 6))).toMatchObject({ coordenadorId: 6 });
    await expect(executar(coordenadores.atribuir(2, 6))).rejects.toMatchObject({
      status: 400,
      codigo: 'ESTUDO_ENCERRADO',
    });
  });

  it('confere na ordem do backend: campo, estudo, conta e por último o encerramento', async () => {
    const { estudos, coordenadores } = criarServicosEstudosSimulados(
      [{ ...MODELO, estado: 'ENCERRADO' }],
      criarConsultas(),
      COORDENADORES,
    );

    await expect(executar(coordenadores.atribuir(1, 0))).rejects.toMatchObject({
      codigo: 'VALIDACAO_INVALIDA',
      errosCampos: { coordenadorId: expect.any(String) },
    });
    await expect(executar(coordenadores.atribuir(9, 4))).rejects.toMatchObject({
      status: 404,
      codigo: 'RECURSO_NAO_ENCONTRADO',
    });
    // Conta de outro perfil em estudo encerrado: a conta é conferida antes do estado
    const erro = await executar(coordenadores.atribuir(1, 4)).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroRequisicao);
    expect(erro).toMatchObject({ status: 400, codigo: 'COORDENADOR_INVALIDO' });
    expect((await executar(estudos.listar()))[0].coordenadorId).toBe(MODELO.coordenadorId);
  });
});
