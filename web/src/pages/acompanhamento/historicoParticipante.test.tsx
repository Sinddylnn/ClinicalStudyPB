import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { HistoricoParticipacao, Participacao, ServicoAcompanhamento } from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import HistoricoParticipante from './HistoricoParticipante';

// <-------------------TESTES DA TELA DE HISTÓRICO------------------->
const COORDENADOR: UsuarioSessao = {
  id: 3,
  nome: 'Carlos Coordenador',
  email: 'carlos@exemplo.com',
  perfil: 'COORDENADOR',
};

const PESQUISADORA: UsuarioSessao = { id: 2, nome: 'Paula Pesquisadora', email: 'paula@exemplo.com', perfil: 'PESQUISADOR' };

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

// Fora de ordem de propósito: a tela organiza
const HISTORICO: HistoricoParticipacao = {
  participacaoId: 1,
  itens: [
    {
      tipo: 'VISITA',
      visitaAgendadaId: 2,
      nomeVisita: 'Visita de acompanhamento',
      dataHora: '2026-11-06T12:00:00Z',
      situacao: 'AUSENTE',
      motivo: 'Participante não compareceu.',
      registradoPorId: 3,
      registradoEm: '2026-11-06T15:00:00Z',
      resultados: [],
      correcoes: [
        {
          situacaoAnterior: 'REALIZADA',
          situacaoNova: 'AUSENTE',
          justificativa: 'Registro feito na visita errada.',
          corrigidaPorId: 3,
          corrigidaPorNome: 'Carlos Coordenador',
          corrigidaEm: '2026-11-07T12:00:00Z',
        },
      ],
    },
    {
      tipo: 'VISITA',
      visitaAgendadaId: 1,
      nomeVisita: 'Visita inicial',
      dataHora: '2026-10-30T12:00:00Z',
      situacao: 'REALIZADA',
      motivo: null,
      registradoPorId: 3,
      registradoPorNome: 'Carlos Coordenador',
      registradoEm: '2026-10-30T13:10:00Z',
      resultados: [
        { atividadePrevistaId: 3, descricaoAtividade: 'Registrar hábitos de sono.', texto: 'Dorme 7 horas (fictício).' },
      ],
      correcoes: [],
    },
    {
      tipo: 'VISITA',
      visitaAgendadaId: 3,
      nomeVisita: 'Visita final',
      dataHora: '2026-12-10T12:00:00Z',
      situacao: 'AGENDADA',
      motivo: null,
      registradoPorId: null,
      registradoEm: null,
      resultados: [],
      correcoes: [],
    },
  ],
};

function criarServicos(parcial: Partial<ServicoAcompanhamento> = {}, estudos: Estudo[] = [ESTUDO]) {
  const servicoEstudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue(estudos),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const acompanhamento: ServicoAcompanhamento = {
    listarParticipacoes: vi.fn().mockResolvedValue([PARTICIPACAO]),
    obterHistorico: vi.fn().mockResolvedValue(HISTORICO),
    obterVisita: vi.fn(),
    listarResultados: vi.fn(),
    registrarResultado: vi.fn(),
    editarResultado: vi.fn(),
    ...parcial,
  };
  return { estudos: servicoEstudos, acompanhamento };
}

