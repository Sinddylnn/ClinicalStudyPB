import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import type { Estudo, ServicoEstudos } from '../../api/estudos';
import { criarServicoEstudosSimulado } from '../../api/estudosSimulado';
import type { Protocolo, ServicoProtocolo, VisitaPrevista, VisitaPrevistaEntrada } from '../../api/protocolo';
import { criarServicoProtocoloSimulado, PROTOCOLOS_INICIAIS } from '../../api/protocoloSimulado';
import type { UsuarioSessao } from '../../api/autenticacao';
import ProtocoloEstudo from './ProtocoloEstudo';

// <-------------------TESTES DA ABA VISITAS------------------->
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
  justificativaEncerramento: null,
};

const VISITAS: VisitaPrevista[] = [
  {
    id: 1,
    nome: 'Visita inicial',
    descricao: 'Apresentação do estudo.',
    ordem: 1,
    atividades: [
      { id: 1, descricao: 'Aplicar questionário fictício.' },
      { id: 2, descricao: 'Entregar o diário de sono.' },
    ],
  },
  { id: 2, nome: 'Acompanhamento', descricao: null, ordem: 3, atividades: [] },
];

// Critérios completos: só as visitas decidem o quadro nestes testes
const PROTOCOLO: Protocolo = {
  estudoId: 1,
  criteriosInclusao: [{ id: 1, descricao: 'Estudantes de graduação.' }],
  criteriosExclusao: [{ id: 2, descricao: 'Trabalho noturno.' }],
  semCriteriosExclusao: false,
  visitas: VISITAS,
};

// Por padrão, o "backend" aceita as alterações e devolve os dados como foram enviados
function criarServicos(
  opcoes: { estudo?: Estudo; visitas?: VisitaPrevista[]; editarRemover?: boolean } = {},
  parcial: Partial<ServicoProtocolo> = {},
) {
  const estudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue([opcoes.estudo ?? ESTUDO]),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn(),
  };
  const protocolo: ServicoProtocolo = {
    recursos: { editarRemover: opcoes.editarRemover ?? true },
    obter: vi.fn().mockResolvedValue({ ...PROTOCOLO, visitas: opcoes.visitas ?? VISITAS }),
    adicionarCriterio: vi.fn(),
    editarCriterio: vi.fn(),
    removerCriterio: vi.fn(),
    definirSemExclusao: vi.fn(),
    adicionarVisita: vi
      .fn()
      .mockImplementation((_e, entrada: VisitaPrevistaEntrada) => Promise.resolve({ id: 9, ...entrada, atividades: [] })),
    editarVisita: vi
      .fn()
      .mockImplementation((_e, visitaId: number, entrada: VisitaPrevistaEntrada) =>
        Promise.resolve({ ...VISITAS.find((v) => v.id === visitaId), ...entrada }),
      ),
    removerVisita: vi.fn().mockResolvedValue(undefined),
    adicionarAtividade: vi.fn().mockImplementation((_e, _v, descricao: string) => Promise.resolve({ id: 9, descricao })),
    editarAtividade: vi
      .fn()
      .mockImplementation((_e, _v, atividadeId: number, descricao: string) => Promise.resolve({ id: atividadeId, descricao })),
    removerAtividade: vi.fn().mockResolvedValue(undefined),
    ...parcial,
  };
  return { estudos, protocolo };
}

function renderizar(servicos: { estudos: ServicoEstudos; protocolo: ServicoProtocolo }, caminho = '/estudos/1?aba=visitas') {
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
  return screen.findByRole('heading', { level: 1 });
}

const cartao = (titulo: string) => screen.getByRole('region', { name: titulo });

const painel = () => screen.getByRole('tabpanel', { name: 'Visitas' });

const quadro = () => screen.getByRole('complementary', { name: 'Para iniciar o recrutamento' });

const cabecalho = () => screen.getByRole('heading', { level: 1 }).closest('header') as HTMLElement;

