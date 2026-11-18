import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Participacao, RecursosAcompanhamento, ServicoAcompanhamento } from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import ParticipantesEstudo from './ParticipantesEstudo';

// <-------------------TESTES DA LISTA DE PARTICIPANTES------------------->
const COORDENADOR: UsuarioSessao = { id: 3, nome: 'Carlos Coordenador', email: 'carlos@exemplo.com', perfil: 'COORDENADOR' };
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

const PARTICIPACOES: Participacao[] = [
  { id: 1, participanteId: 14, participanteNome: 'Maria Souza', dataInclusao: '2026-10-28T13:00:00Z', situacao: 'ATIVA' },
  {
    id: 2,
    participanteId: 20,
    participanteNome: 'Joana Ribeiro',
    dataInclusao: '2026-10-29T14:30:00Z',
    situacao: 'RETIRADA',
    dataRetirada: '2026-11-05T12:00:00Z',
  },
];

const TODOS: RecursosAcompanhamento = { historico: true, listaPesquisador: true, retirada: true };

function criarServicos(parcial: Partial<ServicoAcompanhamento> = {}, estudos: Estudo[] = [ESTUDO]) {
  const servicoEstudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue(estudos),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const acompanhamento: ServicoAcompanhamento = {
    listarParticipacoes: vi.fn().mockResolvedValue(PARTICIPACOES),
    obterHistorico: vi.fn(),
    listarVisitas: vi.fn(),
    agendarVisita: vi.fn(),
    reagendarVisita: vi.fn(),
    registrarSituacao: vi.fn(),
    corrigirSituacao: vi.fn(),
    obterVisita: vi.fn(),
    listarResultados: vi.fn(),
    registrarResultado: vi.fn(),
    editarResultado: vi.fn(),
    retirarParticipante: vi.fn(),
    ...parcial,
  };
  return { estudos: servicoEstudos, acompanhamento };
}

