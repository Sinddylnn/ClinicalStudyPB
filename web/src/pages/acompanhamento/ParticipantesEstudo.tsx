import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  recursosAcompanhamento,
  servicoAcompanhamento,
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
import { NOMES_ESTADO } from '../estudos/formatacao';
import { formatarDataHora } from '../recrutamento/formatacao';
import { estadoPermiteAgendamento } from './agendamento';
import DialogoRetirada from './DialogoRetirada';
import { NOMES_SITUACAO_PARTICIPACAO } from './historico';
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

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'indisponivel'; estudo: Estudo }
  | { tipo: 'pronto'; estudo: Estudo; participacoes: Participacao[] };

const DURACAO_NOTIFICACAO_MS = 6000;

const textoContagem =(total: number) => (total === 1 ? '1 participante incluído' : `${total} participantes incluídos`);

// <-------------------PARTICIPANTES INCLUÍDOS------------------->
// RF12: participantes incluídos no estudo, inclusive os retirados. O coordenador vinculado agenda visitas
// dos participantes ativos; o pesquisador responsável só consulta. Os dois abrem o histórico (RF15)
export default function ParticipantesEstudo({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoAcompanhamento: acompanhamentoProp = servicoAcompanhamento,
  recursos = recursosAcompanhamento,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id } = useParams();
  const estudoId = Number(id);
  const coordenador = usuario.perfil === 'COORDENADOR';
  // Enquanto o backend nega a lista ao pesquisador, a tela nem pede (iria para "Acesso negado")
  const consultaLiberada = coordenador || recursos.listaPesquisador;
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    (async () => {
      // Fora da lista da sessão é "não encontrado", sem nem pedir as participações
      const estudo = (await estudosProp.listar()).find((e) => e.id === estudoId);
      if (!estudo) return { tipo: 'nao-encontrado' } as const;
      if (!consultaLiberada) return { tipo: 'indisponivel', estudo } as const;
      const participacoes = await acompanhamentoProp.listarParticipacoes(estudoId);
      return { tipo: 'pronto', estudo, participacoes } as const;
    })()
      .then((novo) => {
        if (ativo) setTela(novo);
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem =
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar os participantes.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, acompanhamentoProp, estudoId, consultaLiberada, tentativa]);

  const estudo = tela.tipo === 'pronto' || tela.tipo === 'indisponivel' ? tela.estudo : undefined;
  // O coordenador chega pelo recrutamento; o pesquisador, pela tela do estudo
  const caminhoEstudo = coordenador ? `/estudos/${estudoId}/recrutamento` : `/estudos/${estudoId}`;
  const agendaVisitas = coordenador && estudo !== undefined && estadoPermiteAgendamento(estudo);
  const temAcoes = recursos.historico || coordenador;
  // Retirada (RF16): mesmas condições do agendamento, para participação ativa
  const retiraParticipantes = agendaVisitas && recursos.retirada;
  const [retirando, setRetirando] = useState<Participacao>();
  const [notificacao, setNotificacao] = useState<string>();

  useEffect(() => {
    if (!notificacao) return;
    const temporizador = setTimeout(() => setNotificacao(undefined), DURACAO_NOTIFICACAO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacao]);

  const retirar = async (participacao: Participacao, motivo: string) => {
    await acompanhamentoProp.retirarParticipante(estudoId, participacao.id, { motivo });
    setRetirando(undefined);
    setNotificacao(`Retirada de ${participacao.participanteNome} registrada.`);
    // Atualiza a situação sem voltar ao "Carregando"
    const participacoes = await acompanhamentoProp.listarParticipacoes(estudoId).catch(() => undefined);
    if (participacoes) setTela((atual) => (atual.tipo === 'pronto' ? { ...atual, participacoes } : atual));
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

      {retirando && (
        <DialogoRetirada
          participanteNome={retirando.participanteNome}
          aoRetirar={(motivo) => retirar(retirando, motivo)}
          aoCancelar={() => setRetirando(undefined)}
        />
      )}

      <main className="estudos-conteudo">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoEstudo}>{estudo?.titulo ?? 'Estudo'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Participantes</span>
        </nav>

        <header className="estudos-cabecalho">
          <div>
            <h1>Participantes incluídos</h1>
            {estudo && (
              <p className="estudos-subtitulo historico-subtitulo">
                <span>{estudo.titulo}</span>
                <span className={`etiqueta etiqueta-${estudo.estado.toLowerCase()}`}>{NOMES_ESTADO[estudo.estado]}</span>
              </p>
            )}
          </div>
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando participantes…</p>}

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
            <h2>Estudo não encontrado</h2>
            <p>O estudo não existe ou não está vinculado a você.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {tela.tipo === 'indisponivel' && (
          <p className="aviso aviso-informacao">
            <Icone nome="info" />
            A consulta dos participantes pelo pesquisador responsável ficará disponível quando o backend liberar
            esta lista.
          </p>
        )}

        {tela.tipo === 'pronto' && (
          <>
            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              {!coordenador
                ? 'Somente consulta. O agendamento de visitas é feito pelo coordenador do estudo.'
                : agendaVisitas
                  ? 'Participantes retirados continuam na lista, mas não recebem novos agendamentos.'
                  : 'O agendamento de visitas só fica disponível com o estudo em Recrutamento ou Execução.'}
            </p>

            {tela.participacoes.length === 0 ? (
              <section className="estudos-cartao estudos-vazio">
                <span className="estudos-vazio-icone">
                  <Icone nome="usuarios" tamanho={30} />
                </span>
                <h2>Nenhum participante incluído</h2>
                <p>Os participantes aparecem aqui assim que forem incluídos no recrutamento.</p>
              </section>
            ) : (
              <section className="estudos-cartao participantes-tabela-cartao" aria-label="Lista de participantes">
                <table className="estudos-tabela participantes-tabela">
                  <thead>
                    <tr>
                      <th scope="col">Participante</th>
                      <th scope="col">Data de inclusão</th>
                      <th scope="col">Situação</th>
                      {temAcoes && <th scope="col">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tela.participacoes.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="estudos-titulo">{p.participanteNome}</span>
                        </td>
                        <td>{formatarDataHora(p.dataInclusao)}</td>
                        <td>
                          <span className={`etiqueta etiqueta-participacao-${p.situacao.toLowerCase()}`}>
                            {NOMES_SITUACAO_PARTICIPACAO[p.situacao]}
                          </span>
                        </td>
                        {temAcoes && (
                          <td>
                            <span className="participantes-acoes">
                              {recursos.historico && (
                                <Link
                                  className="botao botao-secundario"
                                  to={`/estudos/${estudoId}/participacoes/${p.id}/historico`}
                                  aria-label={`Ver histórico de ${p.participanteNome}`}
                                >
                                  Ver histórico
                                </Link>
                              )}
                              {agendaVisitas && p.situacao === 'ATIVA' && (
                                <Link
                                  className="botao botao-primario"
                                  to={`/estudos/${estudoId}/participacoes/${p.id}/visitas`}
                                  aria-label={`Agendar visitas de ${p.participanteNome}`}
                                >
                                  <Icone nome="calendario" />
                                  Agendar visitas
                                </Link>
                              )}
                              {retiraParticipantes && p.situacao === 'ATIVA' && (
                                <button
                                  type="button"
                                  className="botao botao-retirar"
                                  onClick={() => setRetirando(p)}
                                  aria-label={`Retirar ${p.participanteNome} do estudo`}
                                >
                                  <Icone nome="usuarioX" />
                                  Retirar
                                </button>
                              )}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="estudos-rodape">{textoContagem(tela.participacoes.length)}</p>
              </section>
            )}
          </>
        )}

        {estudo && (
          <div className="estudos-acoes">
            <Link className="botao botao-secundario" to={caminhoEstudo}>
              Voltar
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
