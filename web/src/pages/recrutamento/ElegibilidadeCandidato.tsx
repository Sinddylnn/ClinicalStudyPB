import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  servicoCandidatos,
  type AvaliacaoElegibilidade,
  type Elegibilidade,
  type RespostaCriterio,
  type ServicoCandidatos,
} from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import type { TipoCriterio } from '../../api/protocolo';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone, { type NomeIcone } from '../../components/icones';
import type { AvisoCadastro } from '../estudos/ListaEstudos';
import {
  calcularElegibilidade,
  NOMES_RESPOSTA,
  OPCOES_RESPOSTA,
  resumirAvaliacao,
  type ResumoAvaliacao,
} from './elegibilidade';
import { formatarDataHora, NOMES_ELEGIBILIDADE } from './formatacao';
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
  | { tipo: 'pronto'; estudo: Estudo; avaliacao: AvaliacaoElegibilidade };

type Respostas = Record<number, RespostaCriterio | null>;

// Textos dos quadros "Coordenador / Elegibilidade – ..." do protótipo
const CABECALHOS: Record<TipoCriterio, { titulo: string; ajuda: string }> = {
  INCLUSAO: {
    titulo: 'Critérios de inclusão',
    ajuda: 'Marque se o candidato atende a cada critério. Clique de novo na opção para limpar a resposta.',
  },
  EXCLUSAO: {
    titulo: 'Critérios de exclusão',
    ajuda: 'Marque se alguma condição de exclusão está presente. Clique de novo na opção para limpar a resposta.',
  },
};

const MENSAGEM_VAZIA = 'Marque pelo menos um critério antes de salvar a avaliação.';

/**
 * Busca o estudo entre os vinculados ao coordenador: fora da lista da sessão é "não encontrado",
 * sem nem pedir a avaliação (mesmo cuidado das outras telas do recrutamento).
 */
async function carregar(estudoId: number, candidatoId: number, estudos: ServicoEstudos, candidatos: ServicoCandidatos) {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  return { estudo, avaliacao: await candidatos.obterElegibilidade(estudoId, candidatoId) };
}

function respostasDe(avaliacao: AvaliacaoElegibilidade): Respostas {
  return Object.fromEntries(avaliacao.itens.map((i) => [i.criterioId, i.resposta]));
}

