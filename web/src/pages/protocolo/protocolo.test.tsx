import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import type { Protocolo, ServicoProtocolo } from '../../api/protocolo';
import type { UsuarioSessao } from '../../api/autenticacao';
import ProtocoloEstudo from './ProtocoloEstudo';

// <-------------------TESTES DA TELA DO PROTOCOLO------------------->
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
  coordenadorId: 3,
};

const PROTOCOLO: Protocolo = {
  estudoId: 1,
  criteriosInclusao: [
    { id: 1, descricao: 'Estudantes de graduação.' },
    { id: 2, descricao: 'Idade entre 18 e 30 anos.' },
  ],
  criteriosExclusao: [],
  semCriteriosExclusao: false,
  pendenciasRecrutamento: ['CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA'],
};

function criarServicos(
  estudo: Estudo = ESTUDO,
  protocolo: Partial<Protocolo> = {},
  parcial: Partial<ServicoProtocolo> = {},
) {
  const estudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue([estudo]),
    cadastrar: vi.fn(),
  };
  const servicoProtocolo: ServicoProtocolo = {
    obter: vi.fn().mockResolvedValue({ ...PROTOCOLO, ...protocolo }),
    adicionarCriterio: vi.fn().mockImplementation((_id, { descricao }) => Promise.resolve({ id: 9, descricao })),
    editarCriterio: vi.fn().mockImplementation((_id, criterioId, descricao) =>
      Promise.resolve({ id: criterioId, descricao }),
    ),
    removerCriterio: vi.fn().mockResolvedValue(undefined),
    definirSemExclusao: vi.fn().mockImplementation((_id, semCriteriosExclusao) =>
      Promise.resolve({ ...PROTOCOLO, ...protocolo, semCriteriosExclusao }),
    ),
    ...parcial,
  };
  return { estudos, protocolo: servicoProtocolo };
}

