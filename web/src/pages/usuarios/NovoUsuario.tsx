import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { PerfilUsuario, UsuarioSessao } from '../../api/autenticacao';
import { servicoUsuarios, type ServicoUsuarios } from '../../api/usuarios';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
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

const VAZIO: DadosUsuario = { nome: '', email: '', senha: '', perfil: '' };

// <-------------------CADASTRO DE USUÁRIO------------------->
export default function NovoUsuario({ servico = servicoUsuarios, usuario: usuarioProp }: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const navigate = useNavigate();
  const [dados, setDados] = useState<DadosUsuario>(VAZIO);
  const [erros, setErros] = useState<ErrosUsuario>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo: CampoUsuario, valor: string) => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const errosLocais = validarUsuario(dados, true);
    setErros(errosLocais);
    if (Object.keys(errosLocais).length > 0) {
      setErroGeral(MENSAGEM_CAMPOS_DESTACADOS);
      return;
    }

    setEnviando(true);
    try {
      // A senha segue exatamente como foi digitada; nome e e-mail sem espaços nas pontas
      const criado = await servico.cadastrar({
        nome: dados.nome.trim(),
        email: dados.email.trim(),
        senha: dados.senha,
        perfil: dados.perfil as PerfilUsuario,
      });
      const aviso: AvisoUsuarios = { aviso: 'Usuário cadastrado com sucesso.', destaqueId: criado.id };
      navigate('/usuarios', { state: aviso });
    } catch (erro) {
      setEnviando(false);
      const resultado = errosDoServidor(erro);
      setErros(resultado.erros);
      setErroGeral(resultado.erroGeral);
    }
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
          <span aria-current="page">Novo usuário</span>
        </nav>

        <header className="usuarios-cabecalho usuarios-cabecalho-formulario">
          <div>
            <h1>Novo usuário</h1>
            <p className="usuarios-subtitulo">A conta começa ativa e pode entrar assim que for salva.</p>
          </div>
        </header>

        <FormularioUsuario
          modo="cadastro"
          dados={dados}
          erros={erros}
          erroGeral={erroGeral}
          enviando={enviando}
          alterar={alterar}
          aoEnviar={enviar}
        />
      </main>
    </div>
  );
}