function renderizar(
  servicos: ReturnType<typeof criarServicos>,
  usuario = COORDENADOR,
  caminho: string | { pathname: string; state: unknown } = '/estudos/3/participacoes/1/historico',
) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route
          path="/estudos/:id/participacoes/:participacaoId/historico"
          element={
            <HistoricoParticipante
              servicoEstudos={servicos.estudos}
              servicoAcompanhamento={servicos.acompanhamento}
              usuario={usuario}
            />
          }
        />
        <Route path="/estudos/:id/recrutamento" element={<h1>Recrutamento</h1>} />
        <Route path="/estudos/:id" element={<h1>Protocolo</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const eventos = () => within(screen.getByRole('list', { name: 'Eventos do participante' })).getAllByRole('listitem');

const evento = (nome: string) =>
  eventos().find((e) => within(e).queryByRole('heading', { name: nome })) as HTMLElement;

describe('HistoricoParticipante', () => {
  it('mostra o participante e as visitas em ordem cronológica, no horário de Recife', async () => {
    const servicos = criarServicos();
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Histórico do participante' })).toBeInTheDocument();
    expect(await screen.findByText('Incluído em 28/10/2026 às 10:00')).toBeInTheDocument();
    expect(servicos.acompanhamento.obterHistorico).toHaveBeenCalledWith(3, 1);
    expect(screen.getByText('Os resultados das avaliações são fictícios.')).toBeInTheDocument();

    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Visita inicial', 'Visita de acompanhamento', 'Visita final']);

    const inicial = evento('Visita inicial');
    expect(within(inicial).getByText('Realizada')).toHaveClass('etiqueta-visita-realizada');
    expect(within(inicial).getByText('30/10/2026 às 09:00')).toBeInTheDocument();
    expect(within(inicial).getByText('Realizada por Carlos Coordenador em 30/10/2026 às 10:10')).toBeInTheDocument();
    const resultados = within(inicial).getByRole('region', { name: 'Resultados da Visita inicial' });
    expect(resultados).toHaveTextContent('Registrar hábitos de sono.Dorme 7 horas (fictício).');
  });

  it('mostra motivo, correções e o número de quem registrou quando o nome não vem', async () => {
    renderizar(criarServicos());

    const ausencia = await screen.findByRole('heading', { name: 'Visita de acompanhamento' });
    const cartao = ausencia.closest('li') as HTMLElement;
    expect(within(cartao).getByText('Ausente')).toHaveClass('etiqueta-visita-ausente');
    expect(within(cartao).getByText('Participante não compareceu.')).toBeInTheDocument();
    expect(within(cartao).getByText('Ausente por Usuário nº 3 em 06/11/2026 às 12:00')).toBeInTheDocument();
    // Ausência não tem resultados
    expect(within(cartao).queryByRole('region', { name: /Resultados/ })).not.toBeInTheDocument();
    expect(within(cartao).getByRole('region', { name: 'Correções da Visita de acompanhamento' })).toHaveTextContent(
      'De Realizada para Ausente por Carlos Coordenador em 07/11/2026 às 09:00: Registro feito na visita errada.',
    );

    // Visita ainda agendada: sem registro
    const agendada = evento('Visita final');
    expect(within(agendada).getByText('Agendada')).toHaveClass('etiqueta-visita-agendada');
    expect(within(agendada).queryByText('Registro')).not.toBeInTheDocument();
  });

  it('avisa quando a visita realizada ainda não tem resultados', async () => {
    const historico: HistoricoParticipacao = {
      participacaoId: 1,
      itens: [{ ...HISTORICO.itens[1], resultados: [] } as HistoricoParticipacao['itens'][number]],
    };
    renderizar(criarServicos({ obterHistorico: vi.fn().mockResolvedValue(historico) }));

    expect(await screen.findByText('Nenhum resultado registrado.')).toBeInTheDocument();
  });

  it('mostra a retirada como último evento e o participante como retirado', async () => {
    const historico: HistoricoParticipacao = {
      participacaoId: 1,
      itens: [
        {
          tipo: 'RETIRADA',
          dataRetirada: '2026-11-08T14:00:00Z',
          motivo: 'Participante solicitou a retirada.',
          retiradaPorId: 3,
          retiradaPorNome: 'Carlos Coordenador',
        },
        ...HISTORICO.itens,
      ],
    };
    renderizar(
      criarServicos({
        listarParticipacoes: vi.fn().mockResolvedValue([{ ...PARTICIPACAO, situacao: 'RETIRADA' }]),
        obterHistorico: vi.fn().mockResolvedValue(historico),
      }),
      PESQUISADORA,
    );

    await screen.findByRole('heading', { name: 'Retirada do estudo' });
    const todos = eventos();
    const ultimo = todos[todos.length - 1];
    expect(within(ultimo).getByRole('heading')).toHaveTextContent('Retirada do estudo');
    expect(within(ultimo).getByText('Por Carlos Coordenador em 08/11/2026 às 11:00')).toBeInTheDocument();
    expect(within(ultimo).getByText('Participante solicitou a retirada.')).toBeInTheDocument();
    expect(screen.getByText('Retirado', { selector: '.historico-subtitulo .etiqueta' })).toBeInTheDocument();
  });

  it('mostra a lista vazia quando ainda não há visitas', async () => {
    renderizar(criarServicos({ obterHistorico: vi.fn().mockResolvedValue({ participacaoId: 1, itens: [] }) }));

    expect(await screen.findByRole('heading', { name: 'Nenhuma visita agendada' })).toBeInTheDocument();
  });

  it('volta para o recrutamento (coordenador) ou para o estudo (pesquisador)', async () => {
    renderizar(criarServicos());
    await userEvent.click(await screen.findByRole('link', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Recrutamento' })).toBeInTheDocument();
  });

  it('o pesquisador volta para a tela do estudo', async () => {
    renderizar(criarServicos(), PESQUISADORA);
    await userEvent.click(await screen.findByRole('link', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Protocolo' })).toBeInTheDocument();
  });

  it('trata estudo fora da sessão como não encontrado, sem pedir o histórico', async () => {
    const semEstudo = criarServicos({}, []);
    renderizar(semEstudo);
    expect(await screen.findByRole('heading', { name: 'Participante não encontrado' })).toBeInTheDocument();
    expect(semEstudo.acompanhamento.obterHistorico).not.toHaveBeenCalled();
  });

  it('trata o 404 da API como não encontrado', async () => {
    const erro = new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Não encontrado.' });
    renderizar(criarServicos({ obterHistorico: vi.fn().mockRejectedValue(erro) }));
    expect(await screen.findByRole('heading', { name: 'Participante não encontrado' })).toBeInTheDocument();
  });

  it('trata participação que não está na lista do estudo como não encontrada', async () => {
    renderizar(criarServicos({ listarParticipacoes: vi.fn().mockResolvedValue([]) }));
    expect(await screen.findByRole('heading', { name: 'Participante não encontrado' })).toBeInTheDocument();
  });

  it('mostra a falha de carregamento e tenta de novo', async () => {
    const obterHistorico = vi
      .fn()
      .mockRejectedValueOnce(new ErroRequisicao(500, { codigo: 'ERRO_INTERNO', mensagem: 'Falha no servidor.' }))
      .mockResolvedValue(HISTORICO);
    renderizar(criarServicos({ obterHistorico }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no servidor.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'Visita inicial' })).toBeInTheDocument();
    expect(obterHistorico).toHaveBeenCalledTimes(2);
  });

  it('usa a mensagem padrão quando a falha não vem da API', async () => {
    renderizar(criarServicos({ obterHistorico: vi.fn().mockRejectedValue(new Error('rede')) }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico.');
  });

  it('o coordenador abre os resultados só das visitas realizadas', async () => {
    renderizar(criarServicos());

    await screen.findByRole('heading', { name: 'Visita inicial' });
    expect(within(evento('Visita inicial')).getByRole('link', { name: 'Editar resultados da Visita inicial' })).toHaveAttribute(
      'href',
      '/estudos/3/participacoes/1/visitas/1/resultados',
    );
    expect(within(evento('Visita de acompanhamento')).queryByRole('link')).not.toBeInTheDocument();
    expect(within(evento('Visita final')).queryByRole('link')).not.toBeInTheDocument();
  });

  it('chama de "Registrar" a visita realizada que ainda não tem resultados', async () => {
    const semResultados: HistoricoParticipacao = {
      participacaoId: 1,
      itens: [{ ...HISTORICO.itens[1], resultados: [] } as HistoricoParticipacao['itens'][number]],
    };
    renderizar(criarServicos({ obterHistorico: vi.fn().mockResolvedValue(semResultados) }));

    expect(await screen.findByRole('link', { name: 'Registrar resultados da Visita inicial' })).toBeInTheDocument();
  });

  it('não oferece os resultados ao pesquisador nem em estudo encerrado', async () => {
    renderizar(criarServicos(), PESQUISADORA);
    await screen.findByRole('heading', { name: 'Visita inicial' });
    expect(screen.queryByRole('link', { name: /resultados da/ })).not.toBeInTheDocument();
    expect(screen.getByText('Somente consulta. Os resultados das avaliações são fictícios.')).toBeInTheDocument();
  });

  it('em estudo encerrado o coordenador só consulta', async () => {
    renderizar(criarServicos({}, [{ ...ESTUDO, estado: 'ENCERRADO' }]));
    await screen.findByRole('heading', { name: 'Visita inicial' });
    expect(screen.queryByRole('link', { name: /resultados da/ })).not.toBeInTheDocument();
  });

  it('mostra o aviso de resultados salvos e some depois de alguns segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderizar(criarServicos(), COORDENADOR, {
        pathname: '/estudos/3/participacoes/1/historico',
        state: { aviso: 'Resultados da Visita inicial salvos.' },
      });

      expect(await screen.findByRole('status')).toHaveTextContent('Resultados da Visita inicial salvos.');
      await act(() => vi.advanceTimersByTimeAsync(6000));
      expect(screen.queryByText('Resultados da Visita inicial salvos.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
