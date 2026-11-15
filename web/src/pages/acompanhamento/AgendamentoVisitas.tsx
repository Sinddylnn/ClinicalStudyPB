import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  recursosAcompanhamento,
  servicoAcompanhamento,
  type Participacao,
  type RecursosAcompanhamento,
  type ResumoVisitaAgendada,
  type ServicoAcompanhamento,
} from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import { servicoProtocolo, type ServicoProtocolo, type VisitaPrevista } from '../../api/protocolo';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import { formatarDataHora } from '../recrutamento/formatacao';
import {
  hojeRecife,
  limitesData,
  motivoSemAgendamento,
  paraCamposLocais,
  paraInstant,
  validarAgendamento,
  type ErrosAgendamento,
  type ValoresAgendamento,
} from './agendamento';
import { NOMES_SITUACAO_PARTICIPACAO, NOMES_SITUACAO_VISITA } from './historico';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './acompanhamento.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoAcompanhamento?: ServicoAcompanhamento;
  servicoProtocolo?: ServicoProtocolo;
  /** O que o backend de acompanhamento já oferece; quando omitido, vem do serviço em uso. */
  recursos?: RecursosAcompanhamento;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type Dados = {
  estudo: Estudo;
  participacao: Participacao;
  visitasPrevistas: VisitaPrevista[];
  /** null quando o backend ainda não tem o histórico, de onde as visitas vêm. */
  visitas: ResumoVisitaAgendada[] | null;
};

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | ({ tipo: 'pronto' } & Dados);

/** Agendar uma visita prevista nova ou mudar a data de uma visita que ainda está agendada. */
type Modo = { tipo: 'agendar' } | { tipo: 'reagendar'; visita: ResumoVisitaAgendada };

const VAZIO: ValoresAgendamento = { visitaPrevistaId: '', data: '', hora: '' };

const DURACAO_NOTIFICACAO_MS = 6000;

// Erros do backend que mudam o que a tela pode oferecer: mostra a mensagem e recarrega os dados
const CODIGOS_RECARREGAM = ['ESTADO_ESTUDO_INVALIDO', 'PARTICIPACAO_INVALIDA', 'TRANSICAO_VISITA_INVALIDA'];

/** Fora da lista da sessão é "não encontrado", sem nem pedir as participações (como nas outras telas). */
async function carregar(
  estudoId: number,
  participacaoId: number,
  estudos: ServicoEstudos,
  acompanhamento: ServicoAcompanhamento,
  protocolo: ServicoProtocolo,
  historicoDisponivel: boolean,
): Promise<Dados | null> {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  const [participacoes, dadosProtocolo, visitas] = await Promise.all([
    acompanhamento.listarParticipacoes(estudoId),
    protocolo.obter(estudoId),
    historicoDisponivel ? acompanhamento.listarVisitas(estudoId, participacaoId) : Promise.resolve(null),
  ]);
  const participacao = participacoes.find((p) => p.id === participacaoId);
  if (!participacao) return null;
  const visitasPrevistas = [...dadosProtocolo.visitas].sort((a, b) => a.ordem - b.ordem);
  const ordenadas = visitas && [...visitas].sort((a, b) => Date.parse(a.dataHora) - Date.parse(b.dataHora));
  return { estudo, participacao, visitasPrevistas, visitas: ordenadas };
}