// A maior parte dos testes trabalha na aba Critérios
function renderizar(servicos: ReturnType<typeof criarServicos>, caminho = '/estudos/1?aba=criterios') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route
          path="/estudos/:id"
          element={
            <ProtocoloEstudo
              servicoEstudos={servicos.estudos}
              servicoProtocolo={servicos.protocolo}
              usuario={PESQUISADORA}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const cartao = (nome: 'inclusão' | 'exclusão') => screen.getByRole('region', { name: `Critérios de ${nome}` });

const quadro = () => screen.getByRole('complementary', { name: 'Para iniciar o recrutamento' });

const aba = (nome: 'Resumo' | 'Critérios' | 'Visitas') => screen.getByRole('tab', { name: nome });

describe('ProtocoloEstudo', () => {
  it('abre no Resumo com os dados do estudo e o que falta para iniciar o recrutamento', async () => {
    renderizar(criarServicos(), '/estudos/1');

    expect(await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' })).toBeInTheDocument();
    expect(screen.getByText('Planejamento')).toHaveClass('etiqueta-planejamento');
    expect(screen.getByText('Responsável: você • 03/11/2026 – 28/02/2027 • 45 vagas')).toBeInTheDocument();
    // A abertura do recrutamento é da T47
    expect(screen.getByRole('button', { name: 'Iniciar recrutamento' })).toBeDisabled();

    expect(aba('Resumo')).toHaveAttribute('aria-selected', 'true');
    const resumo = screen.getByRole('tabpanel', { name: 'Resumo' });
    expect(within(resumo).getByText('Objetivo.')).toBeInTheDocument();
    expect(within(resumo).getByText('45 vagas')).toBeInTheDocument();
    expect(within(resumo).getByText('Paula Pesquisadora (você)')).toBeInTheDocument();
    expect(within(resumo).getByText('Coordenador atribuído ao estudo.')).toBeInTheDocument();

    expect(within(quadro()).getByText('2 pendentes')).toBeInTheDocument();
    const [incl, excl, visita, coordenador] = within(quadro()).getAllByRole('listitem');
    expect(incl).toHaveTextContent('Atendido: Pelo menos um critério de inclusão2 critérios cadastrados');
    expect(excl).toHaveTextContent('Pendente: Critérios de exclusão definidosCadastre ou indique que não há');
    expect(visita).toHaveTextContent('Pendente: Visitas com pelo menos uma atividade cadaNenhuma visita cadastrada');
    expect(coordenador).toHaveTextContent('Atendido: Coordenador atribuído');
    expect(screen.queryByRole('region', { name: 'Critérios de inclusão' })).not.toBeInTheDocument();
  });

  it('mostra os critérios na aba Critérios, com o aviso de que o protocolo ainda pode mudar', async () => {
    renderizar(criarServicos(), '/estudos/1');
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });

    await userEvent.click(aba('Critérios'));

    expect(aba('Critérios')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/O protocolo pode ser alterado enquanto o estudo estiver em Planejamento/)).toBeInTheDocument();
    const inclusao = within(cartao('inclusão')).getAllByRole('listitem');
    expect(inclusao.map((item) => item.textContent)).toEqual([
      'Estudantes de graduação.',
      'Idade entre 18 e 30 anos.',
    ]);
    expect(within(cartao('inclusão')).getByText('O candidato precisa atender a todos para ser elegível.')).toBeInTheDocument();
    expect(within(cartao('exclusão')).getByText('Nenhum critério de exclusão cadastrado.')).toBeInTheDocument();
    expect(within(cartao('exclusão')).getByText('Se algum estiver presente, o candidato é inelegível.')).toBeInTheDocument();
  });

  it('troca de aba pelas setas do teclado e mostra as visitas ainda vazias', async () => {
    renderizar(criarServicos(), '/estudos/1');
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    aba('Resumo').focus();
    await usuario.keyboard('{ArrowLeft}');

    expect(aba('Visitas')).toHaveAttribute('aria-selected', 'true');
    expect(aba('Visitas')).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Visitas' })).toHaveTextContent('Nenhuma visita cadastrada.');

    await usuario.keyboard('{ArrowRight}');
    expect(aba('Resumo')).toHaveAttribute('aria-selected', 'true');
  });

  it('aponta o coordenador como pendente quando o estudo ainda não tem um', async () => {
    renderizar(criarServicos({ ...ESTUDO, coordenadorId: null }), '/estudos/1');
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });

    expect(within(quadro()).getByText('3 pendentes')).toBeInTheDocument();
    const coordenador = within(quadro()).getAllByRole('listitem')[3];
    expect(coordenador).toHaveTextContent('Pendente: Coordenador atribuídoAtribua na seção Coordenador');
    expect(coordenador).toHaveClass('protocolo-requisito-pendente');
    expect(screen.getByText(/Nenhum coordenador atribuído/)).toBeInTheDocument();
  });

  it('adiciona um critério com contador de caracteres e notificação', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    await usuario.click(within(cartao('exclusão')).getByRole('button', { name: 'Adicionar critério' }));
    const campo = screen.getByLabelText('Novo critério de exclusão');
    expect(campo).toHaveFocus();
    await usuario.type(campo, 'Gestantes.');
    expect(within(cartao('exclusão')).getByText('10/1.000')).toBeInTheDocument();
    await usuario.click(within(cartao('exclusão')).getByRole('button', { name: 'Adicionar' }));

    expect(servicos.protocolo.adicionarCriterio).toHaveBeenCalledWith(1, { tipo: 'EXCLUSAO', descricao: 'Gestantes.' });
    expect(await screen.findByRole('status')).toHaveTextContent('Critério adicionado.');
    expect(within(cartao('exclusão')).getByRole('listitem')).toHaveTextContent('Gestantes.');
    expect(screen.queryByLabelText('Novo critério de exclusão')).not.toBeInTheDocument();
    await usuario.click(aba('Resumo'));
    expect(within(quadro()).getByText('1 pendente')).toBeInTheDocument();
  });

  it('valida a descrição na tela sem chamar o serviço e cancela o formulário', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    await usuario.click(within(cartao('inclusão')).getByRole('button', { name: 'Adicionar critério' }));
    await usuario.type(screen.getByLabelText('Novo critério de inclusão'), '   ');
    await usuario.click(within(cartao('inclusão')).getByRole('button', { name: 'Adicionar' }));

    expect(screen.getByText('Descreva o critério.')).toBeInTheDocument();
    expect(screen.getByLabelText('Novo critério de inclusão')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Novo critério de inclusão')).toHaveAttribute('maxLength', '1000');
    expect(servicos.protocolo.adicionarCriterio).not.toHaveBeenCalled();

    await usuario.click(within(cartao('inclusão')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Novo critério de inclusão')).not.toBeInTheDocument();
  });

  it('mostra no campo o erro de validação do backend e, no formulário, os demais erros', async () => {
    const adicionarCriterio = vi
      .fn()
      .mockRejectedValueOnce(
        new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos: { descricao: 'Use até 1.000 caracteres.' },
        }),
      )
      .mockRejectedValueOnce(
        new ErroRequisicao(400, {
          codigo: 'ESTUDO_FORA_DE_PLANEJAMENTO',
          mensagem: 'O protocolo só pode ser alterado com o estudo em Planejamento.',
        }),
      );
    renderizar(criarServicos(ESTUDO, {}, { adicionarCriterio }));
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    await usuario.click(within(cartao('inclusão')).getByRole('button', { name: 'Adicionar critério' }));
    await usuario.type(screen.getByLabelText('Novo critério de inclusão'), 'Adultos.');
    await usuario.click(within(cartao('inclusão')).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Use até 1.000 caracteres.')).toBeInTheDocument();

    await usuario.click(within(cartao('inclusão')).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O protocolo só pode ser alterado com o estudo em Planejamento.',
    );
  });

  it('edita um critério', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Editar critério: Idade entre 18 e 30 anos.' }));
    const campo = screen.getByLabelText('Editar critério de inclusão');
    expect(campo).toHaveValue('Idade entre 18 e 30 anos.');
    await usuario.clear(campo);
    await usuario.type(campo, ' Idade entre 18 e 25 anos. ');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(servicos.protocolo.editarCriterio).toHaveBeenCalledWith(1, 2, 'Idade entre 18 e 25 anos.');
    expect(await screen.findByRole('status')).toHaveTextContent('Critério atualizado.');
    expect(within(cartao('inclusão')).getAllByRole('listitem')[1]).toHaveTextContent('Idade entre 18 e 25 anos.');
  });

  it('remove um critério depois da confirmação', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    // Cancelar não remove
    await usuario.click(screen.getByRole('button', { name: 'Remover critério: Estudantes de graduação.' }));
    let dialogo = screen.getByRole('dialog', { name: 'Remover critério de inclusão?' });
    expect(within(dialogo).getByText('“Estudantes de graduação.”')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(servicos.protocolo.removerCriterio).not.toHaveBeenCalled();

    await usuario.click(screen.getByRole('button', { name: 'Remover critério: Estudantes de graduação.' }));
    dialogo = screen.getByRole('dialog', { name: 'Remover critério de inclusão?' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Remover critério' }));

    expect(servicos.protocolo.removerCriterio).toHaveBeenCalledWith(1, 1);
    expect(await screen.findByRole('status')).toHaveTextContent('Critério removido.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(cartao('inclusão')).getAllByRole('listitem')).toHaveLength(1);
  });

  it('mostra no diálogo a falha ao remover, mantendo o critério', async () => {
    const removerCriterio = vi.fn().mockRejectedValue(new Error('rede'));
    renderizar(criarServicos(ESTUDO, {}, { removerCriterio }));
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Remover critério: Estudantes de graduação.' }));
    await usuario.click(screen.getByRole('button', { name: 'Remover critério' }));

    const dialogo = screen.getByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Não foi possível remover o critério.');
    expect(within(cartao('inclusão')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('indica que o estudo não possui critérios de exclusão', async () => {
    const servicos = criarServicos();
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    const opcao = screen.getByRole('checkbox', { name: 'Este estudo não possui critérios de exclusão' });
    expect(opcao).not.toBeChecked();
    await usuario.click(opcao);

    expect(servicos.protocolo.definirSemExclusao).toHaveBeenCalledWith(1, true);
    await vi.waitFor(() => expect(opcao).toBeChecked());
    expect(within(cartao('exclusão')).getByText('Este estudo não possui critérios de exclusão.')).toBeInTheDocument();

    await usuario.click(aba('Resumo'));
    expect(within(quadro()).getByText('1 pendente')).toBeInTheDocument();
    expect(within(quadro()).getAllByRole('listitem')[1]).toHaveTextContent(
      'Atendido: Critérios de exclusão definidosO estudo não possui critérios de exclusão',
    );
  });

  it('desativa a adição de exclusões com a opção marcada e libera ao desmarcar', async () => {
    const servicos = criarServicos(ESTUDO, { semCriteriosExclusao: true });
    renderizar(servicos);
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();
    expect(screen.getByRole('checkbox')).toBeChecked();

    const adicionar = within(cartao('exclusão')).getByRole('button', { name: 'Adicionar critério' });
    expect(adicionar).toBeDisabled();
    expect(adicionar).toHaveAccessibleDescription('Para cadastrar um critério de exclusão, desmarque a opção abaixo.');
    // A inclusão não depende da opção
    expect(within(cartao('inclusão')).getByRole('button', { name: 'Adicionar critério' })).toBeEnabled();

    await usuario.click(screen.getByRole('checkbox'));
    expect(servicos.protocolo.definirSemExclusao).toHaveBeenCalledWith(1, false);
    await vi.waitFor(() => expect(adicionar).toBeEnabled());
    expect(adicionar).not.toHaveAccessibleDescription();
    expect(screen.queryByText('Para cadastrar um critério de exclusão, desmarque a opção abaixo.')).not.toBeInTheDocument();
  });

  it('mantém a opção marcada quando o backend recusa a exclusão (SEM_EXCLUSAO_DECLARADA)', async () => {
    // Ex.: a opção foi marcada em outra aba depois que esta tela carregou
    const adicionarCriterio = vi.fn().mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'SEM_EXCLUSAO_DECLARADA',
        mensagem: 'Desmarque a opção de que o estudo não possui critérios de exclusão antes de cadastrar um.',
      }),
    );
    renderizar(criarServicos(ESTUDO, {}, { adicionarCriterio }));
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });
    const usuario = userEvent.setup();

    await usuario.click(within(cartao('exclusão')).getByRole('button', { name: 'Adicionar critério' }));
    await usuario.type(screen.getByLabelText('Novo critério de exclusão'), 'Gestantes.');
    await usuario.click(within(cartao('exclusão')).getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Desmarque a opção de que o estudo não possui');
    expect(screen.getByLabelText('Novo critério de exclusão')).toHaveValue('Gestantes.');
    expect(within(cartao('exclusão')).queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('desativa "sem exclusão" com critérios de exclusão cadastrados', async () => {
    renderizar(criarServicos(ESTUDO, { criteriosExclusao: [{ id: 5, descricao: 'Gestantes.' }] }));
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });

    const opcao = screen.getByRole('checkbox', { name: 'Este estudo não possui critérios de exclusão' });
    expect(opcao).toBeDisabled();
    expect(opcao).toHaveAccessibleDescription('Para marcar esta opção, remova os critérios de exclusão cadastrados.');
    await userEvent.click(aba('Resumo'));
    expect(within(quadro()).getByText('1 pendente')).toBeInTheDocument();
  });

  it('mostra a falha ao salvar a indicação "sem exclusão"', async () => {
    const definirSemExclusao = vi.fn().mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'EXCLUSAO_JA_DEFINIDA',
        mensagem: 'Remova os critérios de exclusão antes de indicar que o estudo não possui nenhum.',
      }),
    );
    renderizar(criarServicos(ESTUDO, {}, { definirSemExclusao }));
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });

    await userEvent.click(screen.getByRole('checkbox'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Remova os critérios de exclusão antes');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('fica somente leitura fora de Planejamento, sem o quadro do recrutamento', async () => {
    renderizar(
      criarServicos(
        { ...ESTUDO, estado: 'RECRUTAMENTO' },
        { criteriosExclusao: [], semCriteriosExclusao: true, pendenciasRecrutamento: [] },
      ),
    );
    await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' });

    expect(screen.getByText('Recrutamento')).toHaveClass('etiqueta-recrutamento');
    expect(screen.getByText(/O protocolo fica só para consulta/)).toBeInTheDocument();
    expect(within(cartao('inclusão')).getAllByRole('listitem')).toHaveLength(2);
    expect(within(cartao('exclusão')).getByText('Este estudo não possui critérios de exclusão.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar critério' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar critério/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remover critério/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar recrutamento' })).not.toBeInTheDocument();

    await userEvent.click(aba('Resumo'));
    expect(screen.getByRole('heading', { name: 'Dados do estudo' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Para iniciar o recrutamento' })).not.toBeInTheDocument();
  });

  it('mostra o erro de carregamento e tenta de novo', async () => {
    const servicos = criarServicos();
    vi.mocked(servicos.protocolo.obter)
      .mockRejectedValueOnce(
        new ErroRequisicao(0, { codigo: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar ao servidor.' }),
      )
      .mockResolvedValueOnce(PROTOCOLO);
    renderizar(servicos);

    expect(screen.getByText('Carregando estudo…')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByRole('heading', { name: 'Sono e rotina de estudantes' })).toBeInTheDocument();
    expect(servicos.protocolo.obter).toHaveBeenCalledTimes(2);
  });

  it('mostra "Estudo não encontrado" para estudo fora da lista da pesquisadora', async () => {
    const servicos = criarServicos();
    renderizar(servicos, '/estudos/99');

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para os estudos' })).toHaveAttribute('href', '/estudos');
    expect(servicos.protocolo.obter).not.toHaveBeenCalled();
  });

  it('mostra "Estudo não encontrado" quando o protocolo responde 404', async () => {
    const obter = vi
      .fn()
      .mockRejectedValue(new ErroRequisicao(404, { codigo: 'RECURSO_NAO_ENCONTRADO', mensagem: 'Estudo não encontrado.' }));
    renderizar(criarServicos(ESTUDO, {}, { obter }));

    expect(await screen.findByRole('heading', { name: 'Estudo não encontrado' })).toBeInTheDocument();
  });
});
