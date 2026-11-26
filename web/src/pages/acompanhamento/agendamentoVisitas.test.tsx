import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Participacao,
  RecursosAcompanhamento,
  ResumoVisitaAgendada,
  ServicoAcompanhamento,
  VisitaAgendada,
} from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { Protocolo, ServicoProtocolo } from '../../api/protocolo';
import AgendamentoVisitas from './AgendamentoVisitas';

// <-------------------TESTES DA TELA DE AGENDAMENTO------------------->
// Hoje é 14/11/2026 às 12:00 em Recife; só o Date é simulado, os temporizadores continuam reais
const AGORA = '2026-11-14T15:00:00Z';

const COORDENADOR: UsuarioSessao = { id: 3, nome: 'Carlos Coordenador', email: 'carlos@exemplo.com', perfil: 'COORDENADOR' };

const ESTUDO: Estudo = {
  id: 3,
  titulo: 'Acompanhamento de hábitos',
  objetivo: 'Objetivo.',
  dataInicio: '2026-10-20',
  dataFim: '2026-12-20',
  limiteParticipantes: 30,
  estado: 'RECRUTAMENTO',
  responsavelId: 2,
  coordenadorId: 3,
};

const PARTICIPACAO: Participacao = {
  id: 1,
  participanteId: 14,
  participanteNome: 'Maria Souza',
  dataInclusao: '2026-10-28T13:00:00Z',
  situacao: 'ATIVA',
};

const RETIRADA: Participacao = { ...PARTICIPACAO, situacao: 'RETIRADA', dataRetirada: '2026-11-10T12:00:00Z' };

// Fora de ordem de propósito: a tela organiza as visitas previstas por ordem e as agendadas por data
const PROTOCOLO = {
  estudoId: 3,
  criteriosInclusao: [],
  criteriosExclusao: [],
  semCriteriosExclusao: false,
  visitas: [
    { id: 5, nome: 'Visita final', descricao: null, ordem: 3, atividades: [] },
    { id: 3, nome: 'Visita inicial', descricao: null, ordem: 1, atividades: [] },
    { id: 4, nome: 'Visita de acompanhamento', descricao: null, ordem: 2, atividades: [] },
  ],
} as Protocolo;

// A visita inicial já tem resultados: a correção dela fica bloqueada
const VISITAS: ResumoVisitaAgendada[] = [
  {
    id: 3,
    nomeVisita: 'Visita final',
    dataHora: '2026-12-10T12:00:00Z',
    situacao: 'AGENDADA',
    motivo: null,
    possuiResultados: false,
  },
  {
    id: 1,
    nomeVisita: 'Visita inicial',
    dataHora: '2026-10-30T12:00:00Z',
    situacao: 'REALIZADA',
    motivo: null,
    possuiResultados: true,
  },
];

const resposta = (parcial: Partial<VisitaAgendada>): VisitaAgendada => ({
  id: 9,
  participacaoId: 1,
  visitaPrevistaId: 4,
  nomeVisita: 'Visita de acompanhamento',
  dataHora: '2026-11-20T12:30:00Z',
  situacao: 'AGENDADA',
  motivo: null,
  registradoPorId: null,
  registradoEm: null,
  ...parcial,
});

const erroApi = (status: number, codigo: string, mensagem: string, errosCampos?: Record<string, string>) =>
  new ErroRequisicao(status, { codigo, mensagem, errosCampos });

type Opcoes = {
  acompanhamento?: Partial<ServicoAcompanhamento>;
  estudos?: Estudo[];
  protocolo?: Protocolo;
};

function criarServicos({ acompanhamento = {}, estudos = [ESTUDO], protocolo = PROTOCOLO }: Opcoes = {}) {
  const servicoEstudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue(estudos),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const servicoAcompanhamento: ServicoAcompanhamento = {
    listarParticipacoes: vi.fn().mockResolvedValue([PARTICIPACAO]),
    obterHistorico: vi.fn(),
    listarVisitas: vi.fn().mockResolvedValue(VISITAS),
    agendarVisita: vi.fn().mockResolvedValue(resposta({})),
    reagendarVisita: vi.fn(),
    registrarSituacao: vi.fn().mockResolvedValue(resposta({})),
    corrigirSituacao: vi.fn().mockResolvedValue({}),
    obterVisita: vi.fn(),
    listarResultados: vi.fn(),
    registrarResultado: vi.fn(),
    editarResultado: vi.fn(),
    retirarParticipante: vi.fn(),
    ...acompanhamento,
  };
  const servicoProtocolo = { obter: vi.fn().mockResolvedValue(protocolo) } as unknown as ServicoProtocolo;
  return { servicoEstudos, servicoAcompanhamento, servicoProtocolo };
}