// <-------------------AGENDAMENTO DE VISITAS------------------->
// RF12: o coordenador vinculado agenda as visitas previstas do protocolo para um participante ativo,
// com o estudo em Recrutamento ou Execução, e reagenda as que ainda estão agendadas. Datas em Recife
export default function AgendamentoVisitas({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoAcompanhamento: acompanhamentoProp = servicoAcompanhamento,
  servicoProtocolo: protocoloProp = servicoProtocolo,
  recursos = recursosAcompanhamento,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id, participacaoId: idParticipacao } = useParams();
  const estudoId = Number(id);
  const participacaoId = Number(idParticipacao);
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [modo, setModo] = useState<Modo>({ tipo: 'agendar' });
  const [valores, setValores] = useState<ValoresAgendamento>(VAZIO);
  const [erros, setErros] = useState<ErrosAgendamento>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [notificacao, setNotificacao] = useState<string>();

  const buscar = useCallback(
    () => carregar(estudoId, participacaoId, estudosProp, acompanhamentoProp, protocoloProp, recursos.historico),
    [estudoId, participacaoId, estudosProp, acompanhamentoProp, protocoloProp, recursos.historico],
  );

  useEffect(() => {
    let ativo = true;
    buscar()
      .then((dados) => {
        if (ativo) setTela(dados ? { tipo: 'pronto', ...dados } : { tipo: 'nao-encontrado' });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar o agendamento.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [buscar, tentativa]);

  useEffect(() => {
    if (!notificacao) return;
    const temporizador = setTimeout(() => setNotificacao(undefined), DURACAO_NOTIFICACAO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacao]);

  /** Atualiza os dados sem voltar ao "Carregando", para não esconder o aviso ou a notificação. */
  const atualizar = async () => {
    const dados = await buscar().catch(() => undefined);
    if (dados) setTela({ tipo: 'pronto', ...dados });
  };

  const dados = tela.tipo === 'pronto' ? tela : undefined;
  const hoje = hojeRecife();
  const limites = dados ? limitesData(dados.estudo, hoje) : undefined;
  const bloqueio = dados ? motivoSemAgendamento(dados.estudo, dados.participacao) : undefined;
  const caminhoLista = `/estudos/${estudoId}/participacoes`;

  const alterar = (campo: keyof ValoresAgendamento, valor: string) => {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
    setErroGeral(undefined);
  };

  const iniciarReagendamento = (visita: ResumoVisitaAgendada) => {
    setModo({ tipo: 'reagendar', visita });
    setValores({ visitaPrevistaId: '', ...paraCamposLocais(visita.dataHora) });
    setErros({});
    setErroGeral(undefined);
  };

  const voltarAoAgendamento = () => {
    setModo({ tipo: 'agendar' });
    setValores(VAZIO);
    setErros({});
    setErroGeral(undefined);
  };

  const tratarErro = (erro: unknown) => {
    if (!(erro instanceof ErroRequisicao)) {
      setErroGeral('Não foi possível salvar o agendamento.');
      return;
    }
    if (erro.codigo === 'VALIDACAO_INVALIDA') {
      setErros({ visitaPrevistaId: erro.errosCampos.visitaPrevistaId, data: erro.errosCampos.dataHora });
      if (!erro.errosCampos.visitaPrevistaId && !erro.errosCampos.dataHora) setErroGeral(erro.message);
    } else if (erro.codigo === 'DATA_VISITA_INVALIDA') {
      setErros({ data: erro.message });
    } else if (erro.codigo === 'VISITA_JA_AGENDADA') {
      setErros({ visitaPrevistaId: erro.message });
    } else {
      if (CODIGOS_RECARREGAM.includes(erro.codigo)) {
        voltarAoAgendamento();
        void atualizar();
      }
      // Depois de voltarAoAgendamento, que limpa o aviso
      setErroGeral(erro.message);
    }
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!dados || bloqueio || enviando) return;
    setErroGeral(undefined);
    const reagendando = modo.tipo === 'reagendar';
    const encontrados = validarAgendamento(valores, dados.estudo, hoje, !reagendando);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    setEnviando(true);
    const dataHora = paraInstant(valores.data, valores.hora);
    try {
      const visita = reagendando
        ? await acompanhamentoProp.reagendarVisita(estudoId, participacaoId, modo.visita.id, { dataHora })
        : await acompanhamentoProp.agendarVisita(estudoId, participacaoId, {
            visitaPrevistaId: Number(valores.visitaPrevistaId),
            dataHora,
          });
      voltarAoAgendamento();
      setNotificacao(
        `${visita.nomeVisita} ${reagendando ? 'reagendada' : 'agendada'} para ${formatarDataHora(visita.dataHora)}.`,
      );
      await atualizar();
    } catch (erro) {
      tratarErro(erro);
    } finally {
      setEnviando(false);
    }
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

      <main className="estudos-conteudo estudos-conteudo-formulario">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={`/estudos/${estudoId}/recrutamento`}>{dados?.estudo.titulo ?? 'Estudo'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoLista}>Participantes</Link>
          <Icone nome="setaDireita" tamanho={14} />
          {dados && (
            <>
              <span>{dados.participacao.participanteNome}</span>
              <Icone nome="setaDireita" tamanho={14} />
            </>
          )}
          <span aria-current="page">Agendamento</span>
        </nav>

        <header className="estudos-cabecalho estudos-cabecalho-formulario">
          <div>
            <h1>Agendamento de visitas</h1>
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
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando agendamento…</p>}

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
            <p>O participante não existe neste estudo ou o estudo não está vinculado a você como coordenador.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {dados && limites && (
          <>
            {erroGeral && (
              <p className="aviso aviso-erro" role="alert">
                <Icone nome="alerta" />
                {erroGeral}
              </p>
            )}

            {bloqueio ? (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                {bloqueio}
              </p>
            ) : dados.visitasPrevistas.length === 0 ? (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />O protocolo do estudo não tem visitas previstas para agendar.
              </p>
            ) : (
              <form className="estudos-cartao agendamento-formulario" onSubmit={enviar} noValidate>
                <header>
                  <h2>{modo.tipo === 'reagendar' ? 'Reagendar visita' : 'Agendar visita'}</h2>
                  <p>Data e hora no horário de Recife, dentro do período do estudo.</p>
                </header>

                <div className="campo">
                  <label htmlFor="agendamento-visita" className="obrigatorio">
                    Visita prevista
                  </label>
                  {modo.tipo === 'reagendar' ? (
                    <input id="agendamento-visita" value={modo.visita.nomeVisita} disabled readOnly />
                  ) : (
                    <div className="entrada-selecao">
                      <select
                        id="agendamento-visita"
                        value={valores.visitaPrevistaId}
                        disabled={enviando}
                        aria-invalid={Boolean(erros.visitaPrevistaId)}
                        aria-describedby={erros.visitaPrevistaId ? 'erro-agendamento-visita' : undefined}
                        onChange={(e) => alterar('visitaPrevistaId', e.target.value)}
                      >
                        <option value="">Selecione a visita</option>
                        {dados.visitasPrevistas.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nome}
                          </option>
                        ))}
                      </select>
                      <Icone nome="setaBaixo" />
                    </div>
                  )}
                  {erros.visitaPrevistaId && (
                    <span id="erro-agendamento-visita" className="campo-erro">
                      {erros.visitaPrevistaId}
                    </span>
                  )}
                </div>

                <div className="agendamento-data-hora">
                  <div className="campo">
                    <label htmlFor="agendamento-data" className="obrigatorio">
                      Data
                    </label>
                    <input
                      id="agendamento-data"
                      type="date"
                      min={limites.min}
                      max={limites.max}
                      value={valores.data}
                      disabled={enviando}
                      aria-invalid={Boolean(erros.data)}
                      aria-describedby={erros.data ? 'erro-agendamento-data' : undefined}
                      onChange={(e) => alterar('data', e.target.value)}
                    />
                    {erros.data && (
                      <span id="erro-agendamento-data" className="campo-erro">
                        {erros.data}
                      </span>
                    )}
                  </div>
                  <div className="campo">
                    <label htmlFor="agendamento-hora" className="obrigatorio">
                      Hora
                    </label>
                    <input
                      id="agendamento-hora"
                      type="time"
                      value={valores.hora}
                      disabled={enviando}
                      aria-invalid={Boolean(erros.hora)}
                      aria-describedby={erros.hora ? 'erro-agendamento-hora' : undefined}
                      onChange={(e) => alterar('hora', e.target.value)}
                    />
                    {erros.hora && (
                      <span id="erro-agendamento-hora" className="campo-erro">
                        {erros.hora}
                      </span>
                    )}
                  </div>
                </div>

                <div className="estudos-acoes">
                  {modo.tipo === 'reagendar' && (
                    <button type="button" className="botao botao-secundario" onClick={voltarAoAgendamento}>
                      Cancelar reagendamento
                    </button>
                  )}
                  <button type="submit" className="botao botao-primario" disabled={enviando}>
                    <Icone nome="calendario" />
                    {enviando ? 'Salvando…' : modo.tipo === 'reagendar' ? 'Salvar nova data' : 'Agendar visita'}
                  </button>
                </div>
              </form>
            )}

            {dados.visitas === null ? (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                A lista de visitas agendadas e o reagendamento ficarão disponíveis quando o histórico do participante
                estiver no backend.
              </p>
            ) : (
              <section className="estudos-cartao agendamento-visitas" aria-labelledby="titulo-visitas">
                <h2 id="titulo-visitas">Visitas agendadas</h2>
                {dados.visitas.length === 0 ? (
                  <p className="campo-ajuda">Nenhuma visita agendada para este participante.</p>
                ) : (
                  <ul>
                    {dados.visitas.map((v) => (
                      <li key={v.id}>
                        <span className="agendamento-visita-dados">
                          <span className="agendamento-visita-nome">{v.nomeVisita}</span>
                          <span>{formatarDataHora(v.dataHora)}</span>
                        </span>
                        <span className={`etiqueta etiqueta-visita-${v.situacao.toLowerCase()}`}>
                          {NOMES_SITUACAO_VISITA[v.situacao]}
                        </span>
                        {v.situacao === 'AGENDADA' && !bloqueio && (
                          <button
                            type="button"
                            className="botao botao-secundario"
                            aria-label={`Reagendar ${v.nomeVisita}`}
                            disabled={enviando}
                            onClick={() => iniciarReagendamento(v)}
                          >
                            <Icone nome="lapis" />
                            Reagendar
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <div className="estudos-acoes">
              <Link className="botao botao-secundario" to={caminhoLista}>
                Voltar
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
