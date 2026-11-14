import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type {
  Participacao,
  ResultadoAtividade,
  ServicoAcompanhamento,
  VisitaAgendada,
} from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { Protocolo, ServicoProtocolo } from '../../api/protocolo';
import ResultadosVisita from './ResultadosVisita';

// <-------------------TESTES DA TELA DE RESULTADOS------------------->
const COORDENADOR: UsuarioSessao = {
  id: 3,
  nome: 'Carlos Coordenador',
  email: 'carlos@exemplo.com',
  perfil: 'COORDENADOR',
};

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

const VISITA: VisitaAgendada = {
  id: 4,
  participacaoId: 1,
  visitaPrevistaId: 7,
  nomeVisita: 'Visita de acompanhamento',
  dataHora: '2026-11-11T12:00:00Z',
  situacao: 'REALIZADA',
  motivo: null,
  registradoPorId: 3,
  registradoEm: '2026-11-11T13:00:00Z',
};

const PROTOCOLO = {
  estudoId: 3,
  visitas: [
    {
      id: 7,
      atividades: [
        { id: 10, descricao: 'Registrar hábitos de sono.' },
        { id: 11, descricao: 'Medir a pressão (fictício).' },
      ],
    },
  ],
} as unknown as Protocolo;

const SALVO: ResultadoAtividade = {
  id: 50,
  visitaAgendadaId: 4,
  atividadePrevistaId: 10,
  descricaoAtividade: 'Registrar hábitos de sono.',
  texto: 'Dorme 7 horas (fictício).',
  registradoPorId: 3,
  registradoEm: '2026-11-11T14:00:00Z',
  atualizadoPorId: null,
  atualizadoEm: null,
};

type Opcoes = {
  acompanhamento?: Partial<ServicoAcompanhamento>;
  estudos?: Estudo[];
  resultados?: ResultadoAtividade[];
};

function criarServicos({ acompanhamento = {}, estudos = [ESTUDO], resultados = [] }: Opcoes = {}) {
  const servicoEstudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue(estudos),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const servicoAcompanhamento: ServicoAcompanhamento = {
    listarParticipacoes: vi.fn().mockResolvedValue([PARTICIPACAO]),
    obterHistorico: vi.fn(),
    obterVisita: vi.fn().mockResolvedValue(VISITA),
    listarResultados: vi.fn().mockResolvedValue(resultados),
    registrarResultado: vi.fn().mockImplementation((_e, _p, _v, entrada) => Promise.resolve({ ...SALVO, ...entrada })),
    editarResultado: vi.fn().mockImplementation((_e, _p, _v, _r, texto) => Promise.resolve({ ...SALVO, texto })),
    ...acompanhamento,
  };
  const servicoProtocolo = { obter: vi.fn().mockResolvedValue(PROTOCOLO) } as unknown as ServicoProtocolo;
  return { servicoEstudos, servicoAcompanhamento, servicoProtocolo };
}

// Mostra o aviso que a tela manda para o histórico
function HistoricoFalso() {
  const { state } = useLocation() as { state: { aviso?: string } | null };
  return <h1>Histórico: {state?.aviso}</h1>;
}

function renderizar(servicos: ReturnType<typeof criarServicos>) {
  render(
    <MemoryRouter initialEntries={['/estudos/3/participacoes/1/visitas/4/resultados']}>
      <Routes>
        <Route
          path="/estudos/:id/participacoes/:participacaoId/visitas/:visitaId/resultados"
          element={<ResultadosVisita {...servicos} usuario={COORDENADOR} />}
        />
        <Route path="/estudos/:id/participacoes/:participacaoId/historico" element={<HistoricoFalso />} />
      </Routes>
    </MemoryRouter>,
  );
}

const campo = (nome: string) => screen.getByLabelText<HTMLTextAreaElement>(nome);
const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar resultados' }));

