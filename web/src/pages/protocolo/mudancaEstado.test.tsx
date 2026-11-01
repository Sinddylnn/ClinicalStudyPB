import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroRequisicao } from '../../api/erros';
import type { AlteracaoEstadoEntrada, Estudo, ServicoEstudos } from '../../api/estudos';
import { criarServicoEstudosSimulado } from '../../api/estudosSimulado';
import type { Protocolo, ServicoProtocolo } from '../../api/protocolo';
import type { UsuarioSessao } from '../../api/autenticacao';
import ListaEstudos from '../estudos/ListaEstudos';
import ProtocoloEstudo from './ProtocoloEstudo';

// <-------------------VISITAS PREVISTAS (T46)------------------->
// Sem o cadastro de visitas, o requisito VISITA_PREVISTA nunca é atendido e o recrutamento não
// abre. Para testar a abertura, os testes podem marcar as visitas como cadastradas
const visitas = vi.hoisted(() => ({ cadastradas: false }));

vi.mock('./validacao', async (importOriginal) => {
  const original = await importOriginal<typeof import('./validacao')>();
  return {
    ...original,
    requisitosRecrutamento: (...args: Parameters<typeof original.requisitosRecrutamento>) => ({
      ...original.requisitosRecrutamento(...args),
      VISITA_PREVISTA: visitas.cadastradas,
    }),
  };
});

// <-------------------TESTES DA MUDANÇA DE ESTADO NA TELA DO ESTUDO------------------->
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

const PROTOCOLO: Protocolo = {
  estudoId: 1,
  criteriosInclusao: [{ id: 1, descricao: 'Estudantes de graduação.' }],
  criteriosExclusao: [],
  semCriteriosExclusao: false,
  pendenciasRecrutamento: ['CRITERIOS_EXCLUSAO', 'VISITA_PREVISTA'],
};

// Protocolo completo, exceto pelas visitas, que dependem da T46
const PROTOCOLO_COMPLETO: Partial<Protocolo> = { semCriteriosExclusao: true, pendenciasRecrutamento: [] };

// Por padrão, o "backend" aceita a mudança e devolve o estudo com o novo estado
function criarServicos(estudo: Estudo = ESTUDO, protocolo: Partial<Protocolo> = {}) {
  const estudos: ServicoEstudos = {
    listar: vi.fn().mockResolvedValue([estudo]),
    cadastrar: vi.fn(),
    alterarEstado: vi.fn().mockImplementation((_id: number, entrada: AlteracaoEstadoEntrada) =>
      Promise.resolve({
        ...estudo,
        estado: entrada.estado,
        justificativaEncerramento: entrada.justificativaEncerramento ?? null,
      }),
    ),
  };
  const servicoProtocolo: ServicoProtocolo = {
    obter: vi.fn().mockResolvedValue({ ...PROTOCOLO, ...protocolo }),
    adicionarCriterio: vi.fn(),
    editarCriterio: vi.fn(),
    removerCriterio: vi.fn(),
    definirSemExclusao: vi.fn(),
  };
  return { estudos, protocolo: servicoProtocolo };
}

function renderizar(servicos: ReturnType<typeof criarServicos>, caminho = '/estudos/1') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/estudos" element={<ListaEstudos servico={servicos.estudos} usuario={PESQUISADORA} />} />
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

const cabecalho = () => screen.getByRole('heading', { level: 1 }).closest('header') as HTMLElement;

const secaoEstado = () => screen.getByRole('region', { name: 'Estado do estudo' });

const acoes = () => within(cabecalho()).queryAllByRole('button').map((botao) => botao.textContent);

const dialogo = () => screen.getByRole('dialog');

