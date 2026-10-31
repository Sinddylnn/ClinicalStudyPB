import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AvaliacaoElegibilidade, Candidato, ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import ElegibilidadeCandidato from './ElegibilidadeCandidato';

// <-------------------TESTES DA AVALIAÇÃO DE ELEGIBILIDADE------------------->
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
  id: 6,
  estudoId: 3,
  nome: 'Felipe Souza',
  email: 'felipe.souza@exemplo.com',
  elegibilidade: 'NAO_AVALIADO',
  consentimento: 'PENDENTE',
  dataInclusao: null,
};

const AVALIACAO: AvaliacaoElegibilidade = {
  candidato: CANDIDATO,
  situacao: 'NAO_AVALIADO',
  itens: [
    { criterioId: 1, tipo: 'INCLUSAO', descricao: 'Ter 18 anos ou mais', resposta: null },
    { criterioId: 2, tipo: 'INCLUSAO', descricao: 'Ter celular para usar o aplicativo', resposta: null },
    { criterioId: 3, tipo: 'EXCLUSAO', descricao: 'Usar medicação para dormir', resposta: null },
  ],
  avaliadoPor: null,
  avaliadoEm: null,
};

function criarServicos(
  avaliacao: AvaliacaoElegibilidade = AVALIACAO,
  parcial: Partial<ServicoCandidatos> = {},
  estudo: Estudo = ESTUDO,
) {
  const estudos: ServicoEstudos = { listar: vi.fn().mockResolvedValue([estudo]), cadastrar: vi.fn() };
  const candidatos: ServicoCandidatos = {
    listar: vi.fn(),
    cadastrar: vi.fn(),
    obterElegibilidade: vi.fn().mockResolvedValue(avaliacao),
    avaliarElegibilidade: vi.fn().mockImplementation((_e, _c, { respostas }) =>
      Promise.resolve({ ...avaliacao, situacao: 'ELEGIVEL', itens: avaliacao.itens.map((i, n) => ({ ...i, resposta: respostas[n].resposta })) }),
    ),
    obterConsentimento: vi.fn(),
    registrarConsentimento: vi.fn(),
    obterInclusao: vi.fn(),
    incluir: vi.fn(),
    ...parcial,
  };
  return { estudos, candidatos };
}

// Mostra o aviso que chega na lista do recrutamento depois de salvar
function ListaFalsa() {
  const location = useLocation();
  return <p>Lista do recrutamento: {location.state?.aviso}</p>;
}

