import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { PainelEstudo, ServicoPainel } from '../../api/painel';
import PainelIndicadores from './PainelIndicadores';

// <-------------------TESTES DO PAINEL DE INDICADORES (RF21)------------------->
const COORDENADOR: UsuarioSessao = { id: 3, nome: 'Carlos Coordenador', email: 'carlos@exemplo.com', perfil: 'COORDENADOR' };
const PESQUISADORA: UsuarioSessao = { id: 2, nome: 'Paula Pesquisadora', email: 'paula@exemplo.com', perfil: 'PESQUISADOR' };

const HABITOS: Estudo = {
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

const SONO: Estudo = { ...HABITOS, id: 5, titulo: 'Sono e rotina', estado: 'EXECUCAO', limiteParticipantes: 1 };

const PAINEL_HABITOS: PainelEstudo = {
  estudoId: 3,
  candidatosCadastrados: 8,
  participantesIncluidos: 5,
  participantesAtivos: 4,
  participantesRetirados: 1,
  visitasRealizadas: 6,
  visitasPendentes: 2,
};

const PAINEL_SONO: PainelEstudo = {
  estudoId: 5,
  candidatosCadastrados: 1234,
  participantesIncluidos: 1,
  participantesAtivos: 0,
  participantesRetirados: 1,
  visitasRealizadas: 0,
  visitasPendentes: 0,
};

function criarServicos(estudos: Estudo[] = [HABITOS, SONO], consultar?: ServicoPainel['consultar']) {
  const servicoEstudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue(estudos),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const servicoPainel: ServicoPainel = {
    consultar:
      consultar ?? vi.fn((id: number) => Promise.resolve(id === 5 ? PAINEL_SONO : PAINEL_HABITOS)),
  };
  return { estudos: servicoEstudos, painel: servicoPainel };
}

// Mostra o endereço atual, para conferir o estudo guardado em ?estudo=
function Endereco() {
  const { search } = useLocation();
  return <output aria-label="Endereço">{search}</output>;
}

function renderizar(servicos: ReturnType<typeof criarServicos>, usuario = COORDENADOR, endereco = '/painel') {
  render(
    <MemoryRouter initialEntries={[endereco]}>
      <Routes>
        <Route
          path="/painel"
          element={
            <>
              <PainelIndicadores servicoEstudos={servicos.estudos} servicoPainel={servicos.painel} usuario={usuario} />
              <Endereco />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const indicador = (rotulo: string) => screen.getByText(rotulo).closest('li') as HTMLElement;

describe('PainelIndicadores', () => {
  it('abre o primeiro estudo da lista com as contagens do recrutamento e das visitas', async () => {
    const servicos = criarServicos();
    renderizar(servicos);

    expect(screen.getByText('Carregando estudos…')).toBeInTheDocument();
    expect(await screen.findByText('Candidatos cadastrados')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Painel de indicadores' })).toBeInTheDocument();
    expect(screen.getByLabelText('Estudo')).toHaveValue('3');
    expect(screen.getByText('Recrutamento', { selector: 'span' })).toBeInTheDocument();
    expect(servicos.painel.consultar).toHaveBeenCalledWith(3);

    const recrutamento = screen.getByRole('region', { name: 'Recrutamento' });
    expect(within(recrutamento).getAllByRole('listitem')).toHaveLength(4);
    expect(indicador('Candidatos cadastrados')).toHaveTextContent('8');
    expect(indicador('Participantes incluídos')).toHaveTextContent('5 de 30 vagas preenchidas');
    expect(indicador('Ativos')).toHaveTextContent('4');
    expect(indicador('Retirados')).toHaveTextContent('1');

    const visitas = screen.getByRole('region', { name: 'Visitas' });
    expect(within(visitas).getAllByRole('listitem')).toHaveLength(2);
    expect(indicador('Visitas realizadas')).toHaveTextContent('6');
    expect(indicador('Visitas pendentes')).toHaveTextContent('2');
    expect(indicador('Visitas pendentes')).toHaveTextContent('Agendadas, inclusive com a data já passada');
    expect(screen.getByText(/inclusive de quem foi retirado depois/)).toBeInTheDocument();
  });

  it('troca de estudo pela lista, guarda a escolha no endereço e formata os números', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByText('Candidatos cadastrados');

    await usuario.selectOptions(screen.getByLabelText('Estudo'), 'Sono e rotina');

    expect(await screen.findByText('1 de 1 vaga preenchidas')).toBeInTheDocument();
    expect(indicador('Candidatos cadastrados')).toHaveTextContent('1.234');
    expect(screen.getByText('Execução')).toBeInTheDocument();
    expect(screen.getByLabelText('Endereço')).toHaveTextContent('?estudo=5');
    expect(servicos.painel.consultar).toHaveBeenLastCalledWith(5);
  });

  it('abre o estudo indicado no endereço', async () => {
    const servicos = criarServicos();
    renderizar(servicos, COORDENADOR, '/painel?estudo=5');

    expect(await screen.findByText('1 de 1 vaga preenchidas')).toBeInTheDocument();
    expect(screen.getByLabelText('Estudo')).toHaveValue('5');
    expect(servicos.painel.consultar).not.toHaveBeenCalledWith(3);
  });

  it('com estudo fora da lista no endereço, avisa sem consultar o painel', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicos();
    renderizar(servicos, COORDENADOR, '/painel?estudo=99');

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
    expect(screen.getByLabelText('Estudo')).toHaveValue('');
    expect(servicos.painel.consultar).not.toHaveBeenCalled();

    await usuario.selectOptions(screen.getByLabelText('Estudo'), 'Acompanhamento de hábitos');
    expect(await screen.findByText('Candidatos cadastrados')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Estudo não encontrado' })).not.toBeInTheDocument();
  });

  it('com 404 do painel, mostra o estudo como não encontrado', async () => {
    const servicos = criarServicos(
      [HABITOS],
      vi.fn().mockRejectedValue(new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Estudo não encontrado.' })),
    );
    renderizar(servicos);

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
    expect(screen.queryByText('Candidatos cadastrados')).not.toBeInTheDocument();
  });

  it('sem estudos, orienta o pesquisador a cadastrar um', async () => {
    renderizar(criarServicos([]), PESQUISADORA);

    expect(await screen.findByRole('heading', { name: 'Nenhum estudo disponível' })).toBeInTheDocument();
    expect(screen.getByText('Cadastre um estudo para acompanhar os indicadores.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Estudo')).not.toBeInTheDocument();
  });

  it('sem estudos, explica ao coordenador que depende do vínculo', async () => {
    renderizar(criarServicos([]));

    expect(await screen.findByText('Os indicadores aparecem quando um estudo for vinculado a você.')).toBeInTheDocument();
  });

  it('com falha na lista de estudos, permite tentar de novo', async () => {
    const usuario = userEvent.setup();
    const servicos = criarServicos();
    vi.mocked(servicos.estudos.listar)
      .mockRejectedValueOnce(new ErroRequisicao(500, { codigo: 'ERRO_INTERNO', mensagem: 'Falha no servidor.' }))
      .mockRejectedValueOnce(new Error('rede'));
    renderizar(servicos);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no servidor.');
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os estudos.');

    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Candidatos cadastrados')).toBeInTheDocument();
  });

  it('com falha no painel, mostra o erro e consulta de novo', async () => {
    const usuario = userEvent.setup();
    const consultar = vi
      .fn()
      .mockRejectedValueOnce(new Error('rede'))
      .mockRejectedValueOnce(new ErroRequisicao(500, { codigo: 'ERRO_INTERNO', mensagem: 'Falha no servidor.' }))
      .mockResolvedValue(PAINEL_HABITOS);
    renderizar(criarServicos([HABITOS], consultar));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os indicadores.');
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no servidor.');

    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Candidatos cadastrados')).toBeInTheDocument();
    expect(consultar).toHaveBeenCalledTimes(3);
  });

  it('atualiza as contagens pelo botão Atualizar', async () => {
    const usuario = userEvent.setup();
    const consultar = vi
      .fn()
      .mockResolvedValueOnce(PAINEL_HABITOS)
      .mockResolvedValueOnce({ ...PAINEL_HABITOS, visitasRealizadas: 7 });
    renderizar(criarServicos([HABITOS], consultar));
    expect(await screen.findByText('Visitas realizadas')).toBeInTheDocument();
    expect(indicador('Visitas realizadas')).toHaveTextContent('6');

    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }));

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it('ignora a resposta de um estudo que deixou de estar escolhido', async () => {
    const usuario = userEvent.setup();
    let responderHabitos: (painel: PainelEstudo) => void = () => undefined;
    const consultar = vi.fn((id: number) =>
      id === 3
        ? new Promise<PainelEstudo>((resolver) => {
            responderHabitos = resolver;
          })
        : Promise.resolve(PAINEL_SONO),
    );
    renderizar(criarServicos([HABITOS, SONO], consultar));
    expect(await screen.findByText('Carregando indicadores…')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Estudo'), 'Sono e rotina');
    expect(await screen.findByText('1 de 1 vaga preenchidas')).toBeInTheDocument();

    responderHabitos(PAINEL_HABITOS);
    await Promise.resolve();
    expect(indicador('Candidatos cadastrados')).toHaveTextContent('1.234');
  });

  it('mostra o item Painel no menu do pesquisador', async () => {
    renderizar(criarServicos(), PESQUISADORA);
    await screen.findByText('Candidatos cadastrados');

    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(within(menu).getByRole('link', { name: 'Painel' })).toHaveAttribute('href', '/painel');
  });
});