function renderizar(servicos: ReturnType<typeof criarServicos>, usuario = COORDENADOR, recursos = TODOS) {
  render(
    <MemoryRouter initialEntries={['/estudos/3/participacoes']}>
      <Routes>
        <Route
          path="/estudos/:id/participacoes"
          element={
            <ParticipantesEstudo
              servicoEstudos={servicos.estudos}
              servicoAcompanhamento={servicos.acompanhamento}
              recursos={recursos}
              usuario={usuario}
            />
          }
        />
        <Route path="/estudos/:id/participacoes/:participacaoId/historico" element={<h1>Histórico</h1>} />
        <Route path="/estudos/:id/participacoes/:participacaoId/visitas" element={<h1>Agendamento</h1>} />
        <Route path="/estudos/:id/recrutamento" element={<h1>Recrutamento</h1>} />
        <Route path="/estudos/:id" element={<h1>Protocolo</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const linhaDe = async (nome: string) => (await screen.findByText(nome)).closest('tr') as HTMLElement;

describe('ParticipantesEstudo', () => {
  it('lista nome, data de inclusão em Recife, situação e o link do histórico', async () => {
    const servicos = criarServicos();
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Participantes incluídos' })).toBeInTheDocument();
    expect(servicos.acompanhamento.listarParticipacoes).toHaveBeenCalledWith(3);
    const maria = await linhaDe('Maria Souza');
    expect(within(maria).getByText('28/10/2026 às 10:00')).toBeInTheDocument();
    expect(within(maria).getByText('Ativo')).toHaveClass('etiqueta-participacao-ativa');
    expect(within(maria).getByRole('link', { name: 'Ver histórico de Maria Souza' })).toHaveAttribute(
      'href',
      '/estudos/3/participacoes/1/historico',
    );
    const joana = await linhaDe('Joana Ribeiro');
    expect(within(joana).getByText('Retirado')).toHaveClass('etiqueta-participacao-retirada');
    expect(screen.getByText('2 participantes incluídos')).toBeInTheDocument();
  });

  it('o coordenador agenda só para participante ativo, com o estudo em Recrutamento ou Execução', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos());

    const maria = await linhaDe('Maria Souza');
    expect(within(await linhaDe('Joana Ribeiro')).queryByRole('link', { name: /Agendar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Participantes retirados continuam na lista/)).toBeInTheDocument();

    await usuario.click(within(maria).getByRole('link', { name: 'Agendar visitas de Maria Souza' }));
    expect(await screen.findByRole('heading', { name: 'Agendamento' })).toBeInTheDocument();
  });

  it('com o estudo encerrado, o coordenador só consulta e vê o motivo', async () => {
    renderizar(criarServicos({}, [{ ...ESTUDO, estado: 'ENCERRADO' }]));

    await linhaDe('Maria Souza');
    expect(screen.queryByRole('link', { name: /Agendar visitas/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('O agendamento de visitas só fica disponível com o estudo em Recrutamento ou Execução.'),
    ).toBeInTheDocument();
  });

  it('o pesquisador só consulta e volta para a tela do estudo', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos(), PESQUISADORA);

    const maria = await linhaDe('Maria Souza');
    expect(within(maria).queryByRole('link', { name: /Agendar/ })).not.toBeInTheDocument();
    expect(within(maria).getByRole('link', { name: /Ver histórico/ })).toBeInTheDocument();
    expect(screen.getByText(/^Somente consulta\./)).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: 'Voltar' }));
    expect(await screen.findByRole('heading', { name: 'Protocolo' })).toBeInTheDocument();
  });

  it('o coordenador volta pela trilha para o recrutamento', async () => {
    const usuario = userEvent.setup();
    renderizar(criarServicos());

    await linhaDe('Maria Souza');
    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    await usuario.click(within(trilha).getByRole('link', { name: 'Acompanhamento de hábitos' }));
    expect(await screen.findByRole('heading', { name: 'Recrutamento' })).toBeInTheDocument();
  });

  it('sem o histórico no backend, não mostra o link "Ver histórico"', async () => {
    renderizar(criarServicos(), COORDENADOR, { historico: false, listaPesquisador: false, retirada: false });

    const maria = await linhaDe('Maria Souza');
    expect(within(maria).queryByRole('link', { name: /Ver histórico/ })).not.toBeInTheDocument();
    expect(within(maria).getByRole('link', { name: /Agendar visitas/ })).toBeInTheDocument();
  });

  it('sem a lista liberada ao pesquisador no backend, não chama a rota e explica', async () => {
    const servicos = criarServicos();
    renderizar(servicos, PESQUISADORA, { historico: false, listaPesquisador: false, retirada: false });

    expect(await screen.findByText(/ficará disponível quando o backend liberar/)).toBeInTheDocument();
    expect(servicos.acompanhamento.listarParticipacoes).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('mostra o estado vazio quando ninguém foi incluído', async () => {
    renderizar(criarServicos({ listarParticipacoes: vi.fn().mockResolvedValue([]) }));

    expect(await screen.findByRole('heading', { name: 'Nenhum participante incluído' })).toBeInTheDocument();
  });

  it('trata estudo fora da sessão e 404 do backend como não encontrado', async () => {
    const servicos = criarServicos({}, []);
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
    expect(servicos.acompanhamento.listarParticipacoes).not.toHaveBeenCalled();
  });

  it('trata o 404 da lista como não encontrado', async () => {
    const erro = new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Estudo não encontrado.' });
    renderizar(criarServicos({ listarParticipacoes: vi.fn().mockRejectedValue(erro) }));

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
  });

  it('mostra o erro e tenta de novo', async () => {
    const usuario = userEvent.setup();
    const listar = vi
      .fn()
      .mockRejectedValueOnce(new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Sem conexão.' }))
      .mockResolvedValueOnce(PARTICIPACOES);
    renderizar(criarServicos({ listarParticipacoes: listar }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.');
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
  });

  it('usa a mensagem padrão para falhas fora do contrato', async () => {
    renderizar(criarServicos({ listarParticipacoes: vi.fn().mockRejectedValue(new Error('x')) }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os participantes.');
  });
});

describe('ParticipantesEstudo: retirada', () => {
  const botaoRetirar = (nome: string) => screen.queryByRole('button', { name: `Retirar ${nome} do estudo` });

  it('o coordenador retira um participante ativo e a lista atualiza a situação', async () => {
    const retirarParticipante = vi.fn().mockResolvedValue({});
    const retirada: Participacao = { ...PARTICIPACOES[0], situacao: 'RETIRADA', dataRetirada: '2026-11-16T15:00:00Z' };
    const servicos = criarServicos({
      retirarParticipante,
      listarParticipacoes: vi.fn().mockResolvedValueOnce(PARTICIPACOES).mockResolvedValue([retirada, PARTICIPACOES[1]]),
    });
    renderizar(servicos);

    await linhaDe('Maria Souza');
    // A participação já retirada não tem o botão
    expect(botaoRetirar('Joana Ribeiro')).not.toBeInTheDocument();
    await userEvent.click(botaoRetirar('Maria Souza') as HTMLElement);
    const dialogo = screen.getByRole('dialog', { name: 'Retirar do estudo?' });
    expect(within(dialogo).getByText('As visitas ainda agendadas serão canceladas.')).toBeInTheDocument();
    await userEvent.type(within(dialogo).getByLabelText('Motivo da retirada (obrigatório)'), 'Pediu para sair.');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Retirar participante' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Retirada de Maria Souza registrada.');
    expect(retirarParticipante).toHaveBeenCalledWith(3, 1, { motivo: 'Pediu para sair.' });
    const linha = await linhaDe('Maria Souza');
    expect(await within(linha).findByText('Retirado')).toBeInTheDocument();
    expect(botaoRetirar('Maria Souza')).not.toBeInTheDocument();
    expect(within(linha).queryByRole('link', { name: /Agendar visitas/ })).not.toBeInTheDocument();
  });

  it('não oferece a retirada ao pesquisador, com o estudo encerrado nem sem o backend', async () => {
    renderizar(criarServicos(), PESQUISADORA);
    await linhaDe('Maria Souza');
    expect(botaoRetirar('Maria Souza')).not.toBeInTheDocument();
    cleanup();

    renderizar(criarServicos({}, [{ ...ESTUDO, estado: 'ENCERRADO' }]));
    await linhaDe('Maria Souza');
    expect(botaoRetirar('Maria Souza')).not.toBeInTheDocument();
    cleanup();

    renderizar(criarServicos(), COORDENADOR, { ...TODOS, retirada: false });
    await linhaDe('Maria Souza');
    expect(botaoRetirar('Maria Souza')).not.toBeInTheDocument();
  });
});
