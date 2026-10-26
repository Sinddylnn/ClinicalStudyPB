import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logout, sessaoAtual, type UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import type { ServicoUsuarios, Usuario } from '../../api/usuarios';
import {
  ContextoAutenticacao,
  useUsuarioLogado,
  type Autenticacao,
} from '../../autenticacao/contextoAutenticacao';
import ProvedorAutenticacao from '../../autenticacao/ProvedorAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Login from '../login/Login';
import RotaProtegida from '../../routes/RotaProtegida';
import EditarUsuario from './EditarUsuario';
import ListaUsuarios from './ListaUsuarios';
import NovoUsuario from './NovoUsuario';

// <-------------------SIMULAÇÕES------------------->
// A sessão só é usada nos testes da própria conta; nos demais o usuário vem por props
vi.mock('../../api/autenticacao', () => ({ login: vi.fn(), logout: vi.fn(), sessaoAtual: vi.fn() }));
vi.mock('../../api/cliente', () => ({ registrarTratadoresSessao: vi.fn() }));

const ANA: Usuario = {
  id: 1,
  nome: 'Ana Administradora',
  email: 'admin@exemplo.com',
  perfil: 'ADMINISTRADOR',
  ativo: true,
};
const PAULA: Usuario = {
  id: 2,
  nome: 'Paula Pesquisadora',
  email: 'paula.pesquisadora@exemplo.com',
  perfil: 'PESQUISADOR',
  ativo: true,
};
const CARLOS: Usuario = {
  id: 3,
  nome: 'Carlos Coordenador',
  email: 'carlos.coordenador@exemplo.com',
  perfil: 'COORDENADOR',
  ativo: true,
};
const JOAO: Usuario = {
  id: 4,
  nome: 'João Pereira',
  email: 'joao.pereira@exemplo.com',
  perfil: 'PARTICIPANTE',
  ativo: false,
};
const BRUNO: Usuario = {
  id: 5,
  nome: 'Bruno Admin',
  email: 'bruno@exemplo.com',
  perfil: 'ADMINISTRADOR',
  ativo: true,
};

const USUARIOS = [ANA, PAULA, CARLOS, JOAO];

const sessaoDe = ({ id, nome, email, perfil }: Usuario): UsuarioSessao => ({ id, nome, email, perfil });

function criarServico(parcial: Partial<ServicoUsuarios> = {}): ServicoUsuarios {
  return {
    listar: vi.fn().mockResolvedValue(USUARIOS),
    cadastrar: vi.fn(),
    editar: vi.fn(),
    desativar: vi.fn(),
    reativar: vi.fn(),
    ...parcial,
  };
}

function erroApi(status: number, codigo: string, mensagem: string, errosCampos?: Record<string, string>) {
  return new ErroRequisicao(status, { codigo, mensagem, errosCampos });
}

// Telas com o usuário por props, sem o provedor de autenticação
function renderizar(servico: ServicoUsuarios, caminho = '/usuarios') {
  const ana = sessaoDe(ANA);
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/usuarios" element={<ListaUsuarios servico={servico} usuario={ana} />} />
        <Route path="/usuarios/novo" element={<NovoUsuario servico={servico} usuario={ana} />} />
        <Route path="/usuarios/:id/editar" element={<EditarUsuario servico={servico} usuario={ana} />} />
      </Routes>
    </MemoryRouter>,
  );
}

// Telas com a sessão real (simulada na API): o usuário vem do contexto
function renderizarComSessao(servico: ServicoUsuarios, caminho: string) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <ProvedorAutenticacao>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/acesso-negado" element={<h1>Acesso negado</h1>} />
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<PaginaInicio />} />
          </Route>
          <Route element={<RotaProtegida perfis={['ADMINISTRADOR']} />}>
            <Route path="/usuarios" element={<ListaUsuarios servico={servico} />} />
            <Route path="/usuarios/:id/editar" element={<EditarUsuario servico={servico} />} />
          </Route>
        </Routes>
      </ProvedorAutenticacao>
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