describe('ResultadosVisita', () => {
  it('mostra a visita, o aviso de dados fictícios e um campo por atividade prevista', async () => {
    renderizar(criarServicos({ resultados: [SALVO] }));

    expect(await screen.findByLabelText('Registrar hábitos de sono.')).toHaveValue('Dorme 7 horas (fictício).');
    expect(screen.getByText(/Dados fictícios: não registre informações reais de saúde/)).toBeInTheDocument();
    expect(screen.getByText('Visita de acompanhamento')).toBeInTheDocument();
    expect(screen.getByText(/Registrado por Usuário nº 3 em 11\/11\/2026/)).toBeInTheDocument();
    expect(campo('Medir a pressão (fictício).')).toHaveValue('');
    expect(screen.getByText('Ainda sem resultado.')).toBeInTheDocument();
  });

  it('salva só o que foi preenchido e volta ao histórico com o aviso', async () => {
    const servicos = criarServicos();
    renderizar(servicos);

    await userEvent.type(await screen.findByLabelText('Medir a pressão (fictício).'), '  12 por 8 ');
    expect(screen.getByText('8/1000')).toBeInTheDocument();
    await salvar();

    expect(
      await screen.findByRole('heading', { name: 'Histórico: Resultados da Visita de acompanhamento salvos.' }),
    ).toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.registrarResultado).toHaveBeenCalledExactlyOnceWith(3, 1, 4, {
      atividadePrevistaId: 11,
      texto: '12 por 8',
    });
  });

  it('edita o resultado salvo com PUT', async () => {
    const servicos = criarServicos({ resultados: [SALVO] });
    renderizar(servicos);

    const sono = await screen.findByLabelText('Registrar hábitos de sono.');
    await userEvent.clear(sono);
    await userEvent.type(sono, 'Dorme 6 horas.');
    await salvar();

    await screen.findByRole('heading', { name: /Histórico/ });
    expect(servicos.servicoAcompanhamento.editarResultado).toHaveBeenCalledExactlyOnceWith(3, 1, 4, 50, 'Dorme 6 horas.');
    expect(servicos.servicoAcompanhamento.registrarResultado).not.toHaveBeenCalled();
  });

  it('avisa quando não há nada para salvar', async () => {
    const servicos = criarServicos({ resultados: [SALVO] });
    renderizar(servicos);

    await screen.findByLabelText('Registrar hábitos de sono.');
    await salvar();

    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma alteração para salvar.');
    expect(servicos.servicoAcompanhamento.editarResultado).not.toHaveBeenCalled();
  });

  it('não deixa apagar um resultado salvo', async () => {
    const servicos = criarServicos({ resultados: [SALVO] });
    renderizar(servicos);

    await userEvent.clear(await screen.findByLabelText('Registrar hábitos de sono.'));
    await salvar();

    expect(screen.getByText('O resultado já registrado não pode ficar vazio.')).toBeInTheDocument();
    expect(campo('Registrar hábitos de sono.')).toHaveAttribute('aria-invalid', 'true');
    expect(servicos.servicoAcompanhamento.editarResultado).not.toHaveBeenCalled();
  });

  it('mostra no campo o erro de texto que vem da API', async () => {
    const erro = new ErroRequisicao(400, {
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: 'Dados inválidos.',
      errosCampos: { texto: 'O resultado pode ter até 1000 caracteres.' },
    });
    const servicos = criarServicos({ acompanhamento: { registrarResultado: vi.fn().mockRejectedValue(erro) } });
    renderizar(servicos);

    await userEvent.type(await screen.findByLabelText('Medir a pressão (fictício).'), 'Ok.');
    await salvar();

    expect(await screen.findByText('O resultado pode ter até 1000 caracteres.')).toBeInTheDocument();
    expect(campo('Medir a pressão (fictício).')).toHaveValue('Ok.');
    // Recarrega o que já ficou salvo
    expect(servicos.servicoAcompanhamento.listarResultados).toHaveBeenCalledTimes(2);
  });

  it('mostra o erro geral da API e mantém o que foi digitado', async () => {
    const erro = new ErroRequisicao(400, {
      codigo: 'ESTADO_ESTUDO_INVALIDO',
      mensagem: 'O estudo encerrado não aceita alterações.',
    });
    renderizar(criarServicos({ acompanhamento: { registrarResultado: vi.fn().mockRejectedValue(erro) } }));

    await userEvent.type(await screen.findByLabelText('Medir a pressão (fictício).'), 'Ok.');
    await salvar();

    expect(await screen.findByRole('alert')).toHaveTextContent('O estudo encerrado não aceita alterações.');
    expect(screen.getByRole('button', { name: 'Salvar resultados' })).toBeEnabled();
  });

  it('não abre o formulário em visita que não foi realizada', async () => {
    const servicos = criarServicos({
      acompanhamento: { obterVisita: vi.fn().mockResolvedValue({ ...VISITA, situacao: 'AGENDADA' }) },
    });
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Visita não realizada' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao histórico' })).toHaveAttribute(
      'href',
      '/estudos/3/participacoes/1/historico',
    );
  });

  it('em estudo encerrado só mostra os resultados, sem salvar', async () => {
    renderizar(criarServicos({ estudos: [{ ...ESTUDO, estado: 'ENCERRADO' }], resultados: [SALVO] }));

    expect(await screen.findByLabelText('Registrar hábitos de sono.')).toBeDisabled();
    expect(screen.getByText(/Estudo encerrado: os resultados podem ser consultados/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar resultados' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao histórico' })).toBeInTheDocument();
  });

  it('trata estudo fora da sessão como não encontrado, sem pedir a visita', async () => {
    const servicos = criarServicos({ estudos: [] });
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Visita não encontrada' })).toBeInTheDocument();
    expect(servicos.servicoAcompanhamento.obterVisita).not.toHaveBeenCalled();
  });

  it('trata o 404 da visita como não encontrado', async () => {
    const erro = new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Não encontrado.' });
    renderizar(criarServicos({ acompanhamento: { obterVisita: vi.fn().mockRejectedValue(erro) } }));

    expect(await screen.findByRole('heading', { name: 'Visita não encontrada' })).toBeInTheDocument();
  });

  it('mostra a falha de carregamento e tenta de novo', async () => {
    const obterVisita = vi.fn().mockRejectedValueOnce(new Error('rede')).mockResolvedValue(VISITA);
    renderizar(criarServicos({ acompanhamento: { obterVisita } }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a visita.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => expect(screen.getByLabelText('Medir a pressão (fictício).')).toBeInTheDocument());
    expect(obterVisita).toHaveBeenCalledTimes(2);
  });
});
