import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { PerfilUsuario, UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import { servicoUsuarios, type ServicoUsuarios, type Usuario } from '../../api/usuarios';
import { useAutenticacao, useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import Avatar from '../../components/Avatar';
import BarraNavegacao from '../../components/BarraNavegacao';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import Icone from '../../components/icones';
import { NOMES_PERFIL, PERFIS } from './formatacao';
import '../../estilos/comum.css';
import './usuarios.css';

type Props = {
  servico?: ServicoUsuarios;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; usuarios: Usuario[] };

/** Enviado pelo cadastro e pela edição ao voltar para a lista. */
export type AvisoUsuarios = { aviso: string; destaqueId: number };

type Aba = 'todos' | 'ativos' | 'inativos';

type Confirmacao = { acao: 'desativar' | 'reativar'; alvo: Usuario };

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
];

const NOTA_ULTIMO_ADMIN = 'O último administrador ativo não pode ser desativado.';

const DURACAO_NOTIFICACAO_MS = 6000;

const MENSAGEM_SAIR_APOS_DESATIVAR =
  'Sua conta foi desativada, mas não foi possível encerrar a sessão. Recarregue a página.';

// Textos dos quadros "Desativar conta" e "Reativar conta" do protótipo
const CONSEQUENCIAS: Record<Confirmacao['acao'], ItemConsequencia[]> = {
  desativar: [
    { texto: 'Novos logins são bloqueados e sessões abertas encerradas.', tipo: 'perde' },
    { texto: 'Registros e vínculos criados pela conta são preservados.', tipo: 'mantem' },
    { texto: 'Você pode reativar a conta depois.', tipo: 'mantem' },
  ],
  reativar: [
    { texto: 'A pessoa entra de novo com o mesmo e-mail e senha.', tipo: 'mantem' },
    { texto: 'Perfil, registros e vínculos anteriores continuam iguais.', tipo: 'mantem' },
    { texto: 'Nenhuma conta nova é criada, sem duplicar o e-mail.', tipo: 'mantem' },
  ],
};

function textoContagem(quantidade: number): string {
  return quantidade === 1 ? 'Mostrando 1 usuário' : `Mostrando ${quantidade} usuários`;
}

// <-------------------LISTA DE USUÁRIOS------------------->
// Exclusiva do administrador. Busca, abas e filtro de perfil são feitos aqui, sobre a lista completa.
export default function ListaUsuarios({ servico = servicoUsuarios, usuario: usuarioProp }: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { sair } = useAutenticacao();
  const location = useLocation();
  const navigate = useNavigate();
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<Aba>('todos');
  const [filtroPerfil, setFiltroPerfil] = useState<PerfilUsuario | ''>('');
  const [confirmacao, setConfirmacao] = useState<Confirmacao>();
  const [erroConfirmacao, setErroConfirmacao] = useState<string>();
  const [confirmando, setConfirmando] = useState(false);

  // <-------------------NOTIFICAÇÃO E DESTAQUE------------------->
  // Vem do cadastro/edição (estado da navegação) ou de desativar/reativar nesta tela.
  // O estado é limpo do histórico para não reaparecer ao recarregar
  const [inicial] = useState<AvisoUsuarios | undefined>(() => location.state ?? undefined);
  const [notificacao, setNotificacao] = useState(inicial ? { texto: inicial.aviso } : undefined);
  const [destaqueId, setDestaqueId] = useState(inicial?.destaqueId);
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
  useEffect(() => {
    if (!notificacao) return;
    const temporizador = setTimeout(() => setNotificacao(undefined), DURACAO_NOTIFICACAO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacao]);

  // <-------------------CARREGAMENTO------------------->
  useEffect(() => {
    let ativo = true;
    servico
      .listar()
      .then((usuarios) => ativo && setTela({ tipo: 'pronto', usuarios }))
      .catch((erro: unknown) => {
        const mensagem =
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar os usuários.';
        if (ativo) setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [servico, tentativa]);

  const tentarNovamente = () => {
    setTela({ tipo: 'carregando' });
    setTentativa((n) => n + 1);
  };

  // <-------------------BUSCA, ABAS E FILTRO------------------->
  // Ordem alfabética: o backend não garante a ordem, e a linha editada não muda de lugar
  const usuarios = useMemo(
    () =>
      tela.tipo === 'pronto'
        ? [...tela.usuarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
        : [],
    [tela],
  );

  // Busca e perfil valem para as contagens das abas; a aba escolhe só a situação
  const buscados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const contem = (texto: string) => texto.toLocaleLowerCase('pt-BR').includes(termo);
    return usuarios.filter(
      (item) =>
        (!termo || contem(item.nome) || contem(item.email)) &&
        (!filtroPerfil || item.perfil === filtroPerfil),
    );
  }, [usuarios, busca, filtroPerfil]);

  const porAba: Record<Aba, Usuario[]> = useMemo(
    () => ({
      todos: buscados,
      ativos: buscados.filter((item) => item.ativo),
      inativos: buscados.filter((item) => !item.ativo),
    }),
    [buscados],
  );
  const visiveis = porAba[aba];

  // Calculado sobre a lista completa: com um único administrador ativo, ele não pode ser desativado
  const idUltimoAdmin = useMemo(() => {
    const admins = usuarios.filter((item) => item.ativo && item.perfil === 'ADMINISTRADOR');
    return admins.length === 1 ? admins[0].id : undefined;
  }, [usuarios]);

  // <-------------------DESATIVAR E REATIVAR------------------->
  const abrirConfirmacao = (acao: Confirmacao['acao'], alvo: Usuario) => {
    setErroConfirmacao(undefined);
    setConfirmacao({ acao, alvo });
  };

  const fecharConfirmacao = () => setConfirmacao(undefined);

  const confirmar = async () => {
    if (!confirmacao) return;
    const { acao, alvo } = confirmacao;
    setConfirmando(true);
    setErroConfirmacao(undefined);
    try {
      const atualizado =
        acao === 'desativar' ? await servico.desativar(alvo.id) : await servico.reativar(alvo.id);

      // A própria conta desativada já não tem sessão: o Sair leva ao login sem guardar a página.
      // O sair() só falha com erro que não é 401 (ex.: rede); a conta já foi desativada mesmo assim
      if (acao === 'desativar' && alvo.id === usuario.id) {
        try {
          await sair();
        } catch {
          setErroConfirmacao(MENSAGEM_SAIR_APOS_DESATIVAR);
        }
        return;
      }

      setTela((atual) =>
        atual.tipo === 'pronto'
          ? {
              ...atual,
              usuarios: atual.usuarios.map((item) => (item.id === atualizado.id ? atualizado : item)),
            }
          : atual,
      );
      setDestaqueId(atualizado.id);
      setNotificacao({
        texto: `A conta de ${atualizado.nome} foi ${acao === 'desativar' ? 'desativada' : 'reativada'}.`,
      });
      setConfirmacao(undefined);
    } catch (erro) {
      setErroConfirmacao(
        erro instanceof ErroRequisicao ? erro.message : 'Não foi possível concluir a operação.',
      );
    } finally {
      setConfirmando(false);
    }
  };

  // <-------------------PARTES DA TABELA------------------->
  const etiquetaSituacao = (ativo: boolean) => (
    <span className={`etiqueta ${ativo ? 'etiqueta-ativo' : 'etiqueta-inativo'}`}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );

  const botaoSituacao = (item: Usuario) => {
    if (!item.ativo) {
      return (
        <button
          type="button"
          className="usuarios-botao-icone usuarios-botao-reativar"
          aria-label={`Reativar ${item.nome}`}
          title="Reativar"
          onClick={() => abrirConfirmacao('reativar', item)}
        >
          <Icone nome="usuarioCheck" tamanho={16} />
        </button>
      );
    }
    const bloqueado = item.id === idUltimoAdmin;
    return (
      <button
        type="button"
        className="usuarios-botao-icone usuarios-botao-desativar"
        aria-label={`Desativar ${item.nome}`}
        title={bloqueado ? NOTA_ULTIMO_ADMIN : 'Desativar'}
        aria-describedby={bloqueado ? 'nota-ultimo-admin' : undefined}
        disabled={bloqueado}
        onClick={() => abrirConfirmacao('desativar', item)}
      >
        <Icone nome="usuarioX" tamanho={16} />
      </button>
    );
  };

  const dialogo = () => {
    if (!confirmacao) return null;
    const { acao, alvo } = confirmacao;
    const desativar = acao === 'desativar';
    const propria = desativar && alvo.id === usuario.id;
    return (
      <DialogoConfirmacao
        titulo={`${desativar ? 'Desativar' : 'Reativar'} ${alvo.nome}?`}
        descricao={
          desativar
            ? 'A conta deixará de ter acesso ao sistema.'
            : 'A conta volta a ter acesso ao sistema com o mesmo perfil.'
        }
        icone={desativar ? 'usuarioX' : 'usuarioCheck'}
        tom={desativar ? 'perigo' : 'positivo'}
        consequencias={CONSEQUENCIAS[acao]}
        aviso={
          propria && (
            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              Esta é a sua conta: sua sessão será encerrada e você voltará para a tela de login.
            </p>
          )
        }
        textoConfirmar={desativar ? 'Desativar conta' : 'Reativar conta'}
        erro={erroConfirmacao}
        enviando={confirmando}
        aoConfirmar={confirmar}
        aoCancelar={fecharConfirmacao}
      />
    );
  };

  return (
    <div className="pagina-interna usuarios-pagina">
      <BarraNavegacao usuario={usuario} />

      {notificacao && (
        <p className="notificacao" role="status">
          <Icone nome="sucesso" />
          {notificacao.texto}
        </p>
      )}

      <main className="usuarios-conteudo">
        <nav className="usuarios-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Usuários</span>
        </nav>

        <header className="usuarios-cabecalho">
          <div>
            <h1>Usuários</h1>
            <p className="usuarios-subtitulo">Cadastre, edite e desative contas dos quatro perfis.</p>
          </div>
          <Link className="botao botao-primario" to="/usuarios/novo">
            <Icone nome="usuarioMais" />
            Novo usuário
          </Link>
        </header>

        {tela.tipo === 'carregando' && (
          <p className="usuarios-cartao usuarios-carregando">Carregando usuários…</p>
        )}

        {tela.tipo === 'erro' && (
          <div className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            <span className="aviso-texto">{tela.mensagem}</span>
            <button type="button" className="botao botao-secundario" onClick={tentarNovamente}>
              Tentar novamente
            </button>
          </div>
        )}

        {tela.tipo === 'pronto' && tela.usuarios.length === 0 && (
          <section className="usuarios-cartao usuarios-vazio">
            <span className="usuarios-vazio-icone">
              <Icone nome="usuarios" tamanho={30} />
            </span>
            <h2>Nenhum usuário cadastrado</h2>
            <p>Cadastre as contas informando nome, e-mail, senha inicial e perfil. Elas começam ativas.</p>
            <Link className="botao botao-primario" to="/usuarios/novo">
              <Icone nome="usuarioMais" />
              Cadastrar usuário
            </Link>
          </section>
        )}

        {tela.tipo === 'pronto' && tela.usuarios.length > 0 && (
          <section className="usuarios-cartao" aria-label="Lista de usuários">
            <div className="usuarios-filtros">
              <div className="entrada-com-icone usuarios-busca">
                <Icone nome="busca" />
                <input
                  type="search"
                  aria-label="Buscar por nome ou e-mail"
                  placeholder="Buscar por nome ou e-mail"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="usuarios-abas" role="group" aria-label="Filtrar por situação">
                {ABAS.map((item) => (
                  <button
                    key={item.valor}
                    type="button"
                    aria-pressed={aba === item.valor}
                    onClick={() => setAba(item.valor)}
                  >
                    {/* O espaço separa rótulo e contagem no nome acessível ("Ativos 5") */}
                    {item.rotulo}{' '}
                    <span className="usuarios-aba-contagem">{porAba[item.valor].length}</span>
                  </button>
                ))}
              </div>

              <div className="entrada-selecao usuarios-filtro-perfil">
                <select
                  aria-label="Filtrar por perfil"
                  value={filtroPerfil}
                  onChange={(e) => setFiltroPerfil(e.target.value as PerfilUsuario | '')}
                >
                  <option value="">Todos os perfis</option>
                  {PERFIS.map((perfil) => (
                    <option key={perfil} value={perfil}>
                      {NOMES_PERFIL[perfil]}
                    </option>
                  ))}
                </select>
                <Icone nome="setaBaixo" />
              </div>
            </div>

            {visiveis.length === 0 ? (
              <p className="usuarios-sem-resultado">Nenhum usuário encontrado com esses filtros.</p>
            ) : (
              <table className="usuarios-tabela">
                <thead>
                  <tr>
                    <th scope="col">Usuário</th>
                    <th scope="col">Perfil</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((item) => (
                    <tr
                      key={item.id}
                      className={item.id === destaqueId ? 'usuarios-linha-destacada' : undefined}
                    >
                      <td>
                        <span className="usuarios-pessoa">
                          <Avatar nome={item.nome} perfil={item.perfil} />
                          <span>
                            <span className="usuarios-nome">{item.nome}</span>
                            <span className="usuarios-email">{item.email}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`etiqueta etiqueta-perfil-${item.perfil.toLowerCase()}`}>
                          {NOMES_PERFIL[item.perfil]}
                        </span>
                      </td>
                      <td>{etiquetaSituacao(item.ativo)}</td>
                      <td>
                        <span className="usuarios-acoes-linha">
                          <Link
                            className="usuarios-botao-icone"
                            to={`/usuarios/${item.id}/editar`}
                            aria-label={`Editar ${item.nome}`}
                            title="Editar"
                          >
                            <Icone nome="lapis" tamanho={16} />
                          </Link>
                          {botaoSituacao(item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="usuarios-rodape">
              {textoContagem(visiveis.length)} •{' '}
              <span id="nota-ultimo-admin">{NOTA_ULTIMO_ADMIN}</span>
            </p>
          </section>
        )}
      </main>

      {dialogo()}
    </div>
  );
}
