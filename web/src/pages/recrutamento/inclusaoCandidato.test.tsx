import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Candidato, DadosInclusao, ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import InclusaoCandidato from './InclusaoCandidato';

// <-------------------TESTES DA INCLUSÃO------------------->
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
};

const CANDIDATO: Candidato = {
  id: 2,
  estudoId: 3,
  nome: 'Bruno Martins',
  email: 'bruno.martins@exemplo.com',
  elegibilidade: 'ELEGIVEL',
  consentimento: 'ACEITOU',
  dataInclusao: null,
};

const DADOS: DadosInclusao = {
  candidato: CANDIDATO,
  avaliadoEm: '2026-10-27T09:40:00',
  consentimentoEm: '2026-10-27T14:40:00',
  incluidos: 1,
  contas: [
    { id: 11, nome: 'Bruno M.', email: 'bruno.m@exemplo.com' },
    { id: 12, nome: 'Bruno Martins', email: 'bruno.martins@exemplo.com' },
  ],
};

function criarServicos(
  dados: DadosInclusao = DADOS,
  parcial: Partial<ServicoCandidatos> = {},
  estudo: Estudo = ESTUDO,
) {
  const estudos: ServicoEstudos = { listar: vi.fn().mockResolvedValue([estudo]), cadastrar: vi.fn() };
  const candidatos: ServicoCandidatos = {
    listar: vi.fn(),
    cadastrar: vi.fn(),
    obterElegibilidade: vi.fn(),
    avaliarElegibilidade: vi.fn(),
    obterConsentimento: vi.fn(),
    registrarConsentimento: vi.fn(),
    obterInclusao: vi.fn().mockResolvedValue(dados),
    incluir: vi.fn().mockResolvedValue({ ...CANDIDATO, dataInclusao: '2026-10-30' }),
    ...parcial,
  };
  return { estudos, candidatos };
}

function ListaFalsa() {
  const location = useLocation();
  return <p>Lista do recrutamento: {location.state?.aviso}</p>;
}

function renderizar(servicos: ReturnType<typeof criarServicos>) {
  render(
    <MemoryRouter initialEntries={['/estudos/3/candidatos/2/inclusao']}>
      <Routes>
        <Route
          path="/estudos/:id/candidatos/:candidatoId/inclusao"
          element={
            <InclusaoCandidato
              servicoEstudos={servicos.estudos}
              servicoCandidatos={servicos.candidatos}
              usuario={COORDENADOR}
            />
          }
        />
        <Route path="/estudos/:id/recrutamento" element={<ListaFalsa />} />
      </Routes>
    </MemoryRouter>,
  );
}

const quadro = () => screen.findByRole('complementary', { name: 'Condições para inclusão' });
const botaoIncluir = () => screen.getByRole('button', { name: 'Incluir participante' });