describe('ProtocoloEstudo: mudança de estado', () => {
  beforeEach(() => {
    visitas.cadastradas = false;
  });

  it('em Planejamento, desativa "Iniciar recrutamento" e explica o que falta, inclusive as visitas', async () => {
    await renderizar(criarServicos());

    expect(acoes()).toEqual(['Iniciar recrutamento', 'Encerrar estudo']);
    const iniciar = within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' });
    expect(iniciar).toBeDisabled();
    expect(iniciar).toHaveAccessibleDescription(
      'Para iniciar o recrutamento, falta: Critérios de exclusão definidos; Visitas com pelo menos uma atividade cada (o cadastro de visitas chega em breve).',
    );
    expect(within(cabecalho()).getByRole('button', { name: 'Encerrar estudo' })).toBeEnabled();

    // O cartão do Resumo mostra o estado e o que ele permite
    expect(within(secaoEstado()).getByText('Planejamento')).toHaveClass('etiqueta-planejamento');
    expect(within(secaoEstado()).getByText(/O protocolo pode ser configurado/)).toBeInTheDocument();

    // As ações ficam no cabeçalho, visíveis em todas as abas
    await userEvent.click(screen.getByRole('tab', { name: 'Critérios' }));
    expect(acoes()).toEqual(['Iniciar recrutamento', 'Encerrar estudo']);
    expect(screen.queryByRole('region', { name: 'Estado do estudo' })).not.toBeInTheDocument();
  });

  it('lista o coordenador entre as pendências do recrutamento', async () => {
    visitas.cadastradas = true;
    await renderizar(criarServicos({ ...ESTUDO, coordenadorId: null }, PROTOCOLO_COMPLETO));

    expect(within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' })).toHaveAccessibleDescription(
      'Para iniciar o recrutamento, falta: Coordenador atribuído.',
    );
  });

  it('inicia o recrutamento depois da confirmação e deixa o protocolo só para consulta', async () => {
    visitas.cadastradas = true;
    const servicos = criarServicos(ESTUDO, PROTOCOLO_COMPLETO);
    await renderizar(servicos);
    const usuario = userEvent.setup();

    const iniciar = within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' });
    expect(iniciar).toBeEnabled();
    expect(iniciar).not.toHaveAccessibleDescription();
    await usuario.click(iniciar);

    expect(dialogo()).toHaveAccessibleName('Iniciar o recrutamento?');
    expect(dialogo()).toHaveAccessibleDescription('“Sono e rotina de estudantes” passa de Planejamento para Recrutamento.');
    expect(within(dialogo()).getByText(/O protocolo fica somente para consulta/)).toBeInTheDocument();
    expect(within(dialogo()).queryByRole('textbox')).not.toBeInTheDocument();
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Iniciar recrutamento' }));

    // Sem justificativa: o backend a recusa fora do encerramento
    expect(servicos.estudos.alterarEstado).toHaveBeenCalledWith(1, { estado: 'RECRUTAMENTO' });
    const notificacao = await screen.findByRole('status');
    expect(notificacao).toHaveTextContent('Recrutamento iniciado.');
    expect(notificacao).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(cabecalho()).getByText('Recrutamento')).toHaveClass('etiqueta-recrutamento');
    expect(within(secaoEstado()).getByText('Recrutamento')).toBeInTheDocument();
    expect(acoes()).toEqual(['Iniciar execução', 'Encerrar estudo']);
    expect(screen.queryByRole('complementary', { name: 'Para iniciar o recrutamento' })).not.toBeInTheDocument();

    // A edição dos critérios trava na hora, sem recarregar
    await usuario.click(screen.getByRole('tab', { name: 'Critérios' }));
    expect(screen.queryByRole('button', { name: 'Adicionar critério' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar critério/ })).not.toBeInTheDocument();
    expect(screen.getByText(/O protocolo fica só para consulta/)).toBeInTheDocument();
  });

  it('mostra no diálogo a recusa do backend e mantém o estado exibido', async () => {
    visitas.cadastradas = true;
    const servicos = criarServicos(ESTUDO, PROTOCOLO_COMPLETO);
    vi.mocked(servicos.estudos.alterarEstado).mockRejectedValue(
      new ErroRequisicao(400, {
        codigo: 'PROTOCOLO_INCOMPLETO',
        mensagem: 'Cadastre pelo menos uma atividade na visita: Visita inicial.',
      }),
    );
    await renderizar(servicos);
    const usuario = userEvent.setup();

    const iniciar = within(cabecalho()).getByRole('button', { name: 'Iniciar recrutamento' });
    await usuario.click(iniciar);
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Iniciar recrutamento' }));

    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent(
      'Cadastre pelo menos uma atividade na visita: Visita inicial.',
    );
    expect(within(dialogo()).getByRole('button', { name: 'Iniciar recrutamento' })).toBeEnabled();
    expect(within(cabecalho()).getByText('Planejamento')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // Ao cancelar, o foco volta ao botão que abriu o diálogo
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(iniciar).toHaveFocus();
  });

  it('em Recrutamento, oferece iniciar a execução e mostra a recusa sem participantes', async () => {
    const servicos = criarServicos({ ...ESTUDO, estado: 'RECRUTAMENTO' });
    vi.mocked(servicos.estudos.alterarEstado).mockRejectedValueOnce(
      new ErroRequisicao(400, {
        codigo: 'ESTUDO_SEM_PARTICIPANTES',
        mensagem: 'Inclua pelo menos um participante antes de iniciar a execução.',
      }),
    );
    await renderizar(servicos);
    const usuario = userEvent.setup();

    // A pesquisadora não vê os candidatos: o botão não depende das inclusões
    expect(acoes()).toEqual(['Iniciar execução', 'Encerrar estudo']);
    await usuario.click(within(cabecalho()).getByRole('button', { name: 'Iniciar execução' }));
    expect(dialogo()).toHaveAccessibleName('Iniciar a execução?');
    expect(within(dialogo()).getByText('Novas inclusões de participantes ficam bloqueadas.')).toBeInTheDocument();
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Iniciar execução' }));
    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent(
      'Inclua pelo menos um participante antes de iniciar a execução.',
    );

    // Na segunda tentativa o backend aceita
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Iniciar execução' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Execução iniciada.');
    expect(servicos.estudos.alterarEstado).toHaveBeenLastCalledWith(1, { estado: 'EXECUCAO' });
    expect(acoes()).toEqual(['Encerrar estudo']);
    expect(within(secaoEstado()).getByText(/Novas inclusões estão bloqueadas/)).toBeInTheDocument();
  });

  it('exige a justificativa no encerramento antecipado, com a validação do backend', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    await usuario.click(within(cabecalho()).getByRole('button', { name: 'Encerrar estudo' }));
    expect(dialogo()).toHaveAccessibleName('Encerrar o estudo?');
    expect(within(dialogo()).getByText(/O encerramento não pode ser desfeito/)).toBeInTheDocument();
    const campo = within(dialogo()).getByLabelText('Justificativa (obrigatória)');
    expect(campo).toBeRequired();
    expect(campo).toHaveAccessibleDescription(
      'Explique por que o estudo será encerrado antes da execução. Até 500 caracteres.',
    );

    // Só espaços equivale a não informar
    await usuario.type(campo, '   ');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));
    expect(campo).toHaveAccessibleDescription('Informe a justificativa para encerrar o estudo antes da execução.');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveFocus();
    expect(servicos.estudos.alterarEstado).not.toHaveBeenCalled();

    // Acima de 500 caracteres após aparar
    await usuario.clear(campo);
    await usuario.click(campo);
    await usuario.paste('a'.repeat(501));
    expect(within(dialogo()).getByText('501/500')).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'false');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));
    expect(campo).toHaveAccessibleDescription('A justificativa deve ter no máximo 500 caracteres.');
    expect(servicos.estudos.alterarEstado).not.toHaveBeenCalled();

    // Exatamente 500 depois de aparar: aceita e envia sem os espaços das pontas
    const motivo = `  ${'b'.repeat(500)}  `;
    await usuario.clear(campo);
    await usuario.click(campo);
    await usuario.paste(motivo);
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));

    expect(servicos.estudos.alterarEstado).toHaveBeenCalledWith(1, {
      estado: 'ENCERRADO',
      justificativaEncerramento: 'b'.repeat(500),
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Estudo encerrado.');
    expect(screen.getByRole('status')).toHaveFocus();
    expect(acoes()).toEqual([]);
    expect(within(secaoEstado()).getByText('Encerrado')).toHaveClass('etiqueta-encerrado');
    expect(within(secaoEstado()).getByText('Justificativa do encerramento')).toBeInTheDocument();
    expect(within(secaoEstado()).getByText('b'.repeat(500))).toBeInTheDocument();
  });

  it('deixa a justificativa opcional ao encerrar a partir da execução', async () => {
    const servicos = criarServicos({ ...ESTUDO, estado: 'EXECUCAO' });
    await renderizar(servicos);
    const usuario = userEvent.setup();

    expect(acoes()).toEqual(['Encerrar estudo']);
    await usuario.click(within(cabecalho()).getByRole('button', { name: 'Encerrar estudo' }));
    expect(dialogo()).toHaveAccessibleDescription('“Sono e rotina de estudantes” passa de Execução para Encerrado.');
    const campo = within(dialogo()).getByLabelText('Justificativa (opcional)');
    expect(campo).not.toBeRequired();
    expect(campo).toHaveAccessibleDescription('Até 500 caracteres.');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));

    expect(servicos.estudos.alterarEstado).toHaveBeenCalledWith(1, {
      estado: 'ENCERRADO',
      justificativaEncerramento: null,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Estudo encerrado.');
    // Sem motivo registrado, o cartão não mostra a justificativa
    expect(within(secaoEstado()).queryByText('Justificativa do encerramento')).not.toBeInTheDocument();
  });

  it('mostra no campo o erro de validação do backend e, no diálogo, uma falha inesperada', async () => {
    const servicos = criarServicos();
    vi.mocked(servicos.estudos.alterarEstado)
      .mockRejectedValueOnce(
        new ErroRequisicao(400, {
          codigo: 'VALIDACAO_INVALIDA',
          mensagem: 'Confira os campos informados.',
          errosCampos: { justificativaEncerramento: 'A justificativa deve ter no máximo 500 caracteres.' },
        }),
      )
      .mockRejectedValueOnce(new Error('rede'));
    await renderizar(servicos);
    const usuario = userEvent.setup();

    await usuario.click(within(cabecalho()).getByRole('button', { name: 'Encerrar estudo' }));
    const campo = within(dialogo()).getByLabelText('Justificativa (obrigatória)');
    await usuario.type(campo, 'Estudo cancelado.');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));

    await vi.waitFor(() =>
      expect(campo).toHaveAccessibleDescription('A justificativa deve ter no máximo 500 caracteres.'),
    );
    expect(within(dialogo()).queryByRole('alert')).not.toBeInTheDocument();

    // Editar o texto limpa o erro do campo
    await usuario.type(campo, ' ');
    expect(campo).toHaveAttribute('aria-invalid', 'false');

    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));
    expect(await within(dialogo()).findByRole('alert')).toHaveTextContent('Não foi possível alterar o estado do estudo.');
    expect(within(cabecalho()).getByText('Planejamento')).toBeInTheDocument();
  });

  it('fecha o diálogo com Esc sem alterar o estado', async () => {
    const servicos = criarServicos();
    await renderizar(servicos);
    const usuario = userEvent.setup();

    const encerrar = within(cabecalho()).getByRole('button', { name: 'Encerrar estudo' });
    await usuario.click(encerrar);
    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(encerrar).toHaveFocus();
    expect(servicos.estudos.alterarEstado).not.toHaveBeenCalled();
  });

  it('em Encerrado, não oferece ações e mostra a justificativa registrada', async () => {
    await renderizar(
      criarServicos({ ...ESTUDO, estado: 'ENCERRADO', justificativaEncerramento: 'Financiamento cancelado.' }),
    );

    expect(within(cabecalho()).queryAllByRole('button')).toHaveLength(0);
    expect(within(secaoEstado()).getByText(/disponível somente para consulta/)).toBeInTheDocument();
    expect(within(secaoEstado()).getByText('Financiamento cancelado.')).toBeInTheDocument();
  });

  it('reflete o novo estado na lista "Meus estudos" ao voltar', async () => {
    // Mesma instância do simulado na tela do estudo e na lista, sem inclusões no estudo
    const estudos = criarServicoEstudosSimulado([ESTUDO], {
      pendencias: vi.fn().mockResolvedValue([]),
      possuiInclusoes: vi.fn().mockResolvedValue(false),
    });
    const servicos = { ...criarServicos(), estudos };
    await renderizar(servicos);
    const usuario = userEvent.setup();

    await usuario.click(within(cabecalho()).getByRole('button', { name: 'Encerrar estudo' }));
    await usuario.type(within(dialogo()).getByLabelText('Justificativa (obrigatória)'), 'Estudo cancelado.');
    await usuario.click(within(dialogo()).getByRole('button', { name: 'Encerrar estudo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Estudo encerrado.');

    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' });
    await usuario.click(within(trilha).getByRole('link', { name: 'Meus estudos' }));
    const linha = (await screen.findByRole('link', { name: 'Sono e rotina de estudantes' })).closest('tr') as HTMLElement;
    expect(within(linha).getByText('Encerrado')).toHaveClass('etiqueta-encerrado');
  });
});
