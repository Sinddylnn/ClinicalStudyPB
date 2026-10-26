import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { PerfilUsuario, UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import { servicoUsuarios, type ServicoUsuarios, type Usuario } from '../../api/usuarios';
import { useAutenticacao, useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import FormularioUsuario from './FormularioUsuario';
import type { AvisoUsuarios } from './ListaUsuarios';
import {
  errosDoServidor,
  MENSAGEM_CAMPOS_DESTACADOS,
  validarUsuario,
  type CampoUsuario,
  type DadosUsuario,
  type ErrosUsuario,
} from './validacao';
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
  | { tipo: 'naoEncontrado' }
  | { tipo: 'pronto'; original: Usuario };

const naoEncontrado = (erro: unknown) => erro instanceof ErroRequisicao && erro.status === 404;

// <-------------------EDIÇÃO DE USUÁRIO------------------->
// Nome, e-mail e perfil. A senha e a situação não mudam aqui (PUT /usuarios/{id}).
export default function EditarUsuario({ servico = servicoUsuarios, usuario: usuarioProp }: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { atualizarSessao } = useAutenticacao();
  const navigate = useNavigate();
  const { id: parametroId } = useParams();
  const id = Number(parametroId);
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<DadosUsuario>({ nome: '', email: '', senha: '', perfil: '' });
  const [erros, setErros] = useState<ErrosUsuario>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  // <-------------------CARREGAMENTO------------------->
  // Não há GET /usuarios/{id}: os dados vêm da lista completa
  useEffect(() => {
    let ativo = true;
    servico
      .listar()
      .then((usuarios) => {
        if (!ativo) return;
        const encontrado = usuarios.find((item) => item.id === id);
        if (!encontrado) {
          setTela({ tipo: 'naoEncontrado' });
          return;
        }
        setDados({ nome: encontrado.nome, email: encontrado.email, senha: '', perfil: encontrado.perfil });
        setTela({ tipo: 'pronto', original: encontrado });
      })
      .catch((erro: unknown) => {
        const mensagem =
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar o usuário.';
        if (ativo) setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [servico, id, tentativa]);

  const tentarNovamente = () => {
    setTela({ tipo: 'carregando' });
    setTentativa((n) => n + 1);
  };

  const alterar = (campo: CampoUsuario, valor: string) => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  // <-------------------SALVAR------------------->
  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const errosLocais = validarUsuario(dados, false);
    setErros(errosLocais);
    if (Object.keys(errosLocais).length > 0) {
      setErroGeral(MENSAGEM_CAMPOS_DESTACADOS);
      return;
    }

    setEnviando(true);
    let editado: Usuario;
    try {
      editado = await servico.editar(id, {
        nome: dados.nome.trim(),
        email: dados.email.trim(),
        perfil: dados.perfil as PerfilUsuario,
      });
    } catch (erro) {
      setEnviando(false);
      if (naoEncontrado(erro)) {
        setTela({ tipo: 'naoEncontrado' });
        return;
      }
      const resultado = errosDoServidor(erro);
      setErros(resultado.erros);
      setErroGeral(resultado.erroGeral);
      return;
    }

    // A própria conta: a barra passa a mostrar os dados novos
    if (editado.id === usuario.id) {
      // Sem o perfil de administrador, a lista de usuários deixa de estar disponível. Só navega:
      // a revalidação da troca de rota traz o perfil novo depois de a rota "/" valer. Atualizar
      // antes deixaria a RotaProtegida desta página ver o perfil novo e ir para o acesso negado
      if (editado.perfil !== 'ADMINISTRADOR') {
        navigate('/', { replace: true });
        return;
      }
      // Falha momentânea aqui não desfaz a edição; a próxima revalidação corrige a barra
      await atualizarSessao().catch(() => undefined);
    }

    const aviso: AvisoUsuarios = { aviso: 'Usuário atualizado com sucesso.', destaqueId: editado.id };
    navigate('/usuarios', { state: aviso });
  };

  return (
    <div className="pagina-interna usuarios-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="usuarios-conteudo usuarios-conteudo-formulario">
        <nav className="usuarios-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/usuarios">Usuários</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Editar usuário</span>
        </nav>

        <header className="usuarios-cabecalho usuarios-cabecalho-formulario">
          <div>
            <h1>Editar usuário</h1>
            <p className="usuarios-subtitulo">Atualize os dados e o perfil da conta.</p>
          </div>
        </header>

        {tela.tipo === 'carregando' && (
          <p className="usuarios-cartao usuarios-carregando">Carregando usuário…</p>
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

        {tela.tipo === 'naoEncontrado' && (
          <section className="usuarios-cartao usuarios-vazio">
            <span className="usuarios-vazio-icone">
              <Icone nome="alerta" tamanho={30} />
            </span>
            <h2>Usuário não encontrado</h2>
            <p>A conta que você tentou abrir não existe. Confira a lista e tente de novo.</p>
            <Link className="botao botao-secundario" to="/usuarios">
              Voltar para usuários
            </Link>
          </section>
        )}

        {tela.tipo === 'pronto' && (
          <FormularioUsuario
            modo="edicao"
            dados={dados}
            erros={erros}
            erroGeral={erroGeral}
            enviando={enviando}
            ativo={tela.original.ativo}
            alterar={alterar}
            aoEnviar={enviar}
          />
        )}
      </main>
    </div>
  );
}
