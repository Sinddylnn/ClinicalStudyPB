import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/sessaoSimulada';
import ListaEstudos from './ListaEstudos';
import NovoEstudo from './NovoEstudo';

// <-------------------TESTES DAS TELAS DE ESTUDOS------------------->
const COORDENADOR: UsuarioSessao = {
  nome: 'Carlos Coordenador',
  email: 'carlos.coordenador@exemplo.com',
  perfil: 'COORDENADOR',
};

const ESTUDOS: Estudo[] = [
  {
    id: 1,
    titulo: 'Hábitos alimentares',
    objetivo: 'Objetivo A.',
    dataInicio: '2026-11-03',
    dataFim: '2027-05-03',
    limiteParticipantes: 40,
    estado: 'PLANEJAMENTO',
    responsavelId: 2,
    responsavelNome: 'Paula Pesquisadora',
  },
  {
    id: 2,
    titulo: 'Qualidade do sono',
    objetivo: 'Objetivo B.',
    dataInicio: '2026-10-01',
    dataFim: '2027-02-28',
    limiteParticipantes: 60,
    estado: 'RECRUTAMENTO',
    responsavelId: 2,
    responsavelNome: 'Paula Pesquisadora',
  },
];

function criarServico(parcial: Partial<ServicoEstudos> = {}): ServicoEstudos {
  return {
    listar: vi.fn().mockResolvedValue(ESTUDOS),
    cadastrar: vi.fn().mockResolvedValue(ESTUDOS[0]),
    ...parcial,
  };
}

