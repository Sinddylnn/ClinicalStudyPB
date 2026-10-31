import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Candidato, RegistroConsentimento, ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import ConsentimentoCandidato from './ConsentimentoCandidato';

// <-------------------TESTES DO CONSENTIMENTO------------------->
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
  consentimento: 'PENDENTE',
  dataInclusao: null,
};

const REGISTRO: RegistroConsentimento = {
  candidato: CANDIDATO,
  observacao: null,
  registradoPor: null,
  registradoEm: null,
};

function criarServicos(
  registro: RegistroConsentimento = REGISTRO,
  parcial: Partial<ServicoCandidatos> = {},
  estudo: Estudo = ESTUDO,
) {
  const estudos: ServicoEstudos = { listar: vi.fn().mockResolvedValue([estudo]), cadastrar: vi.fn() };
  const candidatos: ServicoCandidatos = {
    listar: vi.fn(),
    cadastrar: vi.fn(),
    obterElegibilidade: vi.fn(),
    avaliarElegibilidade: vi.fn(),
    obterConsentimento: vi.fn().mockResolvedValue(registro),
    registrarConsentimento: vi.fn().mockResolvedValue(registro),
    obterInclusao: vi.fn(),
    incluir: vi.fn(),
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
    <MemoryRouter initialEntries={['/estudos/3/candidatos/2/consentimento']}>
      <Routes>
        <Route
          path="/estudos/:id/candidatos/:candidatoId/consentimento"
          element={
            <ConsentimentoCandidato
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

const registrar = () => userEvent.click(screen.getByRole('button', { name: 'Registrar consentimento' }));

describe('ConsentimentoCandidato', () => {
  it('mostra o candidato e as duas respostas, sem nenhuma marcada', async () => {
    renderizar(criarServicos());

    expect(await screen.findByText('Bruno Martins • bruno.martins@exemplo.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Registrar consentimento' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Aceitou' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Recusou' })).not.toBeChecked();
    expect(screen.getByText('0/500')).toBeInTheDocument();
    expect(
      screen.getByText('A data, a hora e o coordenador responsável são registrados automaticamente.'),
    ).toBeInTheDocument();
  });

  it('exige a resposta sem chamar o serviço e limpa o erro ao marcar', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('radio', { name: 'Aceitou' });

    await registrar();

    expect(screen.getByRole('alert')).toHaveTextContent('Escolha a resposta do candidato antes de registrar.');
    expect(screen.getByText('Escolha a resposta do candidato.')).toBeInTheDocument();
    expect(servicos.candidatos.registrarConsentimento).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('radio', { name: 'Recusou' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Escolha a resposta do candidato.')).not.toBeInTheDocument();
  });

  it('aponta a observação acima de 500 caracteres', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await userEvent.click(await screen.findByRole('radio', { name: 'Aceitou' }));

    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'a'.repeat(501) } });
    expect(screen.getByText('501/500')).toBeInTheDocument();
    await registrar();

    expect(screen.getByText('A observação deve ter no máximo 500 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Revise os campos destacados antes de registrar.');
    expect(servicos.candidatos.registrarConsentimento).not.toHaveBeenCalled();
  });

  it('registra e volta à lista com o aviso', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await userEvent.click(await screen.findByRole('radio', { name: 'Aceitou' }));
    await userEvent.type(screen.getByLabelText('Observação'), '  Sem dúvidas. ');

    await registrar();

    expect(await screen.findByText('Lista do recrutamento: Consentimento registrado: aceitou.')).toBeInTheDocument();
    expect(servicos.candidatos.registrarConsentimento).toHaveBeenCalledWith(3, 2, {
      resposta: 'ACEITOU',
      observacao: 'Sem dúvidas.',
    });
  });

  it('traz a resposta salva para correção, com quem registrou', async () => {
    renderizar(
      criarServicos({
        candidato: { ...CANDIDATO, consentimento: 'RECUSOU' },
        observacao: 'Preferiu não participar.',
        registradoPor: 'Carlos Coordenador',
        registradoEm: '2026-10-27T15:02:00',
      }),
    );

    expect(await screen.findByRole('radio', { name: 'Recusou' })).toBeChecked();
    expect(screen.getByLabelText('Observação')).toHaveValue('Preferiu não participar.');
    expect(screen.getByText(/Registrado por Carlos Coordenador em 27\/10\/2026 às 15:02/)).toBeInTheDocument();
  });

  it('mostra nos campos os erros de validação do backend', async () => {
    const erro = new ErroRequisicao(400, {
      codigo: 'VALIDACAO_INVALIDA',
      mensagem: 'Confira os campos informados.',
      errosCampos: { observacao: 'Observação recusada pelo servidor.' },
    });
    renderizar(criarServicos(REGISTRO, { registrarConsentimento: vi.fn().mockRejectedValue(erro) }));
    await userEvent.click(await screen.findByRole('radio', { name: 'Aceitou' }));

    await registrar();

    expect(await screen.findByText('Observação recusada pelo servidor.')).toBeInTheDocument();
  });

  it('mostra a regra de negócio recusada e o erro sem resposta do servidor', async () => {
    const erro = new ErroRequisicao(400, { codigo: 'AVALIACAO_PENDENTE', mensagem: 'Avalie antes.' });
    const registrarConsentimento = vi.fn().mockRejectedValueOnce(erro).mockRejectedValueOnce(new Error('falha'));
    renderizar(criarServicos(REGISTRO, { registrarConsentimento }));
    await userEvent.click(await screen.findByRole('radio', { name: 'Aceitou' }));

    await registrar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Avalie antes.');

    await registrar();
    expect(await screen.findByText('Não foi possível registrar o consentimento.')).toBeInTheDocument();
  });

  it('fica só para consulta depois da inclusão', async () => {
    renderizar(criarServicos({ ...REGISTRO, candidato: { ...CANDIDATO, consentimento: 'ACEITOU', dataInclusao: '2026-10-28' } }));

    expect(
      await screen.findByText('O candidato já foi incluído: o consentimento não pode mais ser corrigido.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Aceitou' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Registrar consentimento' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao recrutamento' })).toHaveAttribute('href', '/estudos/3/recrutamento');
  });

  it('bloqueia candidato sem avaliação', async () => {
    renderizar(criarServicos({ ...REGISTRO, candidato: { ...CANDIDATO, elegibilidade: 'NAO_AVALIADO' } }));
    expect(
      await screen.findByText('Avalie a elegibilidade do candidato antes de registrar o consentimento.'),
    ).toBeInTheDocument();
  });

  it('bloqueia o estudo fora de Recrutamento', async () => {
    renderizar(criarServicos(REGISTRO, {}, { ...ESTUDO, estado: 'EXECUCAO' }));
    expect(
      await screen.findByText('Só é possível registrar o consentimento com o estudo em Recrutamento.'),
    ).toBeInTheDocument();
  });

  it('mostra "não encontrado" para estudo fora da sessão, sem pedir o registro', async () => {
    const servicos = criarServicos();
    vi.mocked(servicos.estudos.listar).mockResolvedValue([]);
    renderizar(servicos);
    expect(await screen.findByRole('heading', { name: 'Candidato não encontrado' })).toBeInTheDocument();
    expect(servicos.candidatos.obterConsentimento).not.toHaveBeenCalled();
  });

  it('trata o 404 do candidato como "não encontrado"', async () => {
    const erro = new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Candidato não encontrado.' });
    renderizar(criarServicos(REGISTRO, { obterConsentimento: vi.fn().mockRejectedValue(erro) }));
    expect(await screen.findByRole('heading', { name: 'Candidato não encontrado' })).toBeInTheDocument();
  });

  it('tenta carregar de novo depois de um erro', async () => {
    const obterConsentimento = vi.fn().mockRejectedValueOnce(new Error('falha')).mockResolvedValue(REGISTRO);
    renderizar(criarServicos(REGISTRO, { obterConsentimento }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o consentimento.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('radio', { name: 'Aceitou' })).toBeInTheDocument();
  });
});
