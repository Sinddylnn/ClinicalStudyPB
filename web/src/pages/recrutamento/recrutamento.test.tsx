import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Candidato, ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import NovoCandidato from './NovoCandidato';
import Recrutamento from './Recrutamento';

// <-------------------TESTES DAS TELAS DE RECRUTAMENTO------------------->
const COORDENADOR: UsuarioSessao = {
  id: 3,
  nome: 'Carlos Coordenador',
  email: 'carlos.coordenador@exemplo.com',
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
  responsavelNome: 'Paula Pesquisadora',
};

function candidato(parcial: Partial<Candidato> & Pick<Candidato, 'id' | 'nome' | 'email'>): Candidato {
  return {
    estudoId: 3,
    elegibilidade: 'NAO_AVALIADO',
    consentimento: 'PENDENTE',
    dataInclusao: null,
    ...parcial,
  };
}

const CANDIDATOS: Candidato[] = [
  candidato({
    id: 1,
    nome: 'Maria Souza',
    email: 'maria@exemplo.com',
    elegibilidade: 'ELEGIVEL',
    consentimento: 'ACEITOU',
    dataInclusao: '2026-10-28',
  }),
  candidato({ id: 2, nome: 'Bruno Martins', email: 'bruno@exemplo.com', elegibilidade: 'ELEGIVEL', consentimento: 'ACEITOU' }),
  candidato({ id: 3, nome: 'Camila Ferreira', email: 'camila@exemplo.com', elegibilidade: 'ELEGIVEL', consentimento: 'RECUSOU' }),
  candidato({ id: 4, nome: 'Felipe Souza', email: 'felipe@exemplo.com' }),
];

function criarServicos(estudo: Estudo = ESTUDO, candidatos: Partial<ServicoCandidatos> = {}) {
  const estudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue([estudo]),
    cadastrar: vi.fn(),
  };
  const servicoCandidatos: ServicoCandidatos = {
    listar: vi.fn().mockResolvedValue(CANDIDATOS),
    cadastrar: vi.fn().mockResolvedValue(candidato({ id: 9, nome: 'Gabriel Rocha', email: 'gabriel@exemplo.com' })),
    ...candidatos,
  };
  return { estudos, candidatos: servicoCandidatos };
}