// <-------------------AVALIAÇÃO DE ELEGIBILIDADE------------------->
// RF09: o coordenador marca cada critério do protocolo e o resultado é calculado ao marcar.
// Pode salvar incompleta e continuar depois; após a inclusão, a avaliação fica só para consulta
export default function ElegibilidadeCandidato({
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
  const [respostas, setRespostas] = useState<Respostas>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregar(estudoId, candidatoId, estudosProp, candidatosProp)
      .then((dados) => {
        if (!ativo) return;
        if (!dados) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        setRespostas(respostasDe(dados.avaliacao));
        setTela({ tipo: 'pronto', ...dados });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar a avaliação.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, candidatosProp, estudoId, candidatoId, tentativa]);

  const estudo = tela.tipo === 'pronto' ? tela.estudo : undefined;
  const avaliacao = tela.tipo === 'pronto' ? tela.avaliacao : undefined;
  const caminhoLista = `/estudos/${estudoId}/recrutamento`;

  // O resultado acompanha as marcações, antes mesmo de salvar
  const itensAtuais = useMemo(
    () => (avaliacao?.itens ?? []).map((i) => ({ ...i, resposta: respostas[i.criterioId] ?? null })),
    [avaliacao, respostas],
  );
  const situacao = calcularElegibilidade(itensAtuais);
  const resumo = resumirAvaliacao(itensAtuais);

  const incluido = Boolean(avaliacao?.candidato.dataInclusao);
  const editavel = estudo?.estado === 'RECRUTAMENTO' && !incluido;

  const marcar = (criterioId: number, resposta: RespostaCriterio | null) => {
    setRespostas((atual) => ({ ...atual, [criterioId]: resposta }));
    setErroGeral(undefined);
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!avaliacao) return;
    setErroGeral(undefined);
    if (situacao === 'NAO_AVALIADO') {
      setErroGeral(MENSAGEM_VAZIA);
      return;
    }

    setEnviando(true);
    try {
      const salva = await candidatosProp.avaliarElegibilidade(estudoId, candidatoId, {
        respostas: avaliacao.itens.map((i) => ({ criterioId: i.criterioId, resposta: respostas[i.criterioId] ?? null })),
      });
      const aviso: AvisoCadastro = {
        aviso: `Avaliação salva: ${NOMES_ELEGIBILIDADE[salva.situacao].toLowerCase()}.`,
        novoId: candidatoId,
      };
      navigate(caminhoLista, { state: aviso });
    } catch (erro) {
      setEnviando(false);
      setErroGeral(erro instanceof ErroRequisicao ? erro.message : 'Não foi possível salvar a avaliação.');
    }
  };

  const tentarNovamente = () => {
    setTela({ tipo: 'carregando' });
    setTentativa((n) => n + 1);
  };

  const nomeCandidato = avaliacao?.candidato.nome ?? 'Candidato';

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
          {avaliacao && (
            <>
              <span>{nomeCandidato}</span>
              <Icone nome="setaDireita" tamanho={14} />
            </>
          )}
          <span aria-current="page">Elegibilidade</span>
        </nav>

        <header className="estudos-cabecalho">
          <div>
            <h1>Avaliação de elegibilidade</h1>
            {avaliacao && (
              <p className="estudos-subtitulo">
                {avaliacao.candidato.nome} • {avaliacao.candidato.email}
              </p>
            )}
          </div>
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando avaliação…</p>}

        {tela.tipo === 'erro' && (
          <div className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            <span className="aviso-texto">{tela.mensagem}</span>
            <button type="button" className="botao botao-secundario" onClick={tentarNovamente}>
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

        {avaliacao && estudo && (
          <div className="elegibilidade-grade">
            <form className="elegibilidade-coluna" onSubmit={enviar} noValidate>
              {!editavel && (
                <p className="aviso aviso-informacao">
                  <Icone nome="info" />
                  {incluido
                    ? 'O candidato já foi incluído: a avaliação fica no histórico e não pode mais ser corrigida.'
                    : 'Só é possível avaliar candidatos com o estudo em Recrutamento.'}
                </p>
              )}

              {avaliacao.itens.length === 0 ? (
                <p className="estudos-cartao elegibilidade-sem-criterios">
                  O protocolo deste estudo não tem critérios cadastrados.
                </p>
              ) : (
                <div className="estudos-cartao elegibilidade-criterios">
                  {(['INCLUSAO', 'EXCLUSAO'] as const).map((tipo) => {
                    const itens = itensAtuais.filter((i) => i.tipo === tipo);
                    if (itens.length === 0) return null;
                    return (
                      <section key={tipo} aria-labelledby={`grupo-${tipo}`}>
                        <header className="elegibilidade-grupo">
                          <h2 id={`grupo-${tipo}`}>{CABECALHOS[tipo].titulo}</h2>
                          <p>{CABECALHOS[tipo].ajuda}</p>
                        </header>
                        <ul className="elegibilidade-lista">
                          {itens.map((item) => (
                            <li
                              key={item.criterioId}
                              className={
                                item.resposta === null && situacao !== 'NAO_AVALIADO'
                                  ? 'elegibilidade-item elegibilidade-item-pendente'
                                  : 'elegibilidade-item'
                              }
                            >
                              <span className="elegibilidade-texto">
                                <span id={`criterio-${item.criterioId}`}>{item.descricao}</span>
                                {item.resposta === null && situacao !== 'NAO_AVALIADO' && (
                                  <span className="elegibilidade-sem-resposta">Sem resposta</span>
                                )}
                              </span>
                              <span
                                className="elegibilidade-opcoes"
                                role="radiogroup"
                                aria-labelledby={`criterio-${item.criterioId}`}
                              >
                                {OPCOES_RESPOSTA[tipo].map((opcao, indice) => {
                                  const marcada = item.resposta === opcao;
                                  const favoravel = indice === 0;
                                  return (
                                    <label
                                      key={opcao}
                                      className={`elegibilidade-opcao${
                                        marcada ? (favoravel ? ' elegibilidade-opcao-ok' : ' elegibilidade-opcao-perigo') : ''
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`criterio-${item.criterioId}`}
                                        value={opcao}
                                        checked={marcada}
                                        disabled={!editavel || enviando}
                                        onChange={() => marcar(item.criterioId, opcao)}
                                        // Rádio marcado não dispara onChange: o clique nele volta a "sem resposta"
                                        onClick={() => marcada && marcar(item.criterioId, null)}
                                      />
                                      {marcada && <Icone nome={favoravel ? 'sucesso' : 'fechar'} tamanho={14} />}
                                      {NOMES_RESPOSTA[opcao]}
                                    </label>
                                  );
                                })}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}

              {editavel && situacao === 'INELEGIVEL' && (
                <p className="aviso aviso-erro">
                  <Icone nome="alerta" />
                  Candidato inelegível: a inclusão ficará bloqueada.
                </p>
              )}
              {editavel && situacao === 'ELEGIVEL' && (
                <p className="aviso aviso-informacao">
                  <Icone nome="info" />
                  A avaliação pode ser corrigida até a inclusão do candidato. Depois disso, fica no histórico.
                </p>
              )}

              {erroGeral && (
                <p className="aviso aviso-erro" role="alert">
                  <Icone nome="alerta" />
                  {erroGeral}
                </p>
              )}

              <div className="estudos-acoes elegibilidade-acoes">
                <Link className="botao botao-secundario" to={caminhoLista}>
                  {editavel ? 'Cancelar' : 'Voltar ao recrutamento'}
                </Link>
                {editavel && avaliacao.itens.length > 0 && (
                  <button type="submit" className="botao botao-primario" disabled={enviando}>
                    <Icone nome="sucesso" />
                    {enviando ? 'Salvando…' : 'Salvar avaliação'}
                  </button>
                )}
              </div>
            </form>

            <QuadroResultado situacao={situacao} resumo={resumo} avaliacao={avaliacao} />
          </div>
        )}
      </main>
    </div>
  );
}

// <-------------------RESULTADO DA AVALIAÇÃO------------------->
type PropsResultado = { situacao: Elegibilidade; resumo: ResumoAvaliacao; avaliacao: AvaliacaoElegibilidade };

const EXPLICACOES: Record<Elegibilidade, string> = {
  NAO_AVALIADO: 'Marque cada critério para ver o resultado.',
  INCOMPLETA:
    'Responda todos os critérios para concluir a avaliação. Enquanto estiver incompleta, a inclusão fica bloqueada.',
  ELEGIVEL: 'Todos os critérios de inclusão foram atendidos e nenhum critério de exclusão está presente.',
  INELEGIVEL: 'O candidato não pode ser incluído enquanto a avaliação for esta.',
};

// Motivo da inelegibilidade antes da explicação, como no protótipo
function explicacao(situacao: Elegibilidade, resumo: ResumoAvaliacao): string {
  if (situacao !== 'INELEGIVEL') return EXPLICACOES[situacao];
  const motivos = [
    resumo.inclusaoNaoAtendidos > 0 &&
      (resumo.inclusaoNaoAtendidos === 1
        ? 'Um critério de inclusão não foi atendido.'
        : `${resumo.inclusaoNaoAtendidos} critérios de inclusão não foram atendidos.`),
    resumo.exclusaoPresentes > 0 &&
      (resumo.exclusaoPresentes === 1
        ? 'Um critério de exclusão está presente.'
        : `${resumo.exclusaoPresentes} critérios de exclusão estão presentes.`),
  ].filter(Boolean);
  return `${motivos.join(' ')} ${EXPLICACOES.INELEGIVEL}`;
}

type Linha = { icone: NomeIcone; tom: 'ok' | 'atencao' | 'perigo'; texto: string };

function QuadroResultado({ situacao, resumo, avaliacao }: PropsResultado) {
  const linhas: Linha[] = [];
  if (resumo.inclusaoTotal > 0) {
    linhas.push({
      icone: resumo.inclusaoAtendidos === resumo.inclusaoTotal ? 'sucesso' : 'alerta',
      tom:
        resumo.inclusaoNaoAtendidos > 0
          ? 'perigo'
          : resumo.inclusaoAtendidos === resumo.inclusaoTotal
            ? 'ok'
            : 'atencao',
      texto: `${resumo.inclusaoAtendidos} de ${resumo.inclusaoTotal} critérios de inclusão atendidos`,
    });
  }
  if (resumo.exclusaoTotal > 0) {
    linhas.push({
      icone: resumo.exclusaoPresentes > 0 ? 'alerta' : 'sucesso',
      tom: resumo.exclusaoPresentes > 0 ? 'perigo' : 'ok',
      texto: `${resumo.exclusaoPresentes} de ${resumo.exclusaoTotal} critérios de exclusão presentes`,
    });
  }
  if (resumo.semResposta > 0 && situacao !== 'NAO_AVALIADO') {
    linhas.push({
      icone: 'relogio',
      tom: 'atencao',
      texto: resumo.semResposta === 1 ? '1 critério sem resposta' : `${resumo.semResposta} critérios sem resposta`,
    });
  }

  const registro =
    avaliacao.avaliadoPor && avaliacao.avaliadoEm
      ? `Avaliada por ${avaliacao.avaliadoPor} em ${formatarDataHora(avaliacao.avaliadoEm)}.`
      : 'Ainda não há avaliação salva.';

  return (
    <aside className="estudos-cartao elegibilidade-resultado" aria-labelledby="resultado-avaliacao">
      <h2 id="resultado-avaliacao">Resultado da avaliação</h2>
      <span className={`etiqueta etiqueta-${situacao.toLowerCase()}`} aria-live="polite">
        {NOMES_ELEGIBILIDADE[situacao]}
      </span>
      <p className="elegibilidade-explicacao">{explicacao(situacao, resumo)}</p>
      {linhas.length > 0 && (
        <ul className="elegibilidade-contagens">
          {linhas.map((linha) => (
            <li key={linha.texto} className={`elegibilidade-contagem-${linha.tom}`}>
              <Icone nome={linha.icone} tamanho={16} />
              {linha.texto}
            </li>
          ))}
        </ul>
      )}
      <div className="elegibilidade-registro">
        <h3>Registro</h3>
        <p>{registro}</p>
      </div>
    </aside>
  );
}
