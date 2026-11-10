import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { Coordenador, Estudo, ServicoCoordenadores, ServicoEstudos } from '../../api/estudos';
import type { Protocolo, ServicoProtocolo } from '../../api/protocolo';
import ProtocoloEstudo from './ProtocoloEstudo';

// <-------------------TESTES DA SEÇÃO COORDENADOR------------------->
const PESQUISADORA: UsuarioSessao = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula.pesquisadora@exemplo.com',
  perfil: 'PESQUISADOR',
};

const ESTUDO: Estudo = {
  id: 1,
  titulo: 'Sono e rotina de estudantes',
  objetivo: 'Objetivo.',
  dataInicio: '2026-11-03',
  dataFim: '2027-02-28',
  limiteParticipantes: 45,
  estado: 'PLANEJAMENTO',
  responsavelId: 2,
  coordenadorId: null,
};

const PROTOCOLO: Protocolo = {
  estudoId: 1,
  criteriosInclusao: [{ id: 1, descricao: 'Adultos.' }],
  criteriosExclusao: [],
  semCriteriosExclusao: true,
  visitas: [],
};

const COORDENADORES: Coordenador[] = [
  { id: 6, nome: 'Bianca Coordenadora' },
  { id: 3, nome: 'Carlos Coordenador' },
];

// Por padrão, o "backend" aceita a escolha e devolve o estudo com o novo coordenador
function criarServicos(estudo: Estudo = ESTUDO, parcial: Partial<ServicoCoordenadores> = {}) {
  const estudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue([estudo]),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const protocolo = {
    recursos: { editarRemover: true },
    obter: vi.fn().mockResolvedValue(PROTOCOLO),
  } as unknown as ServicoProtocolo;
  const coordenadores: ServicoCoordenadores = {
    listar: vi.fn().mockResolvedValue(COORDENADORES),
    atribuir: vi
      .fn()
      .mockImplementation((_id: number, coordenadorId: number) => Promise.resolve({ ...estudo, coordenadorId })),
    ...parcial,
  };
  return { estudos, protocolo, coordenadores };
}

async function renderizar(servicos: ReturnType<typeof criarServicos>) {
  render(
    <MemoryRouter initialEntries={['/estudos/1']}>
      <Routes>
        <Route
          path="/estudos/:id"
          element={
            <ProtocoloEstudo
              servicoEstudos={servicos.estudos}
              servicoProtocolo={servicos.protocolo}
              servicoCoordenadores={servicos.coordenadores}
              usuario={PESQUISADORA}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1 });
}

const secao = () => screen.getByRole('region', { name: 'Coordenador' });

const quadro = () => screen.getByRole('complementary', { name: 'Para iniciar o recrutamento' });

const opcoes = () =>
  within(secao())
    .getAllByRole('option')
    .map((o) => o.textContent);

