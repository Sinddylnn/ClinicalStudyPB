import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { servicoCandidatos, type DadosInclusao, type ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import type { AvisoCadastro } from '../estudos/ListaEstudos';
import { condicoesInclusao, mesmoEmail } from './inclusao';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './recrutamento.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoCandidatos?: ServicoCandidatos;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'pronto'; estudo: Estudo; dados: DadosInclusao };

/** Fora da lista da sessão é "não encontrado", sem nem pedir os dados (como nas outras telas). */
async function carregar(estudoId: number, candidatoId: number, estudos: ServicoEstudos, candidatos: ServicoCandidatos) {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  return { estudo, dados: await candidatos.obterInclusao(estudoId, candidatoId) };
}

// A conta com o e-mail do candidato já vem escolhida; o coordenador só confere
function contaSugerida({ contas, candidato }: DadosInclusao): string {
  const conta = contas.find((c) => mesmoEmail(c.email, candidato.email));
  return conta ? String(conta.id) : '';
}

// <-------------------INCLUSÃO DO PARTICIPANTE------------------->
// RF11: o coordenador vincula a conta e inclui. A tela só mostra e bloqueia:
// a API confere as condições de novo e reserva a vaga de forma indivisível
export default function InclusaoCandidato({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoCandidatos: candidatosProp = servicoCandidatos,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id, candidatoId: idCandidato } = useParams();
  const estudoId = Number(id);
  const candidatoId = Number(idCandidato);
  const navigate = useNavigate();
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [contaId, setContaId] = useState('');
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregar(estudoId, candidatoId, estudosProp, candidatosProp)
      .then((resultado) => {
        if (!ativo) return;
        if (!resultado) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        setContaId(contaSugerida(resultado.dados));
        setTela({ tipo: 'pronto', ...resultado });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar a inclusão.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, candidatosProp, estudoId, candidatoId, tentativa]);

  const estudo = tela.tipo === 'pronto' ? tela.estudo : undefined;
  const dados = tela.tipo === 'pronto' ? tela.dados : undefined;
  const caminhoLista = `/estudos/${estudoId}/recrutamento`;
  const caminhoCandidato = `/estudos/${estudoId}/candidatos/${candidatoId}`;

  const conta = dados?.contas.find((c) => String(c.id) === contaId);
  const condicoes = estudo && dados ? condicoesInclusao(estudo, dados, conta) : [];
  const liberada = condicoes.length > 0 && condicoes.every((c) => c.atendida);
  const emailDiferente = Boolean(conta && dados && !mesmoEmail(conta.email, dados.candidato.email));
  const incluido = Boolean(dados?.candidato.dataInclusao);
  const podeCorrigir = estudo?.estado === 'RECRUTAMENTO' && !incluido;

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!liberada || !conta || !dados) return;
    setErroGeral(undefined);

    setEnviando(true);
    try {
      await candidatosProp.incluir(estudoId, candidatoId, { contaId: conta.id });
      const aviso: AvisoCadastro = {
        aviso: `${dados.candidato.nome} foi incluído como participante.`,
        novoId: candidatoId,
      };
      navigate(caminhoLista, { state: aviso });
    } catch (erro) {
      setEnviando(false);
      setErroGeral(erro instanceof ErroRequisicao ? erro.message : 'Não foi possível incluir o participante.');
      // Outra pessoa pode ter ocupado a última vaga: atualiza as condições sem perder a conta escolhida
      const atualizados = await candidatosProp.obterInclusao(estudoId, candidatoId).catch(() => null);
      if (atualizados && estudo) setTela({ tipo: 'pronto', estudo, dados: atualizados });
    }
  };

  const nomeCandidato = dados?.candidato.nome;

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="estudos-conteudo">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoLista}>{estudo?.titulo ?? 'Recrutamento'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          {nomeCandidato && (
            <>
              <span>{nomeCandidato}</span>
              <Icone nome="setaDireita" tamanho={14} />
            </>
          )}
          <span aria-current="page">Inclusão</span>
        </nav>

        <header className="estudos-cabecalho">
          <div>
            <h1>Incluir participante</h1>
            {dados && (
              <p className="estudos-subtitulo">
                {dados.candidato.nome} • {dados.candidato.email}
              </p>
            )}
          </div>
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando inclusão…</p>}

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
              <Icone nome="usuarios" tamanho={30} />
            </span>
            <h2>Candidato não encontrado</h2>
            <p>O candidato não existe neste estudo ou o estudo não está vinculado a você como coordenador.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {dados && (
          <div className="inclusao-grade">
            <form className="elegibilidade-coluna" onSubmit={enviar} noValidate>
              <section className="estudos-cartao inclusao-conta" aria-labelledby="titulo-conta">
                {erroGeral && (
                  <p className="aviso aviso-erro" role="alert">
                    <Icone nome="alerta" />
                    {erroGeral}
                  </p>
                )}
                <h2 id="titulo-conta">Conta de participante</h2>
                <p>Escolha a conta que o candidato vai usar no aplicativo. A conta é criada pelo administrador.</p>
                <div className="campo">
                  <label className="obrigatorio" htmlFor="inclusao-conta">
                    Conta
                  </label>
                  <div className="entrada-selecao">
                    <select
                      id="inclusao-conta"
                      aria-required
                      aria-invalid={emailDiferente}
                      aria-describedby={emailDiferente ? 'erro-conta' : 'ajuda-conta'}
                      value={contaId}
                      disabled={incluido || enviando}
                      onChange={(e) => {
                        setContaId(e.target.value);
                        setErroGeral(undefined);
                      }}
                    >
                      <option value="" disabled>
                        Selecione a conta
                      </option>
                      {dados.contas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} • {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="campo-rodape">
                    {emailDiferente ? (
                      <span id="erro-conta" className="campo-erro">
                        O e-mail desta conta é diferente do e-mail do candidato.
                      </span>
                    ) : (
                      <span id="ajuda-conta" className="campo-ajuda">
                        {dados.contas.length === 0
                          ? 'Nenhuma conta disponível: o administrador precisa cadastrar a conta antes.'
                          : 'Só aparecem contas ativas com perfil Participante.'}
                      </span>
                    )}
                  </span>
                </div>
              </section>

              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                A vaga é conferida de novo no momento da inclusão. Uma retirada futura não libera a vaga.
              </p>

              <div className="estudos-acoes elegibilidade-acoes">
                <Link className="botao botao-secundario" to={caminhoLista}>
                  {incluido ? 'Voltar ao recrutamento' : 'Cancelar'}
                </Link>
                {!incluido && (
                  <button type="submit" className="botao botao-primario" disabled={!liberada || enviando}>
                    <Icone nome="usuarioCheck" />
                    {enviando ? 'Incluindo…' : 'Incluir participante'}
                  </button>
                )}
              </div>
            </form>

            <aside className="estudos-cartao inclusao-condicoes" aria-labelledby="titulo-condicoes">
              <header>
                <h2 id="titulo-condicoes">Condições para inclusão</h2>
                <span className={`etiqueta ${liberada ? 'etiqueta-aceitou' : 'etiqueta-recusou'}`} aria-live="polite">
                  {liberada ? 'Tudo certo' : 'Bloqueada'}
                </span>
              </header>
              <ul>
                {condicoes.map((condicao) => (
                  <li key={condicao.titulo} className={condicao.atendida ? undefined : 'inclusao-condicao-falha'}>
                    <span
                      className="inclusao-situacao"
                      role="img"
                      aria-label={condicao.atendida ? 'Atendida' : 'Não atendida'}
                    >
                      <Icone nome={condicao.atendida ? 'sucesso' : 'fechar'} tamanho={14} />
                    </span>
                    <span className="inclusao-condicao-texto">
                      <span>{condicao.titulo}</span>
                      <small>{condicao.detalhe}</small>
                    </span>
                  </li>
                ))}
              </ul>
              {podeCorrigir && (
                <p className="inclusao-atalhos">
                  <Link to={`${caminhoCandidato}/elegibilidade`}>Rever avaliação</Link>
                  <Link to={`${caminhoCandidato}/consentimento`}>Corrigir consentimento</Link>
                </p>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