describe('InclusaoCandidato', () => {
  it('sugere a conta com o e-mail do candidato e libera com as seis condições atendidas', async () => {
    renderizar(criarServicos());

    const condicoes = await quadro();
    expect(screen.getByText('Bruno Martins • bruno.martins@exemplo.com', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByLabelText('Conta')).toHaveValue('12');
    expect(within(condicoes).getByText('Tudo certo')).toBeInTheDocument();
    expect(within(condicoes).getAllByRole('img', { name: 'Atendida' })).toHaveLength(6);
    expect(within(condicoes).getByText('1 de 30 vagas preenchidas')).toBeInTheDocument();
    expect(botaoIncluir()).toBeEnabled();
  });

  it('inclui e volta à lista com o aviso', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await quadro();

    await userEvent.click(botaoIncluir());

    expect(
      await screen.findByText('Lista do recrutamento: Bruno Martins foi incluído como participante.'),
    ).toBeInTheDocument();
    expect(servicos.candidatos.incluir).toHaveBeenCalledWith(3, 2, { contaId: 12 });
  });

  it('bloqueia a conta com e-mail diferente', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await quadro();

    await userEvent.selectOptions(screen.getByLabelText('Conta'), '11');

    expect(screen.getByText('O e-mail desta conta é diferente do e-mail do candidato.')).toBeInTheDocument();
    expect(screen.getByText('Conta: bruno.m@exemplo.com • Candidato: bruno.martins@exemplo.com')).toBeInTheDocument();
    expect(botaoIncluir()).toBeDisabled();
  });

  it('bloqueia o consentimento recusado e leva à correção', async () => {
    renderizar(
      criarServicos({
        ...DADOS,
        candidato: { ...CANDIDATO, consentimento: 'RECUSOU' },
      }),
    );

    const condicoes = await quadro();
    expect(within(condicoes).getByText('Bloqueada')).toBeInTheDocument();
    expect(within(condicoes).getByRole('img', { name: 'Não atendida' })).toBeInTheDocument();
    expect(within(condicoes).getByText('Consentimento: recusou')).toBeInTheDocument();
    expect(botaoIncluir()).toBeDisabled();
    expect(within(condicoes).getByRole('link', { name: 'Corrigir consentimento' })).toHaveAttribute(
      'href',
      '/estudos/3/candidatos/2/consentimento',
    );
    expect(within(condicoes).getByRole('link', { name: 'Rever avaliação' })).toHaveAttribute(
      'href',
      '/estudos/3/candidatos/2/elegibilidade',
    );
  });

  it('avisa quando não há conta de participante disponível', async () => {
    renderizar(criarServicos({ ...DADOS, contas: [] }));

    await quadro();
    expect(
      screen.getByText('Nenhuma conta disponível: o administrador precisa cadastrar a conta antes.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Escolha a conta de participante')).toBeInTheDocument();
    expect(botaoIncluir()).toBeDisabled();
  });

  it('mostra o limite atingido e atualiza as vagas sem perder a conta', async () => {
    const erro = new ErroRequisicao(409, {
      codigo: 'LIMITE_ATINGIDO',
      mensagem: 'Não foi possível incluir: as 30 vagas do estudo já foram preenchidas.',
    });
    const obterInclusao = vi.fn().mockResolvedValueOnce(DADOS).mockResolvedValue({ ...DADOS, incluidos: 30 });
    renderizar(criarServicos(DADOS, { incluir: vi.fn().mockRejectedValue(erro), obterInclusao }));
    await quadro();

    await userEvent.click(botaoIncluir());

    expect(await screen.findByRole('alert')).toHaveTextContent('as 30 vagas do estudo já foram preenchidas');
    expect(await screen.findByText('30 de 30 vagas preenchidas')).toBeInTheDocument();
    expect(screen.getByLabelText('Conta')).toHaveValue('12');
    expect(botaoIncluir()).toBeDisabled();
  });

  it('mantém o erro quando a atualização também falha', async () => {
    const obterInclusao = vi.fn().mockResolvedValueOnce(DADOS).mockRejectedValue(new Error('falha'));
    renderizar(criarServicos(DADOS, { incluir: vi.fn().mockRejectedValue(new Error('falha')), obterInclusao }));
    await quadro();

    await userEvent.click(botaoIncluir());

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível incluir o participante.');
  });

  it('fica só para consulta depois da inclusão', async () => {
    renderizar(criarServicos({ ...DADOS, candidato: { ...CANDIDATO, dataInclusao: '2026-10-28' } }));

    const condicoes = await quadro();
    expect(within(condicoes).getByText('Incluído em 28/10/2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Incluir participante' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Conta')).toBeDisabled();
    expect(within(condicoes).queryByRole('link', { name: 'Corrigir consentimento' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao recrutamento' })).toHaveAttribute('href', '/estudos/3/recrutamento');
  });

  it('bloqueia o estudo fora de recrutamento', async () => {
    renderizar(criarServicos(DADOS, {}, { ...ESTUDO, estado: 'EXECUCAO' }));

    const condicoes = await quadro();
    expect(within(condicoes).getByText('Estado atual: Execução')).toBeInTheDocument();
    expect(botaoIncluir()).toBeDisabled();
  });

  it('mostra "não encontrado" para estudo fora da sessão, sem pedir os dados', async () => {
    const servicos = criarServicos();
    vi.mocked(servicos.estudos.listar).mockResolvedValue([]);
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Candidato não encontrado' })).toBeInTheDocument();
    expect(servicos.candidatos.obterInclusao).not.toHaveBeenCalled();
  });

  it('trata o 404 do candidato como "não encontrado"', async () => {
    const erro = new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Candidato não encontrado.' });
    renderizar(criarServicos(DADOS, { obterInclusao: vi.fn().mockRejectedValue(erro) }));

    expect(await screen.findByRole('heading', { name: 'Candidato não encontrado' })).toBeInTheDocument();
  });

  it('tenta carregar de novo depois de um erro', async () => {
    const obterInclusao = vi.fn().mockRejectedValueOnce(new Error('falha')).mockResolvedValue(DADOS);
    renderizar(criarServicos(DADOS, { obterInclusao }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a inclusão.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await quadro()).toBeInTheDocument();
  });
});