describe('ProtocoloEstudo: aba Visitas', () => {
  it('lista as visitas em ordem, com descrição e atividades, e destaca a visita sem atividade', async () => {
    await renderizar(criarServicos());

    const titulos = within(painel())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(titulos).toEqual(['1 · Visita inicial', '3 · Acompanhamento']);

    const inicial = cartao('1 · Visita inicial');
    expect(within(inicial).getByText('Apresentação do estudo.')).toBeInTheDocument();
    expect(
      within(inicial)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Aplicar questionário fictício.', 'Entregar o diário de sono.']);
    expect(inicial).not.toHaveClass('protocolo-visita-pendente');

    const acompanhamento = cartao('3 · Acompanhamento');
    expect(acompanhamento).toHaveClass('protocolo-visita-pendente');
    expect(
      within(acompanhamento).getByText('Sem atividades: cadastre ao menos uma para iniciar o recrutamento'),
    ).toBeInTheDocument();
    expect(within(painel()).getByText(/O protocolo pode ser alterado enquanto o estudo estiver em Planejamento/)).toBeInTheDocument();
  });

  it('mostra no quadro e no cabeçalho a visita sem atividade como pendência', async () => {
    await renderizar(criarServicos(), '/estudos/1');

    const visita = within(quadro()).getAllByRole('listitem')[2];
    expect(visita).toHaveTextContent('Pendente: Visitas com pelo menos uma atividade cadaSem atividade: Acompanhamento');
    expect(within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' })).toHaveAccessibleDescription(
      'Para iniciar o recrutamento, falta: Visitas com pelo menos uma atividade cada.',
    );
  });

  it('mostra o estado vazio com o botão de adicionar', async () => {
    await renderizar(criarServicos({ visitas: [] }));

    expect(within(painel()).getByText('Nenhuma visita cadastrada.')).toBeInTheDocument();
    expect(within(painel()).getByRole('button', { name: 'Adicionar visita' })).toBeInTheDocument();
  });

  it('adiciona uma visita com a ordem sugerida e validação na tela', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    await usuario.click(within(painel()).getByRole('button', { name: 'Adicionar visita' }));
    const formulario = screen.getByRole('form', { name: 'Nova visita' });
    // Maior ordem já usada (3) + 1
    expect(within(formulario).getByLabelText('Ordem')).toHaveValue(4);
    expect(within(formulario).getByLabelText('Nome da visita')).toHaveFocus();

    // Campos inválidos: nada é enviado
    await usuario.clear(within(formulario).getByLabelText('Ordem'));
    await usuario.type(within(formulario).getByLabelText('Ordem'), '0');
    await usuario.click(within(formulario).getByRole('button', { name: 'Adicionar visita' }));
    expect(within(formulario).getByLabelText('Nome da visita')).toHaveAccessibleDescription('Informe o nome da visita.');
    expect(within(formulario).getByLabelText('Ordem')).toHaveAccessibleDescription(
      'A ordem da visita deve ser maior que zero.',
    );
    expect(servicos.protocolo.adicionarVisita).not.toHaveBeenCalled();

    await usuario.type(within(formulario).getByLabelText('Nome da visita'), '  Visita intermediária ');
    await usuario.clear(within(formulario).getByLabelText('Ordem'));
    await usuario.type(within(formulario).getByLabelText('Ordem'), '2');
    await usuario.type(within(formulario).getByLabelText('Descrição (opcional)'), '   ');
    await usuario.click(within(formulario).getByRole('button', { name: 'Adicionar visita' }));

    // Texto aparado e descrição em branco como null, como o backend grava
    expect(servicos.protocolo.adicionarVisita).toHaveBeenCalledWith(1, {
      nome: 'Visita intermediária',
      descricao: null,
      ordem: 2,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Visita adicionada.');
    expect(screen.queryByRole('form', { name: 'Nova visita' })).not.toBeInTheDocument();
    expect(
      within(painel())
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['1 · Visita inicial', '2 · Visita intermediária', '3 · Acompanhamento']);
  });

  it('mostra ORDEM_VISITA_DUPLICADA no campo da ordem e os demais erros do backend no formulário', async () => {
    const adicionarVisita = vi
      .fn()
      .mockRejectedValueOnce(
        new ErroRequisicao(400, {
          codigo: 'ORDEM_VISITA_DUPLICADA',
          mensagem: 'Já existe uma visita prevista com essa ordem.',
        }),
      )
      .mockRejectedValueOnce(
        new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos: { nome: 'O nome deve ter no máximo 150 caracteres.' },
        }),
      )
      .mockRejectedValueOnce(
        new ErroRequisicao(400, {
          codigo: 'ESTUDO_FORA_PLANEJAMENTO',
          mensagem: 'As visitas previstas só podem ser alteradas enquanto o estudo estiver em planejamento.',
        }),
      );
    await renderizar(criarServicos({}, { adicionarVisita }));
    const usuario = userEvent.setup();

    await usuario.click(within(painel()).getByRole('button', { name: 'Adicionar visita' }));
    const formulario = screen.getByRole('form', { name: 'Nova visita' });
    await usuario.type(within(formulario).getByLabelText('Nome da visita'), 'Repetida');
    const enviar = () => usuario.click(within(formulario).getByRole('button', { name: 'Adicionar visita' }));

    await enviar();
    const ordem = within(formulario).getByLabelText('Ordem');
    await vi.waitFor(() =>
      expect(ordem).toHaveAccessibleDescription('Já existe uma visita prevista com essa ordem.'),
    );
    expect(ordem).toHaveAttribute('aria-invalid', 'true');

    await enviar();
    await vi.waitFor(() =>
      expect(within(formulario).getByLabelText('Nome da visita')).toHaveAccessibleDescription(
        'O nome deve ter no máximo 150 caracteres.',
      ),
    );

    await enviar();
    expect(await within(formulario).findByRole('alert')).toHaveTextContent(
      'As visitas previstas só podem ser alteradas enquanto o estudo estiver em planejamento.',
    );
  });

  it('edita uma visita e reordena a lista', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Editar visita: Visita inicial' }));
    const formulario = screen.getByRole('form', { name: 'Editar visita Visita inicial' });
    expect(within(formulario).getByLabelText('Nome da visita')).toHaveValue('Visita inicial');
    expect(within(formulario).getByLabelText('Descrição (opcional)')).toHaveValue('Apresentação do estudo.');
    await usuario.clear(within(formulario).getByLabelText('Ordem'));
    await usuario.type(within(formulario).getByLabelText('Ordem'), '5');
    await usuario.click(within(formulario).getByRole('button', { name: 'Salvar' }));

    expect(servicos.protocolo.editarVisita).toHaveBeenCalledWith(1, 1, {
      nome: 'Visita inicial',
      descricao: 'Apresentação do estudo.',
      ordem: 5,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Visita atualizada.');
    expect(
      within(painel())
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['3 · Acompanhamento', '5 · Visita inicial']);
    // As atividades continuam na visita editada
    expect(within(cartao('5 · Visita inicial')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('remove a visita depois de avisar que as atividades saem junto', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    const remover = screen.getByRole('button', { name: 'Remover visita: Visita inicial' });
    await usuario.click(remover);
    const dialogo = screen.getByRole('dialog', { name: 'Remover visita?' });
    expect(dialogo).toHaveAccessibleDescription('“1 · Visita inicial”');
    expect(within(dialogo).getByText('As 2 atividades desta visita também serão removidas.')).toBeInTheDocument();

    // Cancelar não remove e devolve o foco
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    expect(servicos.protocolo.removerVisita).not.toHaveBeenCalled();
    expect(remover).toHaveFocus();

    await usuario.click(remover);
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover visita' }));

    expect(servicos.protocolo.removerVisita).toHaveBeenCalledWith(1, 1);
    expect(await screen.findByRole('status')).toHaveTextContent('Visita removida.');
    expect(screen.queryByRole('region', { name: '1 · Visita inicial' })).not.toBeInTheDocument();
  });

  it('avisa quando a visita removida não tem atividades e mostra a falha no diálogo', async () => {
    const removerVisita = vi.fn().mockRejectedValue(new Error('rede'));
    await renderizar(criarServicos({}, { removerVisita }));
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Remover visita: Acompanhamento' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText('A visita não tem atividades cadastradas.')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Remover visita' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Não foi possível remover a visita.');
    expect(cartao('3 · Acompanhamento')).toBeInTheDocument();
  });

  it('usa o singular quando a visita removida tem uma atividade', async () => {
    const visitas = [{ ...VISITAS[0], atividades: [VISITAS[0].atividades[0]] }];
    await renderizar(criarServicos({ visitas }));

    await userEvent.click(screen.getByRole('button', { name: 'Remover visita: Visita inicial' }));
    expect(screen.getByText('A atividade desta visita também será removida.')).toBeInTheDocument();
  });

  it('adiciona uma atividade e tira a visita da lista de pendências', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    const acompanhamento = cartao('3 · Acompanhamento');
    await usuario.click(within(acompanhamento).getByRole('button', { name: 'Adicionar atividade' }));
    const campo = within(acompanhamento).getByLabelText('Nova atividade');
    expect(campo).toHaveFocus();

    // Validação na tela, com a mensagem do backend
    await usuario.type(campo, '   ');
    await usuario.click(within(acompanhamento).getByRole('button', { name: 'Adicionar' }));
    expect(within(acompanhamento).getByText('Informe a descrição da atividade.')).toBeInTheDocument();
    expect(servicos.protocolo.adicionarAtividade).not.toHaveBeenCalled();

    await usuario.clear(campo);
    await usuario.type(campo, 'Revisar o diário de sono.');
    expect(within(acompanhamento).getByText('25/1.000')).toBeInTheDocument();
    await usuario.click(within(acompanhamento).getByRole('button', { name: 'Adicionar' }));

    expect(servicos.protocolo.adicionarAtividade).toHaveBeenCalledWith(1, 2, 'Revisar o diário de sono.');
    expect(await screen.findByRole('status')).toHaveTextContent('Atividade adicionada.');
    expect(within(acompanhamento).getByRole('listitem')).toHaveTextContent('Revisar o diário de sono.');
    expect(acompanhamento).not.toHaveClass('protocolo-visita-pendente');
    expect(within(acompanhamento).queryByText(/Sem atividades/)).not.toBeInTheDocument();

    // O quadro passa a considerar as visitas completas e o recrutamento fica liberado
    await usuario.click(screen.getByRole('tab', { name: 'Resumo' }));
    expect(within(quadro()).getByText('Pronto')).toBeInTheDocument();
    expect(within(quadro()).getAllByRole('listitem')[2]).toHaveTextContent('2 visitas cadastradas');
    expect(within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' })).toBeEnabled();
  });

  it('edita e remove uma atividade', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Editar atividade: Entregar o diário de sono.' }));
    const campo = screen.getByLabelText('Editar atividade');
    expect(campo).toHaveValue('Entregar o diário de sono.');
    await usuario.clear(campo);
    await usuario.type(campo, 'Entregar o diário impresso.');
    await usuario.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(servicos.protocolo.editarAtividade).toHaveBeenCalledWith(1, 1, 2, 'Entregar o diário impresso.');
    expect(await screen.findByRole('status')).toHaveTextContent('Atividade atualizada.');
    expect(within(cartao('1 · Visita inicial')).getAllByRole('listitem')[1]).toHaveTextContent(
      'Entregar o diário impresso.',
    );

    await usuario.click(screen.getByRole('button', { name: 'Remover atividade: Aplicar questionário fictício.' }));
    const dialogo = screen.getByRole('dialog', { name: 'Remover atividade?' });
    expect(within(dialogo).getByText('A atividade sai da visita “Visita inicial”.')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Remover atividade' }));

    expect(servicos.protocolo.removerAtividade).toHaveBeenCalledWith(1, 1, 1);
    expect(await screen.findByText('Atividade removida.')).toBeInTheDocument();
    expect(within(cartao('1 · Visita inicial')).getAllByRole('listitem')).toHaveLength(1);
  });

  it('mantém um formulário aberto por vez', async () => {
    await renderizar(criarServicos());
    const usuario = userEvent.setup();

    await usuario.click(within(painel()).getByRole('button', { name: 'Adicionar visita' }));
    await usuario.click(within(cartao('1 · Visita inicial')).getByRole('button', { name: 'Adicionar atividade' }));

    expect(screen.queryByRole('form', { name: 'Nova visita' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nova atividade')).toBeInTheDocument();
    // Cancelar fecha o formulário e devolve o botão
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Nova atividade')).not.toBeInTheDocument();
  });

  it('fica somente leitura fora de Planejamento', async () => {
    const visitas = [{ ...VISITAS[0] }];
    await renderizar(criarServicos({ estudo: { ...ESTUDO, estado: 'RECRUTAMENTO' }, visitas }));

    expect(
      within(painel()).getByText(
        'O protocolo fica só para consulta depois que o recrutamento é aberto: as visitas não podem mais ser alteradas.',
      ),
    ).toBeInTheDocument();
    expect(within(cartao('1 · Visita inicial')).getAllByRole('listitem')).toHaveLength(2);
    expect(within(painel()).queryByRole('button')).not.toBeInTheDocument();
  });

  it('sem editar e remover no backend, só mostra os botões de adicionar', async () => {
    await renderizar(criarServicos({ editarRemover: false }));
    const usuario = userEvent.setup();

    expect(within(painel()).getByRole('button', { name: 'Adicionar visita' })).toBeInTheDocument();
    expect(within(cartao('1 · Visita inicial')).getByRole('button', { name: 'Adicionar atividade' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar (visita|atividade)/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remover (visita|atividade)/ })).not.toBeInTheDocument();

    // O mesmo vale para os critérios
    await usuario.click(screen.getByRole('tab', { name: 'Critérios' }));
    expect(screen.getAllByRole('button', { name: 'Adicionar critério' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /^Editar critério/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remover critério/ })).not.toBeInTheDocument();
  });
});

// <-------------------PONTA A PONTA NO SIMULADO------------------->
// Serviços simulados de verdade, ligados como no app: o simulado de estudos consulta o protocolo
describe('ProtocoloEstudo: completar o protocolo e iniciar o recrutamento', () => {
  it('completa o estudo 1 do simulado e abre o recrutamento', async () => {
    // Um depende do outro: o simulado de estudos só consulta o protocolo na hora da mudança
    const ligacao: { protocolo?: ServicoProtocolo } = {};
    const estudos = criarServicoEstudosSimulado([ESTUDO], {
      protocolo: (id) => ligacao.protocolo!.obter(id),
      possuiInclusoes: async () => false,
    });
    const protocolo = criarServicoProtocoloSimulado(estudos, PROTOCOLOS_INICIAIS);
    ligacao.protocolo = protocolo;
    await renderizar({ estudos, protocolo }, '/estudos/1?aba=criterios');
    const usuario = userEvent.setup();

    const iniciar = within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' });
    expect(iniciar).toBeDisabled();

    // Critérios: o estudo não tem exclusões
    const opcao = screen.getByRole('checkbox', { name: 'Este estudo não possui critérios de exclusão' });
    await usuario.click(opcao);
    await vi.waitFor(() => expect(opcao).toBeChecked());
    expect(iniciar).toHaveAccessibleDescription('Para iniciar o recrutamento, falta: Visitas com pelo menos uma atividade cada.');

    // Visitas: a de acompanhamento ganha a primeira atividade
    await usuario.click(screen.getByRole('tab', { name: 'Visitas' }));
    const acompanhamento = cartao('2 · Acompanhamento');
    await usuario.click(within(acompanhamento).getByRole('button', { name: 'Adicionar atividade' }));
    await usuario.type(within(acompanhamento).getByLabelText('Nova atividade'), 'Revisar o diário de sono.');
    await usuario.click(within(acompanhamento).getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Atividade adicionada.')).toBeInTheDocument();

    // Recrutamento: o botão libera e o simulado confere tudo de novo antes de aceitar
    await vi.waitFor(() => expect(iniciar).toBeEnabled());
    await usuario.click(iniciar);
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Iniciar recrutamento' }));

    expect(await screen.findByText('Recrutamento iniciado.', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(within(cabecalho()).getByText('Recrutamento')).toHaveClass('etiqueta-recrutamento');
    // As visitas ficam só para consulta, também no simulado
    expect(within(painel()).queryByRole('button')).not.toBeInTheDocument();
    await expect(protocolo.adicionarAtividade(1, 2, 'Outra.')).rejects.toMatchObject({
      codigo: 'ESTUDO_FORA_PLANEJAMENTO',
    });
  });
});
