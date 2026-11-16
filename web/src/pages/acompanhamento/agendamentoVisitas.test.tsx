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

const VISITAS: ResumoVisitaAgendada[] = [
  { id: 3, nomeVisita: 'Visita final', dataHora: '2026-12-10T12:00:00Z', situacao: 'AGENDADA' },
  { id: 1, nomeVisita: 'Visita inicial', dataHora: '2026-10-30T12:00:00Z', situacao: 'REALIZADA' },
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
) {
  render(
    <MemoryRouter initialEntries={['/estudos/3/participacoes/1/visitas']}>
      <Routes>
        <Route
          path="/estudos/:id/participacoes/:participacaoId/visitas"
          element={<AgendamentoVisitas {...servicos} recursos={recursos} usuario={COORDENADOR} />}
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
    // Só a visita ainda agendada pode ser reagendada
    expect(within(itens[0]).queryByRole('button')).not.toBeInTheDocument();
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
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));

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

    await usuario.click(await screen.findByRole('button', { name: 'Agendar visita' }));

    expect(screen.getByText('Selecione a visita prevista.')).toBeInTheDocument();
    expect(screen.getByText('Informe a data da visita.')).toBeInTheDocument();
    expect(screen.getByText('Informe a hora da visita.')).toBeInTheDocument();
    expect(screen.getByLabelText('Visita prevista')).toHaveAttribute('aria-invalid', 'true');

    // Ao corrigir o campo, o erro dele some
    await usuario.selectOptions(screen.getByLabelText('Visita prevista'), 'Visita inicial');
    expect(screen.queryByText('Selecione a visita prevista.')).not.toBeInTheDocument();

    preencher('2026-11-13', '09:00');
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));
    expect(screen.getByText('A data da visita não pode ser anterior a hoje.')).toBeInTheDocument();

    preencher('2026-12-21', '09:00');
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));
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
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));

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
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Confira os campos informados.');
  });

  it('com PARTICIPACAO_INVALIDA, avisa e recarrega a tela sem o formulário', async () => {
    const usuario = userEvent.setup();
    const listarParticipacoes = vi.fn().mockResolvedValueOnce([PARTICIPACAO]).mockResolvedValue([RETIRADA]);
    const erro = erroApi(400, 'PARTICIPACAO_INVALIDA', 'Não é possível agendar visita para participante retirado.');
    renderizar(criarServicos({ acompanhamento: { listarParticipacoes, agendarVisita: vi.fn().mockRejectedValue(erro) } }));

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita final');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não é possível agendar visita para participante retirado.');
    expect(await screen.findByText(/foi retirado do estudo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agendar visita' })).not.toBeInTheDocument();
    expect(listarParticipacoes).toHaveBeenCalledTimes(2);
  });

  it('mostra uma mensagem padrão para falhas fora do contrato', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos({ acompanhamento: { agendarVisita: vi.fn().mockRejectedValue(new Error('x')) } }));

    await usuario.selectOptions(await screen.findByLabelText('Visita prevista'), 'Visita final');
    preencher('2026-11-20', '09:30');
    await usuario.click(screen.getByRole('button', { name: 'Agendar visita' }));

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
    expect(within(listaVisitas()).queryByRole('button', { name: /Reagendar/ })).not.toBeInTheDocument();
  });

  it('não oferece agendamento com o estudo fora de Recrutamento ou Execução', async () => {
    renderizar(criarServicos({ estudos: [{ ...ESTUDO, estado: 'ENCERRADO' }] }));

    expect(
      await screen.findByText('O agendamento de visitas só fica disponível com o estudo em Recrutamento ou Execução.'),
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

  it('sem o histórico no backend, mantém o agendamento e só oculta as visitas e o reagendamento', async () => {
    const servicos = criarServicos();
    renderizar(servicos, { historico: false, listaPesquisador: false, retirada: false });

    expect(await screen.findByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument();
    expect(screen.getByText(/A lista de visitas agendadas e o reagendamento ficarão disponíveis/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Visitas agendadas' })).not.toBeInTheDocument();
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