async function preencherCadastro() {
  const usuario = await preencher({
    'Nome completo': '  Paula Souza ',
    'E-mail': 'paula.souza@exemplo.com',
    'Senha inicial': 'Senha123',
  });
  await usuario.selectOptions(screen.getByLabelText('Perfil'), 'PESQUISADOR');
  return usuario;
}

// Busca só na tabela: o nome de quem está logado também aparece na barra
// Início simplificado, com a barra do usuário da sessão
function PaginaInicio() {
  const usuario = useUsuarioLogado();
  return (
    <>
      <BarraNavegacao usuario={usuario} />
      <h1>Início</h1>
    </>
  );
}

const linhaDe = async (nome: string) =>
  within(await screen.findByRole('table')).getByText(nome).closest('tr')!;

beforeEach(() => {
  vi.resetAllMocks();
});

// <-------------------LISTA------------------->
describe('ListaUsuarios', () => {
  it('mostra carregando enquanto busca os usuários', () => {
    renderizar(criarServico({ listar: vi.fn().mockReturnValue(new Promise(() => {})) }));
    expect(screen.getByText('Carregando usuários…')).toBeInTheDocument();
  });

  it('mostra o estado vazio', async () => {
    renderizar(criarServico({ listar: vi.fn().mockResolvedValue([]) }));
    expect(await screen.findByRole('heading', { name: 'Nenhum usuário cadastrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cadastrar usuário' })).toHaveAttribute('href', '/usuarios/novo');
  });

  it('mostra o erro e tenta de novo', async () => {
    const listar = vi
      .fn()
      .mockRejectedValueOnce(erroApi(0, 'SEM_CONEXAO', 'Não foi possível conectar ao servidor. Tente novamente.'))
      .mockResolvedValue(USUARIOS);
    renderizar(criarServico({ listar }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar ao servidor.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Paula Pesquisadora')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('mostra cada usuário com perfil, situação, contagens e o rodapé', async () => {
    renderizar(criarServico());
    const linha = await linhaDe('João Pereira');
    expect(within(linha).getByText('joao.pereira@exemplo.com')).toBeInTheDocument();
    expect(within(linha).getByText('Participante')).toBeInTheDocument();
    expect(within(linha).getByText('Inativo')).toBeInTheDocument();
    expect(within(linha).getByRole('button', { name: 'Reativar João Pereira' })).toBeInTheDocument();
    expect(within(linha).getByRole('link', { name: 'Editar João Pereira' })).toHaveAttribute(
      'href',
      '/usuarios/4/editar',
    );

    expect(screen.getByRole('button', { name: 'Todos 4' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ativos 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inativos 1' })).toBeInTheDocument();
    expect(screen.getByText(/Mostrando 4 usuários/)).toHaveTextContent(
      'Mostrando 4 usuários • O último administrador ativo não pode ser desativado.',
    );
    expect(screen.getByRole('link', { name: 'Novo usuário' })).toHaveAttribute('href', '/usuarios/novo');
  });

  it('ordena por nome, sem diferenciar maiúsculas e acentos', async () => {
    const ester = { ...PAULA, id: 6, nome: 'ester Lima', email: 'ester@exemplo.com' };
    const edson = { ...CARLOS, id: 7, nome: 'Édson Rocha', email: 'edson@exemplo.com' };
    // Ordem do backend sem critério, como no findAll()
    renderizar(criarServico({ listar: vi.fn().mockResolvedValue([PAULA, ester, JOAO, ANA, edson, CARLOS]) }));
    await screen.findByRole('table');

    // Cada linha começa pelo avatar (iniciais) e segue com o nome
    const linhas = screen.getAllByRole('row').slice(1);
    const esperados = [
      'Ana Administradora',
      'Carlos Coordenador',
      'Édson Rocha',
      'ester Lima',
      'João Pereira',
      'Paula Pesquisadora',
    ];
    expect(linhas).toHaveLength(esperados.length);
    esperados.forEach((nome, posicao) => expect(within(linhas[posicao]).getByText(nome)).toBeInTheDocument());
  });

  it('busca por nome ou e-mail', async () => {
    renderizar(criarServico());
    await screen.findByText('Paula Pesquisadora');
    const usuario = userEvent.setup();
    const busca = screen.getByRole('searchbox', { name: 'Buscar por nome ou e-mail' });

    await usuario.type(busca, 'carlos');
    expect(screen.getByText('Carlos Coordenador')).toBeInTheDocument();
    expect(screen.queryByText('Paula Pesquisadora')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 usuário/)).toBeInTheDocument();

    await usuario.clear(busca);
    await usuario.type(busca, 'JOAO.PEREIRA@');
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Carlos Coordenador')).not.toBeInTheDocument();

    await usuario.clear(busca);
    await usuario.type(busca, 'ninguém');
    expect(screen.getByText('Nenhum usuário encontrado com esses filtros.')).toBeInTheDocument();
  });

  it('filtra pelas abas de situação', async () => {
    renderizar(criarServico());
    await screen.findByText('Paula Pesquisadora');
    const usuario = userEvent.setup();

    await usuario.click(screen.getByRole('button', { name: 'Inativos 1' }));
    expect(screen.getByRole('button', { name: 'Inativos 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Paula Pesquisadora')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Ativos 3' }));
    expect(screen.getByText('Paula Pesquisadora')).toBeInTheDocument();
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
  });

  it('filtra por perfil e atualiza as contagens das abas', async () => {
    renderizar(criarServico());
    await screen.findByText('Paula Pesquisadora');

    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Filtrar por perfil' }), 'PARTICIPANTE');

    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.queryByText('Paula Pesquisadora')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ativos 0' })).toBeInTheDocument();
  });

  it('desabilita o desativar do último administrador ativo', async () => {
    renderizar(criarServico());
    const ana = await linhaDe('Ana Administradora');
    expect(within(ana).getByRole('button', { name: 'Desativar Ana Administradora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desativar Paula Pesquisadora' })).toBeEnabled();
  });

  it('com dois administradores ativos, os dois podem ser desativados', async () => {
    renderizar(criarServico({ listar: vi.fn().mockResolvedValue([ANA, BRUNO]) }));
    expect(await screen.findByRole('button', { name: 'Desativar Ana Administradora' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Desativar Bruno Admin' })).toBeEnabled();
  });
});

// <-------------------CADASTRO------------------->
describe('NovoUsuario', () => {
  it('valida os campos antes de enviar, com as mensagens do protótipo', async () => {
    const servico = criarServico();
    renderizar(servico, '/usuarios/novo');
    const usuario = await preencher({ 'E-mail': 'paula.souza@', 'Senha inicial': '12345' });
    await usuario.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar. Confira os campos destacados.');
    expect(screen.getByLabelText('Nome completo')).toHaveAccessibleDescription('Informe o nome completo.');
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@exemplo.com.',
    );
    expect(screen.getByLabelText('Senha inicial')).toHaveAccessibleDescription(
      'A senha deve ter pelo menos 8 caracteres.',
    );
    expect(screen.getByLabelText('Perfil')).toHaveAccessibleDescription('Selecione um perfil.');
    expect(screen.getByLabelText('Perfil')).toHaveAttribute('aria-invalid', 'true');
    expect(servico.cadastrar).not.toHaveBeenCalled();
  });

  it('mostra os errosCampos do backend em cada campo', async () => {
    const servico = criarServico({
      cadastrar: vi.fn().mockRejectedValue(
        erroApi(400, 'VALIDACAO_INVALIDA', 'Confira os campos informados.', {
          email: 'O e-mail informado é inválido.',
        }),
      ),
    });
    renderizar(servico, '/usuarios/novo');
    const usuario = await preencherCadastro();
    await usuario.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar. Confira os campos destacados.',
    );
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('O e-mail informado é inválido.');
  });

  it('mostra o e-mail duplicado (409) no campo e-mail', async () => {
    const servico = criarServico({
      cadastrar: vi
        .fn()
        .mockRejectedValue(
          erroApi(409, 'EMAIL_JA_CADASTRADO', 'Já existe um usuário cadastrado com este e-mail.'),
        ),
    });
    renderizar(servico, '/usuarios/novo');
    const usuario = await preencherCadastro();
    await usuario.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    await waitFor(() =>
      expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
        'Já existe um usuário cadastrado com este e-mail.',
      ),
    );
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true');
  });

  it('mostra SENHA_MUITO_LONGA no campo senha', async () => {
    const servico = criarServico({
      cadastrar: vi
        .fn()
        .mockRejectedValue(erroApi(400, 'SENHA_MUITO_LONGA', 'A senha deve ter no máximo 72 bytes em UTF-8.')),
    });
    renderizar(servico, '/usuarios/novo');
    const usuario = await preencherCadastro();
    await usuario.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Senha inicial')).toHaveAccessibleDescription(
        'A senha deve ter no máximo 72 bytes em UTF-8.',
      ),
    );
  });

  it('cadastra e volta para a lista com notificação e a linha destacada', async () => {
    const PAULA_SOUZA: Usuario = {
      id: 7,
      nome: 'Paula Souza',
      email: 'paula.souza@exemplo.com',
      perfil: 'PESQUISADOR',
      ativo: true,
    };
    const servico = criarServico({
      cadastrar: vi.fn().mockResolvedValue(PAULA_SOUZA),
      listar: vi.fn().mockResolvedValue([...USUARIOS, PAULA_SOUZA]),
    });
    renderizar(servico, '/usuarios/novo');
    const usuario = await preencherCadastro();
    await usuario.click(screen.getByRole('button', { name: 'Salvar usuário' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário cadastrado com sucesso.');
    expect(await linhaDe('Paula Souza')).toHaveClass('usuarios-linha-destacada');
    expect(servico.cadastrar).toHaveBeenCalledWith({
      nome: 'Paula Souza',
      email: 'paula.souza@exemplo.com',
      senha: 'Senha123',
      perfil: 'PESQUISADOR',
    });
  });
});

// <-------------------EDIÇÃO------------------->
describe('EditarUsuario', () => {
  it('carrega os dados da conta, sem o campo de senha', async () => {
    renderizar(criarServico(), '/usuarios/3/editar');
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Carlos Coordenador');
    expect(screen.getByLabelText('E-mail')).toHaveValue('carlos.coordenador@exemplo.com');
    expect(screen.getByLabelText('Perfil')).toHaveValue('COORDENADOR');
    expect(screen.queryByLabelText('Senha inicial')).not.toBeInTheDocument();
    expect(screen.getByText('Para desativar, use a ação na lista.')).toBeInTheDocument();
  });

  it.each([
    ['ULTIMO_ADMINISTRADOR', 'O perfil do último administrador ativo não pode ser alterado.'],
    ['PERFIL_COM_VINCULOS', 'Não é possível alterar o perfil enquanto houver vínculos incompatíveis com estudos.'],
  ])('mostra %s no campo perfil', async (codigo, mensagem) => {
    const servico = criarServico({ editar: vi.fn().mockRejectedValue(erroApi(400, codigo, mensagem)) });
    renderizar(servico, '/usuarios/3/editar');
    await screen.findByLabelText('Perfil');
    const usuario = userEvent.setup();
    await usuario.selectOptions(screen.getByLabelText('Perfil'), 'PARTICIPANTE');
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(screen.getByLabelText('Perfil')).toHaveAccessibleDescription(mensagem));
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar. Confira os campos destacados.');
  });

  it('avisa quando o usuário não existe (404 ao carregar)', async () => {
    renderizar(criarServico(), '/usuarios/99/editar');
    expect(await screen.findByRole('heading', { name: 'Usuário não encontrado' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para usuários' })).toHaveAttribute('href', '/usuarios');
  });

  it('mostra o erro ao carregar e tenta de novo com sucesso', async () => {
    const listar = vi
      .fn()
      .mockRejectedValueOnce(erroApi(0, 'SEM_CONEXAO', 'Não foi possível conectar ao servidor. Tente novamente.'))
      .mockResolvedValue(USUARIOS);
    renderizar(criarServico({ listar }), '/usuarios/3/editar');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor. Tente novamente.',
    );
    expect(screen.queryByLabelText('Nome completo')).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Carlos Coordenador');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(2);
  });

  it('valida os campos vazios na edição sem chamar a API', async () => {
    const servico = criarServico();
    renderizar(servico, '/usuarios/3/editar');
    await screen.findByLabelText('Nome completo');
    const usuario = userEvent.setup();
    await usuario.clear(screen.getByLabelText('Nome completo'));
    await usuario.clear(screen.getByLabelText('E-mail'));
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar. Confira os campos destacados.');
    expect(screen.getByLabelText('Nome completo')).toHaveAccessibleDescription('Informe o nome completo.');
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription(
      'Informe um e-mail válido, como nome@exemplo.com.',
    );
    expect(servico.editar).not.toHaveBeenCalled();
  });

  it('avisa quando o usuário deixou de existir ao salvar (404)', async () => {
    const servico = criarServico({
      editar: vi.fn().mockRejectedValue(erroApi(404, 'RECURSO_NAO_ENCONTRADO', 'Usuário não encontrado.')),
    });
    renderizar(servico, '/usuarios/3/editar');
    await screen.findByLabelText('Perfil');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('heading', { name: 'Usuário não encontrado' })).toBeInTheDocument();
  });

  it('salva e volta para a lista com notificação', async () => {
    const editado = { ...CARLOS, nome: 'Carlos Lima' };
    const servico = criarServico({
      editar: vi.fn().mockResolvedValue(editado),
      listar: vi.fn().mockResolvedValue([ANA, PAULA, editado, JOAO]),
    });
    renderizar(servico, '/usuarios/3/editar');
    await screen.findByLabelText('Nome completo');
    const usuario = await preencher({ 'Nome completo': 'Carlos Lima' });
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário atualizado com sucesso.');
    expect(await linhaDe('Carlos Lima')).toHaveClass('usuarios-linha-destacada');
    expect(servico.editar).toHaveBeenCalledWith(3, {
      nome: 'Carlos Lima',
      email: 'carlos.coordenador@exemplo.com',
      perfil: 'COORDENADOR',
    });
  });
});

// <-------------------DESATIVAR E REATIVAR------------------->
describe('desativar e reativar', () => {
  it('desativa depois de confirmar e atualiza a linha', async () => {
    const servico = criarServico({ desativar: vi.fn().mockResolvedValue({ ...PAULA, ativo: false }) });
    renderizar(servico);
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Desativar Paula Pesquisadora' }));

    const dialogo = screen.getByRole('dialog', { name: 'Desativar Paula Pesquisadora?' });
    expect(dialogo).toHaveFocus();
    expect(dialogo).toHaveTextContent('Novos logins são bloqueados e sessões abertas encerradas.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Desativar conta' }));

    expect(await screen.findByRole('status')).toHaveTextContent('A conta de Paula Pesquisadora foi desativada.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const linha = await linhaDe('Paula Pesquisadora');
    expect(within(linha).getByText('Inativo')).toBeInTheDocument();
    expect(linha).toHaveClass('usuarios-linha-destacada');
    expect(servico.desativar).toHaveBeenCalledWith(2);
  });

  it('reativa depois de confirmar', async () => {
    const servico = criarServico({ reativar: vi.fn().mockResolvedValue({ ...JOAO, ativo: true }) });
    renderizar(servico);
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Reativar João Pereira' }));

    const dialogo = screen.getByRole('dialog', { name: 'Reativar João Pereira?' });
    expect(dialogo).toHaveTextContent('Nenhuma conta nova é criada, sem duplicar o e-mail.');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Reativar conta' }));

    expect(await screen.findByRole('status')).toHaveTextContent('A conta de João Pereira foi reativada.');
    expect(within(await linhaDe('João Pereira')).getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inativos 0' })).toBeInTheDocument();
  });

  it('Cancelar e Esc fecham sem chamar a API e devolvem o foco ao botão', async () => {
    const servico = criarServico();
    renderizar(servico);
    const usuario = userEvent.setup();
    const botao = await screen.findByRole('button', { name: 'Desativar Paula Pesquisadora' });

    await usuario.click(botao);
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(botao).toHaveFocus();

    await usuario.click(botao);
    await usuario.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(servico.desativar).not.toHaveBeenCalled();
  });

  it('prende o foco no diálogo: Tab no último volta ao primeiro, Shift+Tab no primeiro vai ao último', async () => {
    renderizar(criarServico());
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Desativar Paula Pesquisadora' }));
    const dialogo = screen.getByRole('dialog');
    const cancelar = within(dialogo).getByRole('button', { name: 'Cancelar' });
    const confirmar = within(dialogo).getByRole('button', { name: 'Desativar conta' });

    confirmar.focus();
    await usuario.tab();
    expect(cancelar).toHaveFocus();

    await usuario.tab({ shift: true });
    expect(confirmar).toHaveFocus();
  });

  it('Shift+Tab logo ao abrir (foco no próprio diálogo) vai ao último botão', async () => {
    renderizar(criarServico());
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Desativar Paula Pesquisadora' }));
    expect(screen.getByRole('dialog')).toHaveFocus();

    await usuario.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Desativar conta' })).toHaveFocus();
  });

  it('mostra ULTIMO_ADMINISTRADOR dentro do diálogo', async () => {
    const servico = criarServico({
      listar: vi.fn().mockResolvedValue([ANA, BRUNO]),
      desativar: vi
        .fn()
        .mockRejectedValue(erroApi(400, 'ULTIMO_ADMINISTRADOR', 'O último administrador ativo não pode ser desativado.')),
    });
    renderizar(servico);
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Desativar Bruno Admin' }));
    await usuario.click(screen.getByRole('button', { name: 'Desativar conta' }));

    const dialogo = screen.getByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'O último administrador ativo não pode ser desativado.',
    );
    expect(within(await linhaDe('Bruno Admin')).getByText('Ativo')).toBeInTheDocument();
  });
});

// <-------------------A PRÓPRIA CONTA------------------->
describe('a própria conta do administrador', () => {
  it('desativar a própria conta encerra a sessão e leva ao login', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(sessaoDe(ANA));
    // Conta já inativa: o logout responde 401, que o Sair trata como sessão encerrada
    vi.mocked(logout).mockRejectedValue(
      erroApi(401, 'AUTENTICACAO_NECESSARIA', 'Entre no sistema para realizar esta operação.'),
    );
    const servico = criarServico({
      listar: vi.fn().mockResolvedValue([ANA, BRUNO]),
      desativar: vi.fn().mockResolvedValue({ ...ANA, ativo: false }),
    });
    renderizarComSessao(servico, '/usuarios');
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Desativar Ana Administradora' }));

    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('sua sessão será encerrada e você voltará para a tela de login');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Desativar conta' }));

    expect(await screen.findByRole('heading', { name: 'Entrar na sua conta' })).toBeInTheDocument();
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('avisa no diálogo quando a conta foi desativada, mas o sair() falhou', async () => {
    vi.mocked(sessaoAtual).mockResolvedValue(sessaoDe(ANA));
    vi.mocked(logout).mockRejectedValue(
      erroApi(0, 'SEM_CONEXAO', 'Não foi possível conectar ao servidor. Tente novamente.'),
    );
    const servico = criarServico({
      listar: vi.fn().mockResolvedValue([ANA, BRUNO]),
      desativar: vi.fn().mockResolvedValue({ ...ANA, ativo: false }),
    });
    renderizarComSessao(servico, '/usuarios');
    const usuario = userEvent.setup();
    await usuario.click(await screen.findByRole('button', { name: 'Desativar Ana Administradora' }));
    await usuario.click(screen.getByRole('button', { name: 'Desativar conta' }));

    const dialogo = screen.getByRole('dialog');
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Sua conta foi desativada, mas não foi possível encerrar a sessão. Recarregue a página.',
    );
    expect(screen.queryByRole('heading', { name: 'Entrar na sua conta' })).not.toBeInTheDocument();
  });

  it('editar a própria conta chama atualizarSessao() antes de voltar à lista', async () => {
    // Contexto simulado: sem o provedor, nenhuma revalidação poderia atualizar a sessão no lugar dele
    const atualizarSessao = vi.fn().mockResolvedValue(undefined);
    const contexto: Autenticacao = {
      usuario: sessaoDe(ANA),
      carregando: false,
      avisoSessao: null,
      saidaVoluntaria: false,
      entrar: vi.fn(),
      sair: vi.fn(),
      atualizarSessao,
    };
    const servico = criarServico({
      listar: vi.fn().mockResolvedValue([ANA, BRUNO]),
      editar: vi.fn().mockResolvedValue({ ...ANA, nome: 'Ana Maria Souza' }),
    });
    render(
      <ContextoAutenticacao.Provider value={contexto}>
        <MemoryRouter initialEntries={['/usuarios/1/editar']}>
          <Routes>
            <Route path="/usuarios" element={<ListaUsuarios servico={servico} />} />
            <Route path="/usuarios/:id/editar" element={<EditarUsuario servico={servico} />} />
          </Routes>
        </MemoryRouter>
      </ContextoAutenticacao.Provider>,
    );
    await screen.findByLabelText('Nome completo');
    const usuario = await preencher({ 'Nome completo': 'Ana Maria Souza' });
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário atualizado com sucesso.');
    expect(atualizarSessao).toHaveBeenCalledTimes(1);
  });

  it('editar outra conta não mexe na sessão', async () => {
    const atualizarSessao = vi.fn().mockResolvedValue(undefined);
    const contexto: Autenticacao = {
      usuario: sessaoDe(ANA),
      carregando: false,
      avisoSessao: null,
      saidaVoluntaria: false,
      entrar: vi.fn(),
      sair: vi.fn(),
      atualizarSessao,
    };
    const servico = criarServico({ editar: vi.fn().mockResolvedValue({ ...CARLOS, nome: 'Carlos Lima' }) });
    render(
      <ContextoAutenticacao.Provider value={contexto}>
        <MemoryRouter initialEntries={['/usuarios/3/editar']}>
          <Routes>
            <Route path="/usuarios" element={<ListaUsuarios servico={servico} />} />
            <Route path="/usuarios/:id/editar" element={<EditarUsuario servico={servico} />} />
          </Routes>
        </MemoryRouter>
      </ContextoAutenticacao.Provider>,
    );
    await screen.findByLabelText('Nome completo');
    const usuario = await preencher({ 'Nome completo': 'Carlos Lima' });
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário atualizado com sucesso.');
    expect(atualizarSessao).not.toHaveBeenCalled();
  });

  it('mudar o próprio nome atualiza a barra', async () => {
    const renomeada = { ...ANA, nome: 'Ana Maria Souza' };
    vi.mocked(sessaoAtual).mockResolvedValueOnce(sessaoDe(ANA)).mockResolvedValue(sessaoDe(renomeada));
    const servico = criarServico({
      listar: vi.fn().mockResolvedValue([ANA, BRUNO]),
      editar: vi.fn().mockResolvedValue(renomeada),
    });
    renderizarComSessao(servico, '/usuarios/1/editar');
    await screen.findByLabelText('Nome completo');
    // O botão da conta na barra começa pelo nome; os da tabela, por "Desativar"
    expect(screen.getByRole('button', { name: /^Ana Administradora/ })).toBeInTheDocument();

    const usuario = await preencher({ 'Nome completo': 'Ana Maria Souza' });
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Usuário atualizado com sucesso.');
    expect(await screen.findByRole('button', { name: /^Ana Maria Souza/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Ana Administradora/ })).not.toBeInTheDocument();
  });

  it('mudar o próprio perfil leva ao início', async () => {
    const pesquisadora = { ...ANA, perfil: 'PESQUISADOR' as const };
    vi.mocked(sessaoAtual).mockResolvedValueOnce(sessaoDe(ANA)).mockResolvedValue(sessaoDe(pesquisadora));
    const servico = criarServico({
      listar: vi.fn().mockResolvedValue([ANA, BRUNO]),
      editar: vi.fn().mockResolvedValue(pesquisadora),
    });
    renderizarComSessao(servico, '/usuarios/1/editar');
    await screen.findByLabelText('Perfil');

    const usuario = userEvent.setup();
    await usuario.selectOptions(screen.getByLabelText('Perfil'), 'PESQUISADOR');
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByRole('heading', { name: 'Início' })).toBeInTheDocument();
    // A barra passa a mostrar o perfil novo, sem passar pelo acesso negado
    expect(
      await screen.findByRole('button', { name: /^Ana Administradora\s*Pesquisador/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Acesso negado' })).not.toBeInTheDocument();
  });
});