function renderizar(
  servicos: ReturnType<typeof criarServicos>,
  recursos: RecursosAcompanhamento = { historico: true, listaPesquisador: true, retirada: true },
  usuario: UsuarioSessao = COORDENADOR,
) {
  render(
    <MemoryRouter initialEntries={['/estudos/3/participacoes/1/visitas']}>
      <Routes>
        <Route
          path="/estudos/:id/participacoes/:participacaoId/visitas"
          element={<AgendamentoVisitas {...servicos} recursos={recursos} usuario={usuario} />}
        />
        <Route path="/estudos/:id/participacoes" element={<h1>Participantes</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const campoData = () => screen.getByLabelText('Data') as HTMLInputElement;
const campoHora = () => screen.getByLabelText('Hora') as HTMLInputElement;

// O jsdom não digita em campos de data e hora: o valor é trocado direto, como o navegador faz
function preencher(data: string, hora: string) {
  fireEvent.change(campoData(), { target: { value: data } });
  fireEvent.change(campoHora(), { target: { value: hora } });
}

const listaVisitas = () => screen.getByRole('region', { name: 'Visitas agendadas' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(AGORA));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AgendamentoVisitas', () => {
  it('mostra o participante, as visitas previstas em ordem e as agendadas por data, no horário de Recife', async () => {
    const servicos = criarServicos();
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
    expect(screen.getByText('Incluído em 28/10/2026 às 10:00')).toBeInTheDocument();
    expect(screen.getByText('Ativo')).toHaveClass('etiqueta-participacao-ativa');
    expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledWith(3, 1);

    const opcoes = within(screen.getByLabelText('Visita prevista')).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione a visita', 'Visita inicial', 'Visita de acompanhamento', 'Visita final']);

    const itens = within(listaVisitas()).getAllByRole('listitem');
    expect(itens.map((i) => i.querySelector('.agendamento-visita-nome')?.textContent)).toEqual([
      'Visita inicial',
      'Visita final',
    ]);
    expect(within(itens[1]).getByText('10/12/2026 às 09:00')).toBeInTheDocument();
    expect(within(itens[1]).getByText('Agendada')).toHaveClass('etiqueta-visita-agendada');
    // Só a visita ainda agendada pode ser reagendada; a realizada com resultados não pode ser corrigida
    expect(within(itens[0]).queryByRole('button')).not.toBeInTheDocument();
    expect(within(itens[0]).getByText('Correção bloqueada: a visita já tem resultados registrados.')).toBeInTheDocument();
    expect(within(itens[1]).getByRole('button', { name: 'Reagendar Visita final' })).toBeInTheDocument();
  });

  it('limita a data entre o maior de hoje e o início do estudo, e o fim do estudo', async () => {
    renderizar(criarServicos());
    await screen.findByRole('heading', { name: 'Agendar visita' });
    expect(campoData()).toHaveAttribute('min', '2026-11-14');
    expect(campoData()).toHaveAttribute('max', '2026-12-20');
  });

  it('usa o início do estudo como mínimo quando ele ainda não chegou', async () => {
    renderizar(criarServicos({ estudos: [{ ...ESTUDO, dataInicio: '2026-12-01', dataFim: '2027-04-30' }] }));
    await screen.findByRole('heading', { name: 'Agendar visita' });
    expect(campoData()).toHaveAttribute('min', '2026-12-01');
    expect(campoData()).toHaveAttribute('max', '2027-04-30');
  });

  it('agenda a visita convertendo o horário de Recife para UTC e avisa', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicos();
    renderizar(servicos);

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita de acompanhamento');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Visita de acompanhamento agendada para 20/11/2026 às 09:30.');
    expect(servicos.servicoAcompanhamento.agendarVisita).toHaveBeenCalledWith(3, 1, {
      visitaPrevistaId: 4,
      dataHora: '2026-11-20T12:30:00Z',
    });
    // Recarrega as visitas e limpa o formulário
    expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Visita prevista')).toHaveValue('');
    expect(campoData()).toHaveValue('');
  });

  it('confere os campos na tela antes de enviar', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicos();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: 'Salvar visita' }));

    expect(screen.getByText('Selecione a visita prevista.')).toBeInTheDocument();
    expect(screen.getByText('Informe a data da visita.')).toBeInTheDocument();
    expect(screen.getByText('Informe a hora da visita.')).toBeInTheDocument();
    expect(screen.getByLabelText('Visita prevista')).toHaveAttribute('aria-invalid', 'true');

    // Ao corrigir o campo, o erro dele some
    await usuario.selectOptions(screen.getByLabelText('Visita prevista'), 'Visita inicial');
    expect(screen.queryByText('Selecione a visita prevista.')).not.toBeInTheDocument();

    preencher('2026-11-13', '09:00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));
    expect(screen.getByText('A data da visita não pode ser anterior a hoje.')).toBeInTheDocument();

    preencher('2026-12-21', '09:00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));
    expect(screen.getByText(/dentro do período do estudo \(20\/10\/2026 a 20\/12\/2026\)/)).toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.agendarVisita).not.toHaveBeenCalled();
  });

  it.each([
    [
      'VALIDACAO_INVALIDA nos campos',
      erroApi(400, 'VALIDACAO_INVALIDA', 'Confira os campos.', {
        visitaPrevistaId: 'A visita prevista deve ser válida.',
        dataHora: 'Informe a data e hora da visita.',
      }),
      ['A visita prevista deve ser válida.', 'Informe a data e hora da visita.'],
    ],
    [
      'DATA_VISITA_INVALIDA na data',
      erroApi(400, 'DATA_VISITA_INVALIDA', 'A data da visita está fora do período permitido.'),
      ['A data da visita está fora do período permitido.'],
    ],
    [
      'VISITA_JA_AGENDADA na visita',
      erroApi(409, 'VISITA_JA_AGENDADA', 'Já existe um agendamento pendente para essa visita.'),
      ['Já existe um agendamento pendente para essa visita.'],
    ],
  ])('mostra o erro do backend %s', async (_nome, erro, mensagens) => {
    const usuario = userEvent.setup();
    renderizar(criarServicos({ acompanhamento: { agendarVisita: vi.fn().mockRejectedValue(erro) } }));

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita final');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));

    for (const mensagem of mensagens) {
      expect(await screen.findByText(mensagem)).toHaveClass('campo-erro');
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('com VALIDACAO_INVALIDA sem campos conhecidos, mostra a mensagem geral', async () => {
    const usuario = userEvent.setup();
    const erro = erroApi(400, 'VALIDACAO_INVALIDA', 'Confira os campos informados.', {});
    renderizar(criarServicos({ acompanhamento: { agendarVisita: vi.fn().mockRejectedValue(erro) } }));

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita final');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Confira os campos informados.');
  });

  it('com PARTICIPACAO_INVALIDA, avisa e recarrega a tela sem o formulário', async () => {
    const usuario = userEvent.setup();
    const listarParticipacoes = vi.fn().mockResolvedValueOnce([PARTICIPACAO]).mockResolvedValue([RETIRADA]);
    const erro = erroApi(400, 'PARTICIPACAO_INVALIDA', 'Não é possível agendar visita para participante retirado.');
    renderizar(criarServicos({ acompanhamento: { listarParticipacoes, agendarVisita: vi.fn().mockRejectedValue(erro) } }));

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita final');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não é possível agendar visita para participante retirado.');
    expect(await screen.findByText(/foi retirado do estudo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar visita' })).not.toBeInTheDocument();
    expect(listarParticipacoes).toHaveBeenCalledTimes(2);
  });

  it('mostra uma mensagem padrão para falhas fora do contrato', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos({ acompanhamento: { agendarVisita: vi.fn().mockRejectedValue(new Error('x')) } }));

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita final');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Salvar visita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o agendamento.');
  });

  it('reagenda a visita agendada com a data preenchida e mantém a visita prevista', async () => {
    const usuario = userEvent.setup();
    const reagendarVisita = vi
      .fn()
      .mockResolvedValue(resposta({ id: 3, visitaPrevistaId: 5, nomeVisita: 'Visita final', dataHora: '2026-12-15T13:00:00Z' }));
    const servicos = criarServicos({ acompanhamento: { reagendarVisita } });
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: 'Reagendar Visita final' }));

    expect(screen.getByRole('heading', { name: 'Reagendar visita' })).toBeInTheDocument();
    expect(screen.getByLabelText('Visita prevista')).toHaveValue('Visita final');
    expect(screen.getByLabelText('Visita prevista')).toBeDisabled();
    expect(campoData()).toHaveValue('2026-12-10');
    expect(campoHora()).toHaveValue('09:00');

    preencher('2026-12-15', '10:00');
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova data' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Visita final reagendada para 15/12/2026 às 10:00.');
    expect(reagendarVisita).toHaveBeenCalledWith(3, 1, 3, { dataHora: '2026-12-15T13:00:00Z' });
    expect(servicos.servicoAcompanhamento.agendarVisita).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
  });

  it('cancela o reagendamento e volta ao agendamento', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos());

    await usuario.click(await screen.findByRole('button', { name: 'Reagendar Visita final' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar reagendamento' }));

    expect(screen.getByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
    expect(campoData()).toHaveValue('');
  });

  it('com TRANSICAO_VISITA_INVALIDA no reagendamento, avisa e recarrega as visitas', async () => {
    const usuario = userEvent.setup();
    const erro = erroApi(400, 'TRANSICAO_VISITA_INVALIDA', 'Apenas visitas agendadas podem ser reagendadas.');
    const servicos = criarServicos({ acompanhamento: { reagendarVisita: vi.fn().mockRejectedValue(erro) } });
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: 'Reagendar Visita final' }));
    await usuario.click(screen.getByRole('button', { name: 'Salvar nova data' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Apenas visitas agendadas podem ser reagendadas.');
    expect(screen.getByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
    await vi.waitFor(() => expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledTimes(2));
  });

  it('não oferece agendamento nem reagendamento ao participante retirado', async () => {
    renderizar(criarServicos({ acompanhamento: { listarParticipacoes: vi.fn().mockResolvedValue([RETIRADA]) } }));

    expect(await screen.findByText(/foi retirado do estudo/)).toBeInTheDocument();
    expect(screen.getByText('Retirado')).toHaveClass('etiqueta-participacao-retirada');
    expect(screen.queryByRole('heading', { name: 'Agendar visita' })).not.toBeInTheDocument();
    expect(within(listaVisitas()).queryByRole('button')).not.toBeInTheDocument();
  });

  it('não oferece agendamento com o estudo fora de Recrutamento ou Execução', async () => {
    renderizar(criarServicos({ estudos: [{ ...ESTUDO, estado: 'ENCERRADO' }] }));

    expect(
      await screen.findByText('O agendamento e o registro de visitas só ficam disponíveis com o estudo em Recrutamento ou Execução.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Agendar visita' })).not.toBeInTheDocument();
  });

  it('aceita o estudo em Execução', async () => {
    renderizar(criarServicos({ estudos: [{ ...ESTUDO, estado: 'EXECUCAO' }] }));
    expect(await screen.findByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
  });

  it('avisa quando o protocolo não tem visitas previstas', async () => {
    renderizar(criarServicos({ protocolo: { ...PROTOCOLO, visitas: [] } }));
    expect(await screen.findByText('O protocolo do estudo não tem visitas previstas para agendar.')).toBeInTheDocument();
  });

  it('sem o histórico no backend, mantém o agendamento e oculta as visitas, o reagendamento e o registro', async () => {
    const servicos = criarServicos();
    renderizar(servicos, { historico: false, listaPesquisador: true, retirada: true });

    expect(await screen.findByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
    expect(
      screen.getByText(/A lista de visitas agendadas, o reagendamento e o registro da situação das visitas ficarão disponíveis/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Visitas agendadas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar a|Registrar|Corrigir/ })).not.toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.listarVisitas).not.toHaveBeenCalled();
  });

  it('avisa quando o participante ainda não tem visitas', async () => {
    renderizar(criarServicos({ acompanhamento: { listarVisitas: vi.fn().mockResolvedValue([]) } }));
    expect(await screen.findByText('Nenhuma visita agendada para este participante.')).toBeInTheDocument();
  });

  it('trata estudo fora da sessão, participação de outro estudo e 404 como não encontrado', async () => {
    renderizar(criarServicos({ estudos: [] }));
    expect(await screen.findByRole('heading', { name: 'Participante não encontrado' })).toBeInTheDocument();
  });

  it('trata a participação ausente da lista como não encontrada', async () => {
    renderizar(criarServicos({ acompanhamento: { listarParticipacoes: vi.fn().mockResolvedValue([]) } }));
    expect(await screen.findByRole('heading', { name: 'Participante não encontrado' })).toBeInTheDocument();
  });

  it('trata o 404 do backend como não encontrado', async () => {
    const erro = erroApi(404, 'RECURSO_NAO_ENCONTRADO', 'Participação não encontrada.');
    renderizar(criarServicos({ acompanhamento: { listarVisitas: vi.fn().mockRejectedValue(erro) } }));
    expect(await screen.findByRole('heading', { name: 'Participante não encontrado' })).toBeInTheDocument();
  });

  it('mostra o erro do carregamento e tenta de novo', async () => {
    const usuario = userEvent.setup();
    const listarVisitas = vi
      .fn()
      .mockRejectedValueOnce(erroApi(0, 'SEM_CONEXAO', 'Sem conexão.'))
      .mockResolvedValue(VISITAS);
    renderizar(criarServicos({ acompanhamento: { listarVisitas } }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.');
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
  });

  it('usa a mensagem padrão quando o carregamento falha fora do contrato', async () => {
    renderizar(criarServicos({ acompanhamento: { listarVisitas: vi.fn().mockRejectedValue(new Error('x')) } }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o agendamento.');
  });

  it('volta para a lista de participantes', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos());

    await screen.findByRole('heading', { name: 'Agendar visita' });
    await usuario.click(screen.getByRole('link', { name: 'Voltar' }));
    expect(await screen.findByRole('heading', { name: 'Participantes' })).toBeInTheDocument();
  });
});

// <-------------------REGISTRO DA SITUAÇÃO DAS VISITAS (RF13)------------------->
// Hoje é 14/11: a visita de hoje (09:00 em Recife) aceita as três situações; a final, em dezembro, só o
// cancelamento; a ausente pode ser corrigida; a cancelada em dezembro ainda não tem para onde ser corrigida
const HOJE: ResumoVisitaAgendada = {
  id: 2,
  nomeVisita: 'Visita de acompanhamento',
  dataHora: '2026-11-14T12:00:00Z',
  situacao: 'AGENDADA',
  motivo: null,
  possuiResultados: false,
};
const AUSENTE: ResumoVisitaAgendada = {
  id: 4,
  nomeVisita: 'Visita inicial',
  dataHora: '2026-11-06T12:00:00Z',
  situacao: 'AUSENTE',
  motivo: 'Participante não compareceu.',
  possuiResultados: false,
};
const CANCELADA_FUTURA: ResumoVisitaAgendada = {
  id: 5,
  nomeVisita: 'Visita extra',
  dataHora: '2026-12-01T12:00:00Z',
  situacao: 'CANCELADA',
  motivo: 'Unidade fechada.',
  possuiResultados: false,
};
const VISITAS_REGISTRO = [VISITAS[0], HOJE, AUSENTE, CANCELADA_FUTURA];

const NOME_HOJE = 'Visita de acompanhamento de 14/11/2026 às 09:00';
const NOME_FINAL = 'Visita final de 10/12/2026 às 09:00';
const NOME_AUSENTE = 'Visita inicial de 06/11/2026 às 09:00';

function criarServicosRegistro(acompanhamento: Partial<ServicoAcompanhamento> = {}, estudos?: Estudo[]) {
  return criarServicos({
    acompanhamento: { listarVisitas: vi.fn().mockResolvedValue(VISITAS_REGISTRO), ...acompanhamento },
    estudos,
  });
}

const itemDa = (nome: string) =>
  within(listaVisitas())
    .getAllByRole('listitem')
    .find((i) => i.textContent?.includes(nome)) as HTMLElement;

describe('AgendamentoVisitas: registro da situação das visitas (RF13)', () => {
  it('oferece só as ações que a data e a situação permitem e mostra o motivo das visitas registradas', async () => {
    renderizar(criarServicosRegistro());
    await screen.findByRole('region', { name: 'Visitas agendadas' });

    const botoes = (item: HTMLElement) => within(item).queryAllByRole('button').map((b) => b.textContent);
    expect(botoes(itemDa('14/11/2026'))).toEqual(['Reagendar', 'Realizada', 'Ausente', 'Cancelar visita']);
    expect(botoes(itemDa('10/12/2026'))).toEqual(['Reagendar', 'Cancelar visita']);
    expect(botoes(itemDa('06/11/2026'))).toEqual(['Corrigir']);
    expect(botoes(itemDa('01/12/2026'))).toEqual([]);

    expect(within(itemDa('06/11/2026')).getByText('Motivo: Participante não compareceu.')).toBeInTheDocument();
    expect(within(itemDa('01/12/2026')).getByText('Motivo: Unidade fechada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Registrar realização da ${NOME_HOJE}` })).toBeInTheDocument();
    // O cancelamento usa o estilo de perigo; registrar realização e ausência continuam secundários
    expect(screen.getByRole('button', { name: `Cancelar a ${NOME_FINAL}` })).toHaveClass('botao', 'botao-retirar');
    expect(screen.getByRole('button', { name: `Cancelar a ${NOME_FINAL}` })).not.toHaveClass('botao-secundario');
    expect(screen.getByRole('button', { name: `Registrar ausência na ${NOME_HOJE}` })).toHaveClass('botao-secundario');
  });

  it('registra a realização sem motivo, avisa e recarrega a lista', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Registrar realização da ${NOME_HOJE}` }));
    const dialogo = screen.getByRole('dialog', { name: 'Registrar a visita como realizada?' });
    expect(dialogo).toHaveAccessibleDescription('Visita de acompanhamento, agendada para 14/11/2026 às 09:00.');
    expect(within(dialogo).queryByRole('textbox')).not.toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar realização' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Visita de acompanhamento registrada como realizada.');
    expect(servicos.servicoAcompanhamento.registrarSituacao).toHaveBeenCalledWith(3, 1, 2, { situacao: 'REALIZADA' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledTimes(2);
  });

  it('registra a ausência com o motivo opcional aparado', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Registrar ausência na ${NOME_HOJE}` }));
    await usuario.type(screen.getByLabelText('Motivo da ausência (opcional)'), '  Não compareceu.  ');
    await usuario.click(screen.getByRole('button', { name: 'Registrar ausência' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Visita de acompanhamento registrada como ausente.');
    expect(servicos.servicoAcompanhamento.registrarSituacao).toHaveBeenCalledWith(3, 1, 2, {
      situacao: 'AUSENTE',
      motivo: 'Não compareceu.',
    });
  });

  it('registra a ausência sem motivo', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Registrar ausência na ${NOME_HOJE}` }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar ausência' }));

    await screen.findByRole('status');
    expect(servicos.servicoAcompanhamento.registrarSituacao).toHaveBeenCalledWith(3, 1, 2, { situacao: 'AUSENTE' });
  });

  it('exige o motivo do cancelamento antes de enviar, mesmo para visita futura', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Cancelar a ${NOME_FINAL}` }));
    const campo = screen.getByLabelText('Motivo do cancelamento (obrigatório)');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar visita' }));

    expect(screen.getByText('Informe o motivo do cancelamento.')).toHaveClass('campo-erro');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveFocus();
    expect(servicos.servicoAcompanhamento.registrarSituacao).not.toHaveBeenCalled();

    await usuario.type(campo, 'Unidade indisponível.');
    expect(screen.queryByText('Informe o motivo do cancelamento.')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Cancelar visita' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Visita final registrada como cancelada.');
    expect(servicos.servicoAcompanhamento.registrarSituacao).toHaveBeenCalledWith(3, 1, 3, {
      situacao: 'CANCELADA',
      motivo: 'Unidade indisponível.',
    });
  });

  it('fecha o diálogo sem registrar ao escolher Cancelar', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Cancelar a ${NOME_FINAL}` }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.registrarSituacao).not.toHaveBeenCalled();
  });

  it('sai do reagendamento quando a visita em reagendamento é registrada', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicosRegistro());

    await usuario.click(await screen.findByRole('button', { name: 'Reagendar Visita de acompanhamento' }));
    expect(screen.getByRole('heading', { name: 'Reagendar visita' })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: `Registrar realização da ${NOME_HOJE}` }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar realização' }));

    await screen.findByRole('status');
    expect(screen.getByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
  });

  it('mostra no campo o erro de motivo do backend e no diálogo os erros sem campo', async () => {
    const usuario = userEvent.setup();
    const registrarSituacao = vi
      .fn()
      .mockRejectedValueOnce(
        erroApi(400, 'VALIDACAO_INVALIDA', 'Confira os campos informados.', {
          motivo: 'O motivo deve ter no máximo 500 caracteres.',
        }),
      )
      .mockRejectedValueOnce(erroApi(400, 'VALIDACAO_INVALIDA', 'Informe o motivo do cancelamento.'))
      .mockRejectedValueOnce(new Error('x'));
    renderizar(criarServicosRegistro({ registrarSituacao }));

    await usuario.click(await screen.findByRole('button', { name: `Cancelar a ${NOME_FINAL}` }));
    await usuario.type(screen.getByLabelText('Motivo do cancelamento (obrigatório)'), 'Motivo.');
    await usuario.click(screen.getByRole('button', { name: 'Cancelar visita' }));
    expect(await screen.findByText('O motivo deve ter no máximo 500 caracteres.')).toHaveClass('campo-erro');
    await vi.waitFor(() => expect(screen.getByLabelText('Motivo do cancelamento (obrigatório)')).toHaveFocus());

    await usuario.click(screen.getByRole('button', { name: 'Cancelar visita' }));
    const dialogo = screen.getByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Informe o motivo do cancelamento.');

    await usuario.click(screen.getByRole('button', { name: 'Cancelar visita' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Não foi possível registrar a visita.');
  });

  it('com TRANSICAO_VISITA_INVALIDA, fecha o diálogo, avisa na tela e recarrega as visitas', async () => {
    const usuario = userEvent.setup();
    const erro = erroApi(400, 'TRANSICAO_VISITA_INVALIDA', 'A visita ainda não pode ser registrada.');
    const servicos = criarServicosRegistro({ registrarSituacao: vi.fn().mockRejectedValue(erro) });
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Registrar realização da ${NOME_HOJE}` }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar realização' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A visita ainda não pode ser registrada.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledTimes(2));
  });

  it('corrige a ausência para cancelada com justificativa e o novo motivo', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Corrigir a situação da ${NOME_AUSENTE}` }));
    const dialogo = screen.getByRole('dialog', { name: 'Corrigir a situação da visita?' });
    expect(dialogo).toHaveAccessibleDescription(
      'Visita inicial, agendada para 06/11/2026 às 09:00, está registrada como ausente.',
    );
    expect(within(dialogo).getByText('Motivo atual: Participante não compareceu.')).toBeInTheDocument();
    const opcoes = within(screen.getByLabelText('Nova situação')).getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Selecione a situação', 'Realizada', 'Cancelada']);

    // Tudo vazio: a tela confere antes de enviar
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(screen.getByText('Selecione a nova situação.')).toBeInTheDocument();
    expect(screen.getByText('Informe a justificativa da correção.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nova situação')).toHaveFocus();

    await usuario.selectOptions(screen.getByLabelText('Nova situação'), 'Cancelada');
    await usuario.type(screen.getByLabelText('Justificativa da correção (obrigatória)'), 'Foi cancelada antes.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(screen.getByText('Informe o motivo do cancelamento.')).toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.corrigirSituacao).not.toHaveBeenCalled();

    await usuario.type(screen.getByLabelText('Motivo do cancelamento (obrigatório)'), ' Pedido do participante. ');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Correção registrada: Visita inicial passou de ausente para cancelada.',
    );
    expect(servicos.servicoAcompanhamento.corrigirSituacao).toHaveBeenCalledWith(3, 1, 4, {
      situacao: 'CANCELADA',
      justificativa: 'Foi cancelada antes.',
      motivo: 'Pedido do participante.',
    });
    expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledTimes(2);
  });

  it('corrige para realizada sem campo de motivo, enviando motivo vazio', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicosRegistro();
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Corrigir a situação da ${NOME_AUSENTE}` }));
    await usuario.selectOptions(screen.getByLabelText('Nova situação'), 'Cancelada');
    await usuario.type(screen.getByLabelText('Motivo do cancelamento (obrigatório)'), 'Motivo.');
    // Ao trocar para realizada, o motivo some e não é enviado
    await usuario.selectOptions(screen.getByLabelText('Nova situação'), 'Realizada');
    expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Justificativa da correção (obrigatória)'), 'A visita ocorreu.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));

    await screen.findByRole('status');
    expect(servicos.servicoAcompanhamento.corrigirSituacao).toHaveBeenCalledWith(3, 1, 4, {
      situacao: 'REALIZADA',
      justificativa: 'A visita ocorreu.',
      motivo: null,
    });
  });

  it('corrige para ausente com motivo opcional', async () => {
    const usuario = userEvent.setup();
    const realizada: ResumoVisitaAgendada = { ...AUSENTE, situacao: 'REALIZADA', motivo: null };
    const servicos = criarServicosRegistro({ listarVisitas: vi.fn().mockResolvedValue([realizada]) });
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Corrigir a situação da ${NOME_AUSENTE}` }));
    await usuario.selectOptions(screen.getByLabelText('Nova situação'), 'Ausente');
    expect(screen.getByLabelText('Motivo da ausência (opcional)')).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Justificativa da correção (obrigatória)'), 'Não veio.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));

    expect(await screen.findByRole('status')).toHaveTextContent('passou de realizada para ausente.');
    expect(servicos.servicoAcompanhamento.corrigirSituacao).toHaveBeenCalledWith(3, 1, 4, {
      situacao: 'AUSENTE',
      justificativa: 'Não veio.',
      motivo: null,
    });
  });

  it('mostra nos campos os erros da correção vindos do backend e no diálogo os demais', async () => {
    const usuario = userEvent.setup();
    const corrigirSituacao = vi
      .fn()
      .mockRejectedValueOnce(
        erroApi(400, 'VALIDACAO_INVALIDA', 'Confira os campos informados.', {
          justificativa: 'A justificativa deve ter no máximo 500 caracteres.',
        }),
      )
      .mockRejectedValueOnce(erroApi(404, 'RECURSO_NAO_ENCONTRADO', 'Visita agendada não encontrada.'))
      .mockRejectedValueOnce(new Error('x'));
    renderizar(criarServicosRegistro({ corrigirSituacao }));

    await usuario.click(await screen.findByRole('button', { name: `Corrigir a situação da ${NOME_AUSENTE}` }));
    await usuario.selectOptions(screen.getByLabelText('Nova situação'), 'Realizada');
    await usuario.type(screen.getByLabelText('Justificativa da correção (obrigatória)'), 'Texto.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(await screen.findByText('A justificativa deve ter no máximo 500 caracteres.')).toHaveClass('campo-erro');
    await vi.waitFor(() =>
      expect(screen.getByLabelText('Justificativa da correção (obrigatória)')).toHaveFocus(),
    );

    const dialogo = screen.getByRole('dialog');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Visita agendada não encontrada.');

    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Não foi possível registrar a correção.');
  });

  it('com CORRECAO_BLOQUEADA, fecha o diálogo, avisa na tela e recarrega as visitas', async () => {
    const usuario = userEvent.setup();
    const erro = erroApi(400, 'CORRECAO_BLOQUEADA', 'A visita possui resultados registrados.');
    const servicos = criarServicosRegistro({ corrigirSituacao: vi.fn().mockRejectedValue(erro) });
    renderizar(servicos);

    await usuario.click(await screen.findByRole('button', { name: `Corrigir a situação da ${NOME_AUSENTE}` }));
    await usuario.selectOptions(screen.getByLabelText('Nova situação'), 'Realizada');
    await usuario.type(screen.getByLabelText('Justificativa da correção (obrigatória)'), 'A visita ocorreu.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar correção' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A visita possui resultados registrados.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await vi.waitFor(() => expect(servicos.servicoAcompanhamento.listarVisitas).toHaveBeenCalledTimes(2));
  });

  it('não oferece registro nem correção com o estudo encerrado, mas mostra a situação e o motivo', async () => {
    renderizar(criarServicosRegistro({}, [{ ...ESTUDO, estado: 'ENCERRADO' }]));

    expect(await screen.findByText(/só ficam disponíveis com o estudo em Recrutamento ou Execução/)).toBeInTheDocument();
    expect(within(listaVisitas()).queryByRole('button')).not.toBeInTheDocument();
    expect(within(itemDa('06/11/2026')).getByText('Ausente')).toBeInTheDocument();
    expect(within(itemDa('06/11/2026')).getByText('Motivo: Participante não compareceu.')).toBeInTheDocument();
  });

  it('não oferece registro nem correção a quem não é coordenador', async () => {
    const pesquisadora: UsuarioSessao = { ...COORDENADOR, id: 2, nome: 'Paula', perfil: 'PESQUISADOR' };
    renderizar(criarServicosRegistro(), undefined, pesquisadora);

    await screen.findByRole('region', { name: 'Visitas agendadas' });
    expect(screen.queryByRole('button', { name: /Registrar|Cancelar a|Corrigir/ })).not.toBeInTheDocument();
  });
});
