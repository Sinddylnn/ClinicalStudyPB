import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import {
  recursosAcompanhamento,
  servicoAcompanhamento,
  type ItemHistoricoRetirada,
  type ItemHistoricoVisita,
  type Participacao,
  type RecursosAcompanhamento,
  type ServicoAcompanhamento,
} from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import { formatarDataHora } from '../recrutamento/formatacao';
import {
  NOMES_SITUACAO_PARTICIPACAO,
  NOMES_SITUACAO_VISITA,
  nomeResponsavel,
  ordenarHistorico,
} from './historico';
import type { AvisoResultados } from './ResultadosVisita';
import DialogoRetirada from './DialogoRetirada';
import { podeRetirar } from './retirada';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './acompanhamento.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoAcompanhamento?: ServicoAcompanhamento;
  /** O que o backend de acompanhamento já oferece; quando omitido, vem do serviço em uso. */
  recursos?: RecursosAcompanhamento;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type Dados = { estudo: Estudo; participacao: Participacao; itens: ReturnType<typeof ordenarHistorico> };

const DURACAO_NOTIFICACAO_MS = 6000;

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | ({ tipo: 'pronto' } & Dados);

/** Fora da lista da sessão é "não encontrado", sem nem pedir o histórico (como nas outras telas). */
async function carregar(
  estudoId: number,
  participacaoId: number,
  estudos: ServicoEstudos,
  acompanhamento: ServicoAcompanhamento,
): Promise<Dados | null> {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  const [participacoes, historico] = await Promise.all([
    acompanhamento.listarParticipacoes(estudoId),
    acompanhamento.obterHistorico(estudoId, participacaoId),
  ]);
  const participacao = participacoes.find((p) => p.id === participacaoId);
  if (!participacao) return null;
  return { estudo, participacao, itens: ordenarHistorico(historico.itens) };
}