function renderizar(servico: ServicoEstudos, caminho = '/estudos') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/estudos" element={<ListaEstudos servico={servico} />} />
        <Route path="/estudos/novo" element={<NovoEstudo servico={servico} />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function preencher(campos: Record<string, string>) {
  const usuario = userEvent.setup();
  for (const [rotulo, valor] of Object.entries(campos)) {
    const campo = screen.getByLabelText(rotulo);
    await usuario.clear(campo);
    await usuario.type(campo, valor);
  }
  return usuario;
}

const FORMULARIO_VALIDO = {
  Título: 'Novo estudo',
  Objetivo: 'Objetivo do estudo.',
  'Data de início': '2026-12-01',
  'Data de término': '2027-03-01',
  'Limite de participantes': '25',
};

describe('ListaEstudos', () => {
  it('mostra os estudos com período, participantes e estado', async () => {
    renderizar(criarServico());
    const linha = (await screen.findByText('Hábitos alimentares')).closest('tr')!;
    expect(within(linha).getByText('03/11/2026 – 03/05/2027')).toBeInTheDocument();
    expect(within(linha).getByText('0 de 40 incluídos')).toBeInTheDocument();
    expect(within(linha).getByText('Planejamento')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–2 de 2 estudos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo estudo' })).toHaveAttribute('href', '/estudos/novo');
  });

  it('mostra ao coordenador todos os estudos, somente leitura', async () => {
    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <ListaEstudos servico={criarServico()} usuario={COORDENADOR} />
      </MemoryRouter>,
    );
    const linha = (await screen.findByText('Hábitos alimentares')).closest('tr')!;
    expect(screen.getByRole('heading', { name: 'Estudos' })).toBeInTheDocument();
    expect(screen.getByText('Somente leitura')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo estudo' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar por estado')).not.toBeInTheDocument();
    expect(within(linha).getByText('Paula Pesquisadora')).toBeInTheDocument();
    expect(within(linha).getByText('40 vagas')).toBeInTheDocument();
  });

  it('busca pelo responsável na lista do coordenador', async () => {
    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <ListaEstudos servico={criarServico()} usuario={COORDENADOR} />
      </MemoryRouter>,
    );
    await screen.findByText('Hábitos alimentares');
    await userEvent.setup().type(screen.getByLabelText('Buscar por título ou responsável'), 'paula');
    expect(screen.getByText('Mostrando 1–2 de 2 estudos')).toBeInTheDocument();
  });

  it('filtra por título e por estado', async () => {
    renderizar(criarServico());
    const usuario = userEvent.setup();
    await screen.findByText('Hábitos alimentares');

    await usuario.type(screen.getByLabelText('Buscar por título'), 'sono');
    expect(screen.queryByText('Hábitos alimentares')).not.toBeInTheDocument();
    expect(screen.getByText('Qualidade do sono')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Filtrar por estado'), 'PLANEJAMENTO');
    expect(screen.getByText('Nenhum estudo encontrado com esses filtros.')).toBeInTheDocument();
  });

  it('mostra o estado vazio', async () => {
    renderizar(criarServico({ listar: vi.fn().mockResolvedValue([]) }));
    expect(await screen.findByText('Nenhum estudo cadastrado ainda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar primeiro estudo' })).toBeInTheDocument();
  });

  it('mostra o erro e tenta de novo', async () => {
    const listar = vi
      .fn()
      .mockRejectedValueOnce(new ErroRequisicao(500, { codigo: 'ERRO_INTERNO', mensagem: 'Falhou.' }))
      .mockResolvedValueOnce(ESTUDOS);
    renderizar(criarServico({ listar }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falhou.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Hábitos alimentares')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });
});

describe('NovoEstudo', () => {
  it('mostra os erros dos campos sem chamar o serviço', async () => {
    const servico = criarServico();
    renderizar(servico, '/estudos/novo');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar estudo' }));

    expect(screen.getByText('Informe o título.')).toBeInTheDocument();
    expect(screen.getByText('Informe o limite de participantes.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Confira os campos informados.');
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true');
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('acusa o período inválido na data de fim', async () => {
    const servico = criarServico();
    renderizar(servico, '/estudos/novo');
    const usuario = await preencher({ ...FORMULARIO_VALIDO, 'Data de término': '2026-11-01' });

    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    expect(screen.getByText('A data final deve ser igual ou posterior à inicial.')).toBeInTheDocument();
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('cadastra e volta para a lista com aviso', async () => {
    const servico = criarServico();
    renderizar(servico, '/estudos/novo');
    const usuario = await preencher(FORMULARIO_VALIDO);

    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Estudo cadastrado em Planejamento.');
    expect((await screen.findByText('Hábitos alimentares')).closest('tr')).toHaveClass('estudos-linha-nova');
    expect(servico.cadastrar).toHaveBeenCalledWith({
      titulo: 'Novo estudo',
      objetivo: 'Objetivo do estudo.',
      dataInicio: '2026-12-01',
      dataFim: '2027-03-01',
      limiteParticipantes: 25,
    });
  });

  it('mostra nos campos os erros devolvidos pelo backend', async () => {
    const cadastrar = vi.fn().mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'VALIDACAO_INVALIDA',
        mensagem: 'Confira os campos informados.',
        errosCampos: { titulo: 'Título recusado pelo servidor.' },
      }),
    );
    renderizar(criarServico({ cadastrar }), '/estudos/novo');
    const usuario = await preencher(FORMULARIO_VALIDO);

    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    expect(await screen.findByText('Título recusado pelo servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar estudo' })).toBeEnabled();
  });

  it('mostra DATA_INVALIDA do backend na data de fim', async () => {
    const cadastrar = vi.fn().mockRejectedValue(
      new ErroRequisicao(400, { codigo: 'DATA_INVALIDA', mensagem: 'Período recusado.' }),
    );
    renderizar(criarServico({ cadastrar }), '/estudos/novo');
    const usuario = await preencher(FORMULARIO_VALIDO);

    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Data de término')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.getByText('Período recusado.')).toBeInTheDocument();
  });

  it('mostra erro geral quando o servidor falha', async () => {
    const cadastrar = vi.fn().mockRejectedValue(
      new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Sem conexão.' }),
    );
    renderizar(criarServico({ cadastrar }), '/estudos/novo');
    const usuario = await preencher(FORMULARIO_VALIDO);

    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão.');
  });
});
