import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ErroRequisicao } from '../../api/erros';
import { useAutenticacao, type AvisoSessao } from '../../autenticacao/contextoAutenticacao';
import Icone, { type NomeIcone } from '../../components/icones';
import './login.css';

/** Enviado pela RotaProtegida: a página pedida antes do login. */
export type EstadoLogin = { de?: string };

type Campo = 'email' | 'senha';
type Erros = Partial<Record<Campo, string>>;

const CHIPS: { rotulo: string; icone: NomeIcone }[] = [
  { rotulo: 'Perfis e permissões', icone: 'escudo' },
  { rotulo: 'Estudos e protocolos', icone: 'frasco' },
  { rotulo: 'Acompanhamento', icone: 'atividade' },
];

// Mensagem genérica: não revela se o e-mail existe (RF02)
const MENSAGEM_CREDENCIAIS = 'E-mail ou senha inválidos. Confira os dados e tente novamente.';

// A expiração é informativa; a falha ao verificar a sessão é um erro
const AVISOS: Record<AvisoSessao, { mensagem: string; erro: boolean }> = {
  sessaoExpirada: { mensagem: 'Sua sessão expirou. Entre novamente.', erro: false },
  falhaVerificacao: { mensagem: 'Não foi possível verificar sua sessão. Tente novamente.', erro: true },
};

function validar(email: string, senha: string): Erros {
  const erros: Erros = {};
  if (!email.trim()) erros.email = 'Informe o e-mail.';
  if (!senha) erros.senha = 'Informe a senha.';
  return erros;
}

// <-------------------TELA DE LOGIN------------------->
// Sem cadastro público: as contas são criadas pelo administrador
export default function Login() {
  const { usuario, carregando, avisoSessao, entrar } = useAutenticacao();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  // Já logado (ou login concluído agora): volta à página pedida
  if (usuario) {
    const destino = (local.state as EstadoLogin | null)?.de ?? '/';
    return <Navigate to={destino} replace />;
  }

  if (carregando) {
    return (
      <p className="carregando-sessao" role="status">
        Carregando…
      </p>
    );
  }

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const errosLocais = validar(email, senha);
    setErros(errosLocais);
    if (Object.keys(errosLocais).length > 0) return;

    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (erro) {
      setEnviando(false);
      if (erro instanceof ErroRequisicao && erro.codigo === 'CREDENCIAIS_INVALIDAS') {
        setErroGeral(MENSAGEM_CREDENCIAIS);
        setSenha('');
      } else if (erro instanceof ErroRequisicao && erro.codigo === 'VALIDACAO_INVALIDA') {
        const { email: erroEmail, senha: erroSenha } = erro.errosCampos;
        // Sem erro nos campos da tela, a mensagem geral evita uma recusa silenciosa
        if (erroEmail || erroSenha) setErros({ email: erroEmail, senha: erroSenha });
        else setErroGeral(erro.message);
      } else {
        setErroGeral(erro instanceof ErroRequisicao ? erro.message : 'Não foi possível entrar.');
      }
    }
  };

  const alterar = (campo: Campo, valor: string) => {
    if (campo === 'email') setEmail(valor);
    else setSenha(valor);
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const propsCampo = (campo: Campo) => ({
    id: `login-${campo}`,
    'aria-required': true,
    'aria-invalid': Boolean(erros[campo]),
    'aria-describedby': erros[campo] ? `erro-${campo}` : undefined,
  });

  const erroCampo = (campo: Campo) =>
    erros[campo] && (
      <span id={`erro-${campo}`} className="campo-erro">
        {erros[campo]}
      </span>
    );

  return (
    <div className="login-pagina">
      {/* <-------------------APRESENTAÇÃO-------------------> */}
      <aside className="login-apresentacao">
        <span className="login-marca">
          <span className="login-logo">
            <Icone nome="frasco" />
          </span>
          ClinicalStudyPB
        </span>

        <div className="login-chamada">
          <p className="login-slogan">Organize estudos clínicos do protocolo ao encerramento.</p>
          <ul className="login-chips">
            {CHIPS.map((chip) => (
              <li key={chip.rotulo}>
                <Icone nome={chip.icone} tamanho={14} />
                {chip.rotulo}
              </li>
            ))}
          </ul>
        </div>

        <p className="login-rodape">Engenharia de Software II • UEPB • 2026.2 • Dados fictícios</p>
      </aside>

      {/* <-------------------FORMULÁRIO-------------------> */}
      <main className="login-conteudo">
        <form className="login-formulario" onSubmit={enviar} noValidate>
          <header>
            <h1>Entrar na sua conta</h1>
            <p className="login-subtitulo">Use o e-mail e a senha cadastrados pelo administrador.</p>
          </header>

          {erroGeral ? (
            <p className="aviso aviso-erro" role="alert">
              <Icone nome="alerta" />
              {erroGeral}
            </p>
          ) : (
            avisoSessao && (
              <p
                className={`aviso ${AVISOS[avisoSessao].erro ? 'aviso-erro' : 'aviso-informacao'}`}
                role={AVISOS[avisoSessao].erro ? 'alert' : 'status'}
              >
                <Icone nome={AVISOS[avisoSessao].erro ? 'alerta' : 'info'} />
                {AVISOS[avisoSessao].mensagem}
              </p>
            )
          )}

          <div className="campo">
            <label className="obrigatorio" htmlFor="login-email">
              E-mail
            </label>
            <div className="entrada-com-icone">
              <Icone nome="envelope" />
              <input
                {...propsCampo('email')}
                type="email"
                autoComplete="username"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => alterar('email', e.target.value)}
              />
            </div>
            {erroCampo('email')}
          </div>

          <div className="campo">
            <label className="obrigatorio" htmlFor="login-senha">
              Senha
            </label>
            <div className="entrada-com-icone">
              <Icone nome="cadeado" />
              <input
                {...propsCampo('senha')}
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => alterar('senha', e.target.value)}
              />
            </div>
            {erroCampo('senha')}
          </div>

          <button type="submit" className="botao-primario" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="login-ajuda">
            <Icone nome="info" tamanho={16} />
            Esqueceu a senha ou não tem acesso? Fale com o administrador do sistema.
          </p>
        </form>
      </main>
    </div>
  );
}