// <-------------------HISTÓRICO DO PARTICIPANTE------------------->
// RF15: visitas e avaliações do participante, somente para consulta. Vale para o coordenador
// vinculado e o pesquisador responsável, inclusive com o estudo encerrado ou o participante retirado
export default function HistoricoParticipante({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoAcompanhamento: acompanhamentoProp = servicoAcompanhamento,
  recursos = recursosAcompanhamento,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id, participacaoId: idParticipacao } = useParams();
  const estudoId = Number(id);
  const participacaoId = Number(idParticipacao);
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const [retirando, setRetirando] = useState(false);

  // Aviso de quem acabou de salvar resultados (vem pela navegação) ou de registrar a retirada;
  // o da navegação é limpo do histórico do navegador para não reaparecer
  const [notificacao, setNotificacao] = useState<string | undefined>(
    () => (location.state as AvisoResultados | null)?.aviso,
  );
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
  useEffect(() => {
    if (!notificacao) return;
    const temporizador = setTimeout(() => setNotificacao(undefined), DURACAO_NOTIFICACAO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacao]);

  useEffect(() => {
    let ativo = true;
    carregar(estudoId, participacaoId, estudosProp, acompanhamentoProp)
      .then((dados) => {
        if (ativo) setTela(dados ? { tipo: 'pronto', ...dados } : { tipo: 'nao-encontrado' });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar o histórico.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, acompanhamentoProp, estudoId, participacaoId, tentativa]);

  const dados = tela.tipo === 'pronto' ? tela : undefined;
  // O coordenador chega pelo recrutamento; o pesquisador, pela tela do estudo
  const caminhoEstudo = usuario.perfil === 'COORDENADOR' ? `/estudos/${estudoId}/recrutamento` : `/estudos/${estudoId}`;
  // Chega-se ao histórico pela lista de participantes. Enquanto o backend nega a lista ao pesquisador,
  // ele volta para a tela do estudo e a trilha não mostra o nível "Participantes"
  const caminhoParticipantes = `/estudos/${estudoId}/participacoes`;
  const acessaLista = usuario.perfil === 'COORDENADOR' || recursos.listaPesquisador;
  const caminhoVoltar = acessaLista ? caminhoParticipantes : caminhoEstudo;
  const coordenador = usuario.perfil === 'COORDENADOR';
  // Só o coordenador registra resultados, enquanto o estudo não encerra e o participante não é retirado (RF14)
  const registraResultados =
    coordenador && dados?.estudo.estado !== 'ENCERRADO' && dados?.participacao.situacao !== 'RETIRADA';
  const caminhoResultados = (visitaId: number) =>
    `/estudos/${estudoId}/participacoes/${participacaoId}/visitas/${visitaId}/resultados`;
  // Retirada (RF16): coordenador, participação ativa e estudo em recrutamento ou execução
  const retira = Boolean(coordenador && recursos.retirada && dados && podeRetirar(dados.estudo, dados.participacao));
  const visitasDoHistorico = dados?.itens.filter((i): i is ItemHistoricoVisita => i.tipo === 'VISITA') ?? [];

  const retirar = async (motivo: string) => {
    await acompanhamentoProp.retirarParticipante(estudoId, participacaoId, { motivo });
    setRetirando(false);
    setNotificacao(`Retirada de ${dados?.participacao.participanteNome ?? 'participante'} registrada.`);
    // Recarrega sem voltar ao "Carregando": a situação e as visitas canceladas vêm do backend
    const novos = await carregar(estudoId, participacaoId, estudosProp, acompanhamentoProp).catch(() => undefined);
    if (novos) setTela({ tipo: 'pronto', ...novos });
  };

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      {notificacao && (
        <p className="notificacao" role="status">
          <Icone nome="sucesso" />
          {notificacao}
        </p>
      )}

      <main className="estudos-conteudo">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoEstudo}>{dados?.estudo.titulo ?? 'Estudo'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          {acessaLista && (
            <>
              <Link to={caminhoParticipantes}>Participantes</Link>
              <Icone nome="setaDireita" tamanho={14} />
            </>
          )}
          {dados && (
            <>
              <span>{dados.participacao.participanteNome}</span>
              <Icone nome="setaDireita" tamanho={14} />
            </>
          )}
          <span aria-current="page">Histórico</span>
        </nav>

        <header className="estudos-cabecalho">
          <div>
            <h1>Histórico do participante</h1>
            {dados && (
              <p className="estudos-subtitulo historico-subtitulo">
                <span>{dados.participacao.participanteNome}</span>
                <span className={`etiqueta etiqueta-participacao-${dados.participacao.situacao.toLowerCase()}`}>
                  {NOMES_SITUACAO_PARTICIPACAO[dados.participacao.situacao]}
                </span>
                <span>Incluído em {formatarDataHora(dados.participacao.dataInclusao)}</span>
              </p>
            )}
          </div>
          {retira && (
            <button type="button" className="botao botao-retirar" onClick={() => setRetirando(true)}>
              <Icone nome="usuarioX" />
              Retirar do estudo
            </button>
          )}
        </header>

        {retirando && dados && (
          <DialogoRetirada
            participanteNome={dados.participacao.participanteNome}
            visitasAgendadas={visitasDoHistorico.filter((v) => v.situacao === 'AGENDADA').length}
            realizadasSemResultado={
              visitasDoHistorico.filter((v) => v.situacao === 'REALIZADA' && v.resultados.length === 0).length
            }
            aoRetirar={retirar}
            aoCancelar={() => setRetirando(false)}
          />
        )}

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando histórico…</p>}

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
            <h2>Participante não encontrado</h2>
            <p>O participante não existe neste estudo ou o estudo não está vinculado a você.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {dados && (
          <>
            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              {registraResultados
                ? 'Os resultados das avaliações são fictícios.'
                : 'Somente consulta. Os resultados das avaliações são fictícios.'}
            </p>

            {dados.itens.length === 0 ? (
              <section className="estudos-cartao estudos-vazio">
                <span className="estudos-vazio-icone">
                  <Icone nome="calendario" tamanho={30} />
                </span>
                <h2>Nenhuma visita agendada</h2>
                <p>As visitas aparecem aqui assim que forem agendadas.</p>
              </section>
            ) : (
              <ol className="historico-linha" aria-label="Eventos do participante">
                {dados.itens.map((item) =>
                  item.tipo === 'VISITA' ? (
                    <EventoVisita
                      key={`visita-${item.visitaAgendadaId}`}
                      visita={item}
                      caminhoResultados={
                        registraResultados && item.situacao === 'REALIZADA'
                          ? caminhoResultados(item.visitaAgendadaId)
                          : undefined
                      }
                    />
                  ) : (
                    <EventoRetirada key="retirada" retirada={item} />
                  ),
                )}
              </ol>
            )}

            <div className="estudos-acoes">
              <Link className="botao botao-secundario" to={caminhoVoltar}>
                Voltar
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// <-------------------EVENTOS------------------->
function EventoVisita({ visita, caminhoResultados }: { visita: ItemHistoricoVisita; caminhoResultados?: string }) {
  const tituloId = `visita-${visita.visitaAgendadaId}`;
  const situacao = NOMES_SITUACAO_VISITA[visita.situacao];
  const realizada = visita.situacao === 'REALIZADA';

  return (
    <li className="estudos-cartao historico-evento" aria-labelledby={tituloId}>
      <span className={`historico-marcador historico-marcador-${visita.situacao.toLowerCase()}`} aria-hidden="true">
        <Icone nome="calendario" tamanho={16} />
      </span>
      <div className="historico-corpo">
        <header className="historico-cabecalho">
          <h2 id={tituloId}>{visita.nomeVisita}</h2>
          <span className={`etiqueta etiqueta-visita-${visita.situacao.toLowerCase()}`}>{situacao}</span>
        </header>

        <dl className="historico-dados">
          <div>
            <dt>Data agendada</dt>
            <dd>{formatarDataHora(visita.dataHora)}</dd>
          </div>
          {visita.registradoPorId !== null && visita.registradoEm && (
            <div>
              <dt>Registro</dt>
              <dd>
                {situacao} por {nomeResponsavel(visita.registradoPorId, visita.registradoPorNome)} em{' '}
                {formatarDataHora(visita.registradoEm)}
              </dd>
            </div>
          )}
          {visita.motivo && (
            <div>
              <dt>Motivo</dt>
              <dd>{visita.motivo}</dd>
            </div>
          )}
        </dl>

        {realizada && (
          <section className="historico-resultados" aria-label={`Resultados da ${visita.nomeVisita}`}>
            <h3>Resultados das avaliações</h3>
            {visita.resultados.length === 0 ? (
              <p className="campo-ajuda">Nenhum resultado registrado.</p>
            ) : (
              <ul>
                {visita.resultados.map((r) => (
                  <li key={r.atividadePrevistaId}>
                    <span className="historico-atividade">{r.descricaoAtividade}</span>
                    <span>{r.texto}</span>
                  </li>
                ))}
              </ul>
            )}
            {caminhoResultados && (
              <p className="historico-acoes">
                <Link
                  className="botao botao-secundario"
                  to={caminhoResultados}
                  aria-label={`${visita.resultados.length > 0 ? 'Editar' : 'Registrar'} resultados da ${visita.nomeVisita}`}
                >
                  <Icone nome="lapis" />
                  {visita.resultados.length > 0 ? 'Editar resultados' : 'Registrar resultados'}
                </Link>
              </p>
            )}
          </section>
        )}

        {visita.correcoes.length > 0 && (
          <section className="historico-correcoes" aria-label={`Correções da ${visita.nomeVisita}`}>
            <h3>Correções</h3>
            <ul>
              {visita.correcoes.map((c) => (
                <li key={c.corrigidaEm}>
                  De {NOMES_SITUACAO_VISITA[c.situacaoAnterior]} para {NOMES_SITUACAO_VISITA[c.situacaoNova]} por{' '}
                  {nomeResponsavel(c.corrigidaPorId, c.corrigidaPorNome)} em {formatarDataHora(c.corrigidaEm)}:{' '}
                  {c.justificativa}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </li>
  );
}

function EventoRetirada({ retirada }: { retirada: ItemHistoricoRetirada }) {
  return (
    <li className="estudos-cartao historico-evento historico-evento-retirada" aria-labelledby="evento-retirada">
      <span className="historico-marcador historico-marcador-retirada" aria-hidden="true">
        <Icone nome="usuarioX" tamanho={16} />
      </span>
      <div className="historico-corpo">
        <header className="historico-cabecalho">
          <h2 id="evento-retirada">Retirada do estudo</h2>
          <span className="etiqueta etiqueta-participacao-retirada">Retirado</span>
        </header>
        <dl className="historico-dados">
          <div>
            <dt>Registro</dt>
            <dd>
              Por {nomeResponsavel(retirada.retiradaPorId, retirada.retiradaPorNome)} em{' '}
              {formatarDataHora(retirada.dataRetirada)}
            </dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{retirada.motivo}</dd>
          </div>
        </dl>
      </div>
    </li>
  );
}