function renderizar(servicos: ReturnType<typeof criarServicos>, caminho = '/estudos/3/candidatos/6/elegibilidade') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route
          path="/estudos/:id/candidatos/:candidatoId/elegibilidade"
          element={
            <ElegibilidadeCandidato
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

const resultado = () => screen.getByRole('complementary', { name: 'Resultado da avaliação' });
const opcoes = (criterio: string) => screen.getByRole('radiogroup', { name: criterio });

async function marcar(criterio: string, opcao: string) {
  await userEvent.click(within(opcoes(criterio)).getByRole('radio', { name: opcao }));
}

describe('ElegibilidadeCandidato', () => {
  it('mostra o candidato e os critérios do protocolo, ainda sem avaliação', async () => {
    renderizar(criarServicos());

    expect(await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' })).toBeInTheDocument();
    expect(screen.getByText('Felipe Souza • felipe.souza@exemplo.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acompanhamento de hábitos' })).toHaveAttribute(
      'href',
      '/estudos/3/recrutamento',
    );
    expect(within(opcoes('Ter 18 anos ou mais')).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual([
      'ATENDIDO',
      'NAO_ATENDIDO',
    ]);
    expect(within(opcoes('Usar medicação para dormir')).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual([
      'AUSENTE',
      'PRESENTE',
    ]);
    expect(within(resultado()).getByText('Não avaliado')).toBeInTheDocument();
    expect(within(resultado()).getByText('Ainda não há avaliação salva.')).toBeInTheDocument();
    expect(screen.queryByText('Sem resposta')).not.toBeInTheDocument();
  });

  it('atualiza o resultado ao marcar: incompleta, inelegível e elegível', async () => {
    renderizar(criarServicos());
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    await marcar('Ter 18 anos ou mais', 'Atendido');
    expect(within(resultado()).getByText('Incompleta')).toBeInTheDocument();
    expect(within(resultado()).getByText('2 critérios sem resposta')).toBeInTheDocument();
    expect(screen.getAllByText('Sem resposta')).toHaveLength(2);

    await marcar('Ter celular para usar o aplicativo', 'Atendido');
    await marcar('Usar medicação para dormir', 'Presente');
    expect(within(resultado()).getByText('Inelegível')).toBeInTheDocument();
    expect(within(resultado()).getByText(/^Um critério de exclusão está presente\./)).toBeInTheDocument();
    expect(within(resultado()).getByText('1 de 1 critérios de exclusão presentes')).toBeInTheDocument();
    expect(screen.getByText('Candidato inelegível: a inclusão ficará bloqueada.')).toBeInTheDocument();

    await marcar('Usar medicação para dormir', 'Ausente');
    expect(within(resultado()).getByText('Elegível')).toBeInTheDocument();
    expect(within(resultado()).getByText('2 de 2 critérios de inclusão atendidos')).toBeInTheDocument();
    expect(screen.getByText(/pode ser corrigida até a inclusão/)).toBeInTheDocument();
  });

  it('salva as respostas e volta à lista com o aviso', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    await marcar('Ter 18 anos ou mais', 'Atendido');
    await marcar('Ter celular para usar o aplicativo', 'Atendido');
    await marcar('Usar medicação para dormir', 'Ausente');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(servicos.candidatos.avaliarElegibilidade).toHaveBeenCalledWith(3, 6, {
      respostas: [
        { criterioId: 1, resposta: 'ATENDIDO' },
        { criterioId: 2, resposta: 'ATENDIDO' },
        { criterioId: 3, resposta: 'AUSENTE' },
      ],
    });
    expect(await screen.findByText('Lista do recrutamento: Avaliação salva: elegível.')).toBeInTheDocument();
  });

  it('salva incompleta, enviando null nos critérios sem resposta', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    await marcar('Ter 18 anos ou mais', 'Atendido');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(servicos.candidatos.avaliarElegibilidade).toHaveBeenCalledWith(3, 6, {
      respostas: [
        { criterioId: 1, resposta: 'ATENDIDO' },
        { criterioId: 2, resposta: null },
        { criterioId: 3, resposta: null },
      ],
    });
  });

  it('volta a "sem resposta" ao clicar de novo na opção marcada', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    await marcar('Ter 18 anos ou mais', 'Atendido');
    await marcar('Ter celular para usar o aplicativo', 'Atendido');
    await marcar('Ter celular para usar o aplicativo', 'Atendido');

    expect(within(opcoes('Ter celular para usar o aplicativo')).getByRole('radio', { name: 'Atendido' })).not.toBeChecked();
    expect(within(resultado()).getByText('2 critérios sem resposta')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));
    expect(servicos.candidatos.avaliarElegibilidade).toHaveBeenCalledWith(3, 6, {
      respostas: [
        { criterioId: 1, resposta: 'ATENDIDO' },
        { criterioId: 2, resposta: null },
        { criterioId: 3, resposta: null },
      ],
    });
  });

  it('não envia a avaliação sem nenhuma resposta', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    await userEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Marque pelo menos um critério antes de salvar a avaliação.');
    expect(servicos.candidatos.avaliarElegibilidade).not.toHaveBeenCalled();
  });

  it('continua uma avaliação salva, com o registro de quem avaliou', async () => {
    renderizar(
      criarServicos({
        ...AVALIACAO,
        situacao: 'INCOMPLETA',
        itens: AVALIACAO.itens.map((i) => ({ ...i, resposta: i.tipo === 'INCLUSAO' ? 'ATENDIDO' : null })),
        avaliadoPor: 'Carlos Coordenador',
        avaliadoEm: '2026-10-27T10:05:00',
      }),
    );
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    expect(within(opcoes('Ter 18 anos ou mais')).getByRole('radio', { name: 'Atendido' })).toBeChecked();
    expect(within(resultado()).getByText('Avaliada por Carlos Coordenador em 27/10/2026 às 10:05.')).toBeInTheDocument();
    expect(within(resultado()).getByText('1 critério sem resposta')).toBeInTheDocument();
  });

  it('mostra o erro do backend sem sair da tela', async () => {
    const avaliarElegibilidade = vi.fn().mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'ESTADO_INVALIDO',
        mensagem: 'Só é possível avaliar candidatos em estudos em Recrutamento.',
      }),
    );
    renderizar(criarServicos(AVALIACAO, { avaliarElegibilidade }));
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    await marcar('Ter 18 anos ou mais', 'Não atendido');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar avaliação' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Só é possível avaliar candidatos em estudos em Recrutamento.');
    expect(screen.getByRole('button', { name: 'Salvar avaliação' })).toBeEnabled();
  });

  it('fica só para consulta depois da inclusão do candidato', async () => {
    renderizar(
      criarServicos({
        ...AVALIACAO,
        candidato: { ...CANDIDATO, elegibilidade: 'ELEGIVEL', dataInclusao: '2026-10-28' },
        situacao: 'ELEGIVEL',
        itens: AVALIACAO.itens.map((i) => ({ ...i, resposta: i.tipo === 'INCLUSAO' ? 'ATENDIDO' : 'AUSENTE' })),
        avaliadoPor: 'Carlos Coordenador',
        avaliadoEm: '2026-10-27T09:10:00',
      }),
    );
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    expect(screen.getByText(/O candidato já foi incluído/)).toBeInTheDocument();
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar avaliação' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao recrutamento' })).toHaveAttribute('href', '/estudos/3/recrutamento');
  });

  it('fica só para consulta com o estudo fora de Recrutamento', async () => {
    renderizar(criarServicos(AVALIACAO, {}, { ...ESTUDO, estado: 'EXECUCAO' }));
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' });

    expect(screen.getByText('Só é possível avaliar candidatos com o estudo em Recrutamento.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar avaliação' })).not.toBeInTheDocument();
  });

  it('mostra "Candidato não encontrado" para o 404 e para estudo fora da lista do coordenador', async () => {
    const obterElegibilidade = vi
      .fn()
      .mockRejectedValue(new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Candidato não encontrado.' }));
    renderizar(criarServicos(AVALIACAO, { obterElegibilidade }));
    expect(await screen.findByRole('heading', { name: 'Candidato não encontrado' })).toBeInTheDocument();
  });

  it('não pede a avaliação de estudo fora da lista do coordenador', async () => {
    const servicos = criarServicos();
    renderizar(servicos, '/estudos/99/candidatos/6/elegibilidade');

    expect(await screen.findByRole('heading', { name: 'Candidato não encontrado' })).toBeInTheDocument();
    expect(servicos.candidatos.obterElegibilidade).not.toHaveBeenCalled();
  });

  it('mostra o erro de carregamento e tenta de novo', async () => {
    const obterElegibilidade = vi
      .fn()
      .mockRejectedValueOnce(new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }))
      .mockResolvedValueOnce(AVALIACAO);
    renderizar(criarServicos(AVALIACAO, { obterElegibilidade }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Felipe Souza • felipe.souza@exemplo.com')).toBeInTheDocument();
  });
});