describe('ProtocoloEstudo: seção Coordenador', () => {
  it('atribui o primeiro coordenador e tira a pendência do recrutamento', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    expect(within(secao()).getByText(/Nenhum coordenador atribuído/)).toBeInTheDocument();
    const seletor = await within(secao()).findByLabelText('Coordenador');
    expect(opcoes()).toEqual(['Selecione o coordenador', 'Bianca Coordenadora', 'Carlos Coordenador']);
    expect(seletor).toHaveAccessibleDescription('Só aparecem contas ativas com perfil Coordenador.');
    const botao = within(secao()).getByRole('button', { name: 'Atribuir coordenador' });
    expect(botao).toBeDisabled();
    expect(within(quadro()).getAllByRole('listitem')[3]).toHaveClass('protocolo-requisito-pendente');

    await usuario.selectOptions(seletor, 'Carlos Coordenador');
    await usuario.click(botao);

    expect(servicos.coordenadores.atribuir).toHaveBeenCalledWith(1, 3);
    expect(await screen.findByText('Coordenador atribuído.')).toBeInTheDocument();
    expect(within(secao()).getByText('Carlos Coordenador')).toBeInTheDocument();
    expect(within(quadro()).getAllByRole('listitem')[3]).toHaveTextContent('Atendido: Coordenador atribuído');
    // Depois da atribuição, a seção passa a oferecer a troca, sem repetir o atual
    expect(within(secao()).getByLabelText('Trocar por')).toHaveValue('');
    expect(opcoes()).toEqual(['Selecione o coordenador', 'Bianca Coordenadora']);
    expect(within(secao()).getByRole('button', { name: 'Trocar coordenador' })).toBeDisabled();
  });

  it('troca o coordenador em recrutamento e avisa que ele assume os candidatos', async () => {
    const servicos = criarServicos({ ...ESTUDO, estado: 'RECRUTAMENTO', coordenadorId: 3 });
    await renderizar(servicos);
    const usuario = userEvent.setup();

    expect(await within(secao()).findByText('Carlos Coordenador')).toBeInTheDocument();
    const seletor = within(secao()).getByLabelText('Trocar por');
    expect(seletor).toHaveAccessibleDescription('O novo coordenador passa a cuidar dos candidatos já cadastrados.');

    await usuario.selectOptions(seletor, 'Bianca Coordenadora');
    await usuario.click(within(secao()).getByRole('button', { name: 'Trocar coordenador' }));

    expect(servicos.coordenadores.atribuir).toHaveBeenCalledWith(1, 6);
    expect(await within(secao()).findByText('Bianca Coordenadora', { selector: 'strong' })).toBeInTheDocument();
  });

  it('mostra a recusa do backend e mantém o coordenador anterior', async () => {
    const atribuir = vi.fn().mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'COORDENADOR_INVALIDO',
        mensagem: 'Escolha uma conta ativa com perfil de coordenador.',
      }),
    );
    await renderizar(criarServicos(ESTUDO, { atribuir }));
    const usuario = userEvent.setup();

    await usuario.selectOptions(await within(secao()).findByLabelText('Coordenador'), 'Bianca Coordenadora');
    await usuario.click(within(secao()).getByRole('button', { name: 'Atribuir coordenador' }));

    expect(await within(secao()).findByRole('alert')).toHaveTextContent(
      'Escolha uma conta ativa com perfil de coordenador.',
    );
    expect(within(secao()).getByText(/Nenhum coordenador atribuído/)).toBeInTheDocument();
    expect(screen.queryByText('Coordenador atribuído.')).not.toBeInTheDocument();

    // Escolher de novo limpa o aviso
    await usuario.selectOptions(within(secao()).getByLabelText('Coordenador'), 'Carlos Coordenador');
    expect(within(secao()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explica quando não há conta de coordenador ativa', async () => {
    await renderizar(criarServicos(ESTUDO, { listar: vi.fn().mockResolvedValue([]) }));

    const seletor = await within(secao()).findByLabelText('Coordenador');
    expect(seletor).toBeDisabled();
    expect(seletor).toHaveAccessibleDescription(
      'Nenhum coordenador ativo: o administrador precisa cadastrar uma conta de coordenador.',
    );
  });

  it('avisa quando não há outro coordenador para a troca', async () => {
    await renderizar(
      criarServicos({ ...ESTUDO, coordenadorId: 3 }, { listar: vi.fn().mockResolvedValue([COORDENADORES[1]]) }),
    );

    const seletor = await within(secao()).findByLabelText('Trocar por');
    expect(seletor).toBeDisabled();
    expect(seletor).toHaveAccessibleDescription('Não há outro coordenador ativo para a troca.');
  });

  it('mostra o número quando a conta atual não está mais entre as ativas', async () => {
    await renderizar(criarServicos({ ...ESTUDO, coordenadorId: 8 }));

    expect(await within(secao()).findByText('Coordenador nº 8')).toBeInTheDocument();
    expect(opcoes()).toEqual(['Selecione o coordenador', 'Bianca Coordenadora', 'Carlos Coordenador']);
  });

  it('não permite alterar o coordenador de estudo encerrado', async () => {
    await renderizar(criarServicos({ ...ESTUDO, estado: 'ENCERRADO', coordenadorId: 3 }));

    expect(await within(secao()).findByText('Carlos Coordenador')).toBeInTheDocument();
    expect(within(secao()).getByText('Estudo encerrado: o coordenador não pode mais ser alterado.')).toBeInTheDocument();
    expect(within(secao()).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(secao()).queryByRole('button')).not.toBeInTheDocument();
  });

  it('avisa quando a lista de coordenadores não carrega', async () => {
    await renderizar(criarServicos(ESTUDO, { listar: vi.fn().mockRejectedValue(new Error('rede')) }));

    expect(await within(secao()).findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os coordenadores. Recarregue a página para tentar de novo.',
    );
    expect(within(secao()).queryByRole('combobox')).not.toBeInTheDocument();
  });
});