function renderizar(servicos: ReturnType<typeof criarServicos>, caminho = '/estudos/3/recrutamento') {
  const props = { servicoEstudos: servicos.estudos, servicoCandidatos: servicos.candidatos, usuario: COORDENADOR };
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/estudos/:id/recrutamento" element={<Recrutamento {...props} />} />
        <Route path="/estudos/:id/candidatos/novo" element={<NovoCandidato {...props} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Recrutamento', () => {
  it('mostra o estudo, os indicadores e os candidatos com a próxima etapa', async () => {
    renderizar(criarServicos());

    expect(await screen.findByRole('heading', { name: 'Acompanhamento de hábitos' })).toBeInTheDocument();
    const resumo = screen.getByRole('list', { name: 'Resumo do recrutamento' });
    expect(within(resumo).getByText('Candidatos').nextSibling).toHaveTextContent('4');
    expect(within(resumo).getByText('Elegíveis').nextSibling).toHaveTextContent('3');
    expect(within(resumo).getByText('Incluídos').nextSibling).toHaveTextContent('1 de 30');
    expect(within(resumo).getByText('Vagas restantes').nextSibling).toHaveTextContent('29');

    const maria = screen.getByText('Maria Souza').closest('tr')!;
    expect(within(maria).getByText('Incluído em 28/10/2026')).toBeInTheDocument();
    const bruno = screen.getByText('Bruno Martins').closest('tr')!;
    expect(within(bruno).getByRole('button', { name: 'Incluir' })).toBeDisabled();
    const camila = screen.getByText('Camila Ferreira').closest('tr')!;
    expect(within(camila).getByText('Recusou')).toBeInTheDocument();
    expect(within(camila).getByRole('button', { name: 'Ver bloqueio' })).toBeInTheDocument();
    const felipe = screen.getByText('Felipe Souza').closest('tr')!;
    expect(within(felipe).getByText('Não avaliado')).toBeInTheDocument();
    expect(within(felipe).getByRole('button', { name: 'Avaliar' })).toBeInTheDocument();

    expect(screen.getByText('Mostrando 4 candidatos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo candidato' })).toHaveAttribute(
      'href',
      '/estudos/3/candidatos/novo',
    );
  });

  it('filtra por nome ou e-mail', async () => {
    renderizar(criarServicos());
    await screen.findByText('Maria Souza');

    await userEvent.type(screen.getByLabelText('Buscar por nome ou e-mail'), 'camila@');
    expect(screen.getByText('Camila Ferreira')).toBeInTheDocument();
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 candidato')).toBeInTheDocument();
  });

  it('mostra o estado vazio com o cadastro do primeiro candidato', async () => {
    renderizar(criarServicos(ESTUDO, { listar: vi.fn().mockResolvedValue([]) }));

    expect(await screen.findByRole('heading', { name: 'Nenhum candidato cadastrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar candidato' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Novo candidato' })).not.toBeInTheDocument();
  });

  it('não permite cadastrar fora do estado Recrutamento', async () => {
    renderizar(criarServicos({ ...ESTUDO, estado: 'PLANEJAMENTO' }, { listar: vi.fn().mockResolvedValue([]) }));

    expect(await screen.findByText(/só ficam disponíveis com o estudo em Recrutamento/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Cadastrar candidato' })).not.toBeInTheDocument();
  });

  it('mostra "não encontrado" para estudo fora do escopo do coordenador', async () => {
    renderizar(criarServicos(), '/estudos/99/recrutamento');

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
  });

  it('mostra o erro de carregamento e tenta de novo', async () => {
    const listar = vi
      .fn()
      .mockRejectedValueOnce(new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Sem conexão.' }))
      .mockResolvedValue(CANDIDATOS);
    renderizar(criarServicos(ESTUDO, { listar }));

    expect(await screen.findByText('Sem conexão.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
  });
});

describe('NovoCandidato', () => {
  it('valida os campos antes de enviar', async () => {
    const servicos = criarServicos();
    renderizar(servicos, '/estudos/3/candidatos/novo');

    await userEvent.type(screen.getByLabelText('E-mail'), 'sem-arroba');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar candidato' }));

    expect(screen.getByText('Revise os campos destacados antes de cadastrar.')).toBeInTheDocument();
    expect(screen.getByText('Informe o nome do candidato.')).toBeInTheDocument();
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-invalid', 'true');
    expect(servicos.candidatos.cadastrar).not.toHaveBeenCalled();
  });

  it('cadastra e volta à lista com a notificação', async () => {
    const servicos = criarServicos();
    renderizar(servicos, '/estudos/3/candidatos/novo');

    await userEvent.type(screen.getByLabelText('Nome completo'), '  Gabriel Rocha ');
    await userEvent.type(screen.getByLabelText('E-mail'), 'gabriel@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar candidato' }));

    expect(servicos.candidatos.cadastrar).toHaveBeenCalledWith(3, {
      nome: 'Gabriel Rocha',
      email: 'gabriel@exemplo.com',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Candidato cadastrado.');
    expect(await screen.findByRole('heading', { name: 'Acompanhamento de hábitos' })).toBeInTheDocument();
  });

  it('mostra o e-mail repetido no estudo no campo', async () => {
    const cadastrar = vi.fn().mockRejectedValue(
      new ErroRequisicao(409, {
        codigo: 'EMAIL_JA_CADASTRADO',
        mensagem: 'Já existe um candidato com este e-mail neste estudo.',
      }),
    );
    renderizar(criarServicos(ESTUDO, { cadastrar }), '/estudos/3/candidatos/novo');

    await userEvent.type(screen.getByLabelText('Nome completo'), 'Outra Maria');
    await userEvent.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar candidato' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe um candidato com este e-mail neste estudo.',
    );
    expect(screen.getByText('Este e-mail já está cadastrado como candidato neste estudo.')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('volta para o recrutamento ao cancelar', async () => {
    renderizar(criarServicos(), '/estudos/3/candidatos/novo');
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/estudos/3/recrutamento');
  });
});
