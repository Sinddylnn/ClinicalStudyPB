import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import ListaEstudos from './ListaEstudos';
import NovoEstudo from './NovoEstudo';

// <-------------------TESTES DAS TELAS DE ESTUDOS------------------->
const PESQUISADORA: UsuarioSessao = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula.pesquisadora@exemplo.com',
  perfil: 'PESQUISADOR',
};

const COORDENADOR: UsuarioSessao = {
  id: 3,
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
    coordenadorId: 3,
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
    coordenadorId: null,
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
        <Route path="/estudos" element={<ListaEstudos servico={servico} usuario={PESQUISADORA} />} />
        <Route path="/estudos/novo" element={<NovoEstudo servico={servico} usuario={PESQUISADORA} />} />
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

  it('mostra ao coordenador os estudos vinculados, com link para o recrutamento', async () => {
    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <ListaEstudos servico={criarServico()} usuario={COORDENADOR} />
      </MemoryRouter>,
    );
    const linha = (await screen.findByText('Hábitos alimentares')).closest('tr')!;
    expect(screen.getByRole('heading', { name: 'Estudos' })).toBeInTheDocument();
    expect(screen.getByText('Estudos vinculados a você como coordenador.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hábitos alimentares' })).toHaveAttribute('href', '/estudos/1/recrutamento');
    expect(screen.queryByRole('link', { name: 'Novo estudo' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filtrar por estado')).not.toBeInTheDocument();
    expect(within(linha).getByText('Paula Pesquisadora')).toBeInTheDocument();
    expect(within(linha).getByText('40 vagas')).toBeInTheDocument();
  });

  it('mostra o número do responsável quando a API não envia o nome', async () => {
    const semNome = ESTUDOS.map((estudo) => ({ ...estudo, responsavelNome: undefined }));
    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <ListaEstudos servico={criarServico({ listar: vi.fn().mockResolvedValue(semNome) })} usuario={COORDENADOR} />
      </MemoryRouter>,
    );
    const linha = (await screen.findByText('Hábitos alimentares')).closest('tr')!;
    expect(within(linha).getByText('Pesquisador nº 2')).toBeInTheDocument();
    // Sem o nome não há iniciais, então não aparece avatar com "?"
    expect(within(linha).queryByText('?')).not.toBeInTheDocument();
  });

  it('mostra à pesquisadora o subtítulo dos próprios estudos', async () => {
    renderizar(criarServico());
    await screen.findByText('Hábitos alimentares');
    expect(screen.getByText('Estudos sob sua responsabilidade.')).toBeInTheDocument();
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

  it('mostra ao coordenador sem vínculos o estado vazio sem cadastro', async () => {
    render(
      <MemoryRouter initialEntries={['/estudos']}>
        <ListaEstudos servico={criarServico({ listar: vi.fn().mockResolvedValue([]) })} usuario={COORDENADOR} />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Nenhum estudo vinculado a você')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cadastrar primeiro estudo' })).not.toBeInTheDocument();
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

  it('mostra o carregamento enquanto a API não responde', async () => {
    let responder: (estudos: Estudo[]) => void = () => {};
    const listar = vi.fn(() => new Promise<Estudo[]>((resolver) => (responder = resolver)));
    renderizar(criarServico({ listar }));

    expect(screen.getByText('Carregando estudos…')).toBeInTheDocument();
    responder(ESTUDOS);
    expect(await screen.findByText('Hábitos alimentares')).toBeInTheDocument();
    expect(screen.queryByText('Carregando estudos…')).not.toBeInTheDocument();
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

  it('aceita início e término no mesmo dia', async () => {
    const servico = criarServico();
    renderizar(servico, '/estudos/novo');
    const usuario = await preencher({ ...FORMULARIO_VALIDO, 'Data de término': '2026-12-01' });

    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    await waitFor(() =>
      expect(servico.cadastrar).toHaveBeenCalledWith(
        expect.objectContaining({ dataInicio: '2026-12-01', dataFim: '2026-12-01' }),
      ),
    );
    expect(screen.queryByText('A data final deve ser igual ou posterior à inicial.')).not.toBeInTheDocument();
  });

  it('atualiza a listagem com o estudo cadastrado', async () => {
    const novo: Estudo = {
      id: 3,
      titulo: 'Novo estudo',
      objetivo: 'Objetivo do estudo.',
      dataInicio: '2026-12-01',
      dataFim: '2027-03-01',
      limiteParticipantes: 25,
      estado: 'PLANEJAMENTO',
      responsavelId: 2,
      coordenadorId: null,
    };
    // A API passa a devolver o estudo novo depois do cadastro
    let salvos: Estudo[] = [];
    const servico = criarServico({
      listar: vi.fn(async () => salvos),
      cadastrar: vi.fn(async () => {
        salvos = [novo];
        return novo;
      }),
    });
    renderizar(servico, '/estudos');
    expect(await screen.findByText('Nenhum estudo cadastrado ainda')).toBeInTheDocument();

    const usuario = userEvent.setup();
    await usuario.click(screen.getByRole('link', { name: 'Novo estudo' }));
    await preencher(FORMULARIO_VALIDO);
    await usuario.click(screen.getByRole('button', { name: 'Salvar estudo' }));

    const linha = (await screen.findByText('Novo estudo', { selector: 'td *' })).closest('tr')!;
    expect(linha).toHaveClass('estudos-linha-nova');
    expect(within(linha).getByText('0 de 25 incluídos')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 1 estudo')).toBeInTheDocument();
    expect(servico.listar).toHaveBeenCalledTimes(2);
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
