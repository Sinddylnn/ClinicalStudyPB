import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { servicoCandidatos, type ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import type { AvisoCadastro } from '../estudos/ListaEstudos';
import { LIMITES_CANDIDATO, validarCandidato, type CampoCandidato, type DadosCandidato } from './validacao';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './recrutamento.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoCandidatos?: ServicoCandidatos;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type Erros = Partial<Record<CampoCandidato, string>>;

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'pronto'; estudo: Estudo };

const CAMPOS: CampoCandidato[] = ['nome', 'email'];

// Textos do quadro "Novo candidato – erros" do protótipo
const MENSAGEM_CAMPOS = 'Revise os campos destacados antes de cadastrar.';
const MENSAGEM_DUPLICADO = 'Este e-mail já está cadastrado como candidato neste estudo.';

function errosDoServidor(errosCampos: Record<string, string>): Erros {
  return Object.fromEntries(
    Object.entries(errosCampos).filter(([campo]) => (CAMPOS as string[]).includes(campo)),
  ) as Erros;
}

// <-------------------CADASTRO DE CANDIDATO------------------->
// RF08: o coordenador cadastra o candidato no estudo vinculado a ele
export default function NovoCandidato({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoCandidatos: candidatosProp = servicoCandidatos,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id } = useParams();
  const estudoId = Number(id);
  const navigate = useNavigate();
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [dados, setDados] = useState<DadosCandidato>({ nome: '', email: '' });
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  // Confere o estudo antes de mostrar o formulário: fora da lista da sessão ou
  // fora de Recrutamento não há o que cadastrar (RF08 e matriz de permissões)
  useEffect(() => {
    let ativo = true;
    estudosProp
      .listar()
      .then((estudos) => {
        const encontrado = estudos.find((e) => e.id === estudoId);
        if (ativo) setTela(encontrado ? { tipo: 'pronto', estudo: encontrado } : { tipo: 'nao-encontrado' });
      })
      .catch((erro: unknown) => {
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar o estudo.';
        if (ativo) setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, estudoId, tentativa]);

  const estudo = tela.tipo === 'pronto' ? tela.estudo : undefined;

  const caminhoLista = `/estudos/${estudoId}/recrutamento`;

  const alterar = (campo: CampoCandidato, valor: string) => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const errosLocais = validarCandidato(dados);
    if (Object.keys(errosLocais).length > 0) {
      setErros(errosLocais);
      setErroGeral(MENSAGEM_CAMPOS);
      return;
    }

    setEnviando(true);
    try {
      const criado = await candidatosProp.cadastrar(estudoId, {
        nome: dados.nome.trim(),
        email: dados.email.trim(),
      });
      const aviso: AvisoCadastro = { aviso: 'Candidato cadastrado.', novoId: criado.id };
      navigate(caminhoLista, { state: aviso });
    } catch (erro) {
      setEnviando(false);
      if (erro instanceof ErroRequisicao && erro.codigo === 'VALIDACAO_INVALIDA') {
        setErros(errosDoServidor(erro.errosCampos));
        setErroGeral(MENSAGEM_CAMPOS);
      } else if (erro instanceof ErroRequisicao && erro.codigo === 'EMAIL_JA_CADASTRADO') {
        setErros({ email: MENSAGEM_DUPLICADO });
        setErroGeral(erro.message);
      } else {
        setErroGeral(
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível cadastrar o candidato.',
        );
      }
    }
  };

  const propsCampo = (campo: CampoCandidato) => ({
    id: `candidato-${campo}`,
    'aria-required': true,
    'aria-invalid': Boolean(erros[campo]),
    'aria-describedby': erros[campo] ? `erro-${campo}` : undefined,
  });

  const rodape = (campo: CampoCandidato) =>
    erros[campo] && (
      <span className="campo-rodape">
        <span id={`erro-${campo}`} className="campo-erro">
          {erros[campo]}
        </span>
      </span>
    );

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="estudos-conteudo estudos-conteudo-formulario">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoLista}>{estudo?.titulo ?? 'Recrutamento'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Novo candidato</span>
        </nav>

        <header className="estudos-cabecalho estudos-cabecalho-formulario">
          <div>
            <h1>Novo candidato</h1>
            <p className="estudos-subtitulo">
              O candidato fica vinculado ao estudo
              {estudo ? ` “${estudo.titulo}”` : ''} e começa sem avaliação de elegibilidade.
            </p>
          </div>
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando estudo…</p>}

        {tela.tipo === 'erro' && (
          <div className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            <span className="aviso-texto">{tela.mensagem}</span>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => {
                setTela({ tipo: 'carregando' });
                setTentativa((n) => n + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {tela.tipo === 'nao-encontrado' && (
          <section className="estudos-cartao estudos-vazio">
            <span className="estudos-vazio-icone">
              <Icone nome="frasco" tamanho={30} />
            </span>
            <h2>Estudo não encontrado</h2>
            <p>O estudo não existe ou não está vinculado a você como coordenador.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {estudo && estudo.estado !== 'RECRUTAMENTO' && (
          <div className="aviso aviso-informacao">
            <Icone nome="info" />
            <span className="aviso-texto">
              Só é possível cadastrar candidatos com o estudo em Recrutamento.
            </span>
            <Link className="botao botao-secundario" to={caminhoLista}>
              Voltar ao recrutamento
            </Link>
          </div>
        )}

        {estudo?.estado === 'RECRUTAMENTO' && (
          <form className="estudos-cartao estudos-formulario" onSubmit={enviar} noValidate>
            {erroGeral && (
              <p className="aviso aviso-erro" role="alert">
                <Icone nome="alerta" />
                {erroGeral}
              </p>
            )}

            <section className="estudos-secao" aria-labelledby="secao-candidato">
              <div className="estudos-secao-texto">
                <h2 id="secao-candidato">Dados do candidato</h2>
                <p>O mesmo e-mail não pode ser cadastrado duas vezes no mesmo estudo.</p>
              </div>
              <div className="estudos-secao-campos">
                <div className="campo">
                  <label className="obrigatorio" htmlFor="candidato-nome">
                    Nome completo
                  </label>
                  <input
                    {...propsCampo('nome')}
                    className="entrada"
                    value={dados.nome}
                    onChange={(e) => alterar('nome', e.target.value)}
                    maxLength={LIMITES_CANDIDATO.nome}
                    placeholder="Ex.: Maria Souza"
                  />
                  {rodape('nome')}
                </div>

                <div className="campo">
                  <label className="obrigatorio" htmlFor="candidato-email">
                    E-mail
                  </label>
                  <div className="entrada-com-icone">
                    <Icone nome="envelope" />
                    <input
                      {...propsCampo('email')}
                      type="email"
                      value={dados.email}
                      onChange={(e) => alterar('email', e.target.value)}
                      maxLength={LIMITES_CANDIDATO.email}
                      placeholder="nome@exemplo.com"
                    />
                  </div>
                  {rodape('email')}
                </div>
              </div>
            </section>

            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              Depois de cadastrar, avalie os critérios de elegibilidade do candidato.
            </p>

            <div className="estudos-acoes">
              <Link className="botao botao-secundario" to={caminhoLista}>
                Cancelar
              </Link>
              <button type="submit" className="botao botao-primario" disabled={enviando}>
                <Icone nome="usuarioMais" />
                {enviando ? 'Cadastrando…' : 'Cadastrar candidato'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
