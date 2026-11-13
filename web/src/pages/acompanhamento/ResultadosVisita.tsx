import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  servicoAcompanhamento,
  type Participacao,
  type ResultadoAtividade,
  type ServicoAcompanhamento,
  type VisitaAgendada,
} from '../../api/acompanhamento';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import { servicoProtocolo, type AtividadePrevista, type ServicoProtocolo } from '../../api/protocolo';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import { formatarDataHora } from '../recrutamento/formatacao';
import { NOMES_SITUACAO_VISITA, nomeResponsavel } from './historico';
import { LIMITE_RESULTADO, planejarSalvamento, type Envio } from './resultados';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './acompanhamento.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoAcompanhamento?: ServicoAcompanhamento;
  servicoProtocolo?: ServicoProtocolo;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type Dados = {
  estudo: Estudo;
  participacao: Participacao;
  visita: VisitaAgendada;
  atividades: AtividadePrevista[];
  resultados: ResultadoAtividade[];
};

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | ({ tipo: 'pronto' } & Dados);

/** Aviso mostrado no histórico depois de salvar. */
export type AvisoResultados = { aviso: string };

/** Fora da lista da sessão é "não encontrado", sem nem pedir a visita (como nas outras telas). */
async function carregar(
  estudoId: number,
  participacaoId: number,
  visitaId: number,
  estudos: ServicoEstudos,
  acompanhamento: ServicoAcompanhamento,
  protocolo: ServicoProtocolo,
): Promise<Dados | null> {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  const [participacoes, visita, resultados, dadosProtocolo] = await Promise.all([
    acompanhamento.listarParticipacoes(estudoId),
    acompanhamento.obterVisita(estudoId, participacaoId, visitaId),
    acompanhamento.listarResultados(estudoId, participacaoId, visitaId),
    protocolo.obter(estudoId),
  ]);
  const participacao = participacoes.find((p) => p.id === participacaoId);
  if (!participacao) return null;
  const atividades = dadosProtocolo.visitas.find((v) => v.id === visita.visitaPrevistaId)?.atividades ?? [];
  return { estudo, participacao, visita, atividades, resultados };
}

const textosSalvos = (resultados: ResultadoAtividade[]) =>
  Object.fromEntries(resultados.map((r) => [r.atividadePrevistaId, r.texto]));

// <-------------------RESULTADOS DA VISITA------------------->
// RF14: o coordenador registra resultados fictícios das atividades previstas de uma visita realizada.
// O preenchimento pode ser parcial, e um resultado salvo pode ser editado enquanto o estudo não encerra
export default function ResultadosVisita({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoAcompanhamento: acompanhamentoProp = servicoAcompanhamento,
  servicoProtocolo: protocoloProp = servicoProtocolo,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id, participacaoId: idParticipacao, visitaId: idVisita } = useParams();
  const estudoId = Number(id);
  const participacaoId = Number(idParticipacao);
  const visitaId = Number(idVisita);
  const navigate = useNavigate();
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [valores, setValores] = useState<Record<number, string>>({});
  const [erros, setErros] = useState<Record<number, string>>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [semAlteracoes, setSemAlteracoes] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregar(estudoId, participacaoId, visitaId, estudosProp, acompanhamentoProp, protocoloProp)
      .then((dados) => {
        if (!ativo) return;
        if (!dados) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        setValores(textosSalvos(dados.resultados));
        setTela({ tipo: 'pronto', ...dados });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar a visita.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, acompanhamentoProp, protocoloProp, estudoId, participacaoId, visitaId, tentativa]);

  const dados = tela.tipo === 'pronto' ? tela : undefined;
  const caminhoHistorico = `/estudos/${estudoId}/participacoes/${participacaoId}/historico`;
  const realizada = dados?.visita.situacao === 'REALIZADA';
  const encerrado = dados?.estudo.estado === 'ENCERRADO';
  const editavel = Boolean(realizada && !encerrado && dados && dados.atividades.length > 0);

  const alterar = (atividadeId: number, texto: string) => {
    setValores((atual) => ({ ...atual, [atividadeId]: texto }));
    setErros((atual) => ({ ...atual, [atividadeId]: '' }));
    setErroGeral(undefined);
    setSemAlteracoes(false);
  };

  const enviarUm = (envio: Envio) =>
    envio.tipo === 'registrar'
      ? acompanhamentoProp.registrarResultado(estudoId, participacaoId, visitaId, {
          atividadePrevistaId: envio.atividadePrevistaId,
          texto: envio.texto,
        })
      : acompanhamentoProp.editarResultado(estudoId, participacaoId, visitaId, envio.resultadoId, envio.texto);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!dados || !editavel || enviando) return;
    setErroGeral(undefined);
    setSemAlteracoes(false);

    const plano = planejarSalvamento(dados.atividades, valores, dados.resultados);
    setErros(plano.erros);
    if (Object.keys(plano.erros).length > 0) return;
    if (plano.envios.length === 0) {
      setSemAlteracoes(true);
      return;
    }

    setEnviando(true);
    // Uma chamada por atividade, na ordem do protocolo; se uma falhar, as anteriores já ficaram salvas
    for (const envio of plano.envios) {
      try {
        await enviarUm(envio);
      } catch (erro) {
        setEnviando(false);
        const errosCampos = erro instanceof ErroRequisicao ? erro.errosCampos : undefined;
        if (errosCampos?.texto) setErros({ [envio.atividadePrevistaId]: errosCampos.texto });
        else setErroGeral(erro instanceof ErroRequisicao ? erro.message : 'Não foi possível salvar os resultados.');
        // Atualiza o que já foi salvo sem perder o que a pessoa digitou
        const salvos = await acompanhamentoProp.listarResultados(estudoId, participacaoId, visitaId).catch(() => null);
        if (salvos) setTela((atual) => (atual.tipo === 'pronto' ? { ...atual, resultados: salvos } : atual));
        return;
      }
    }

    const aviso: AvisoResultados = { aviso: `Resultados da ${dados.visita.nomeVisita} salvos.` };
    navigate(caminhoHistorico, { state: aviso });
  };

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="estudos-conteudo estudos-conteudo-formulario">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={`/estudos/${estudoId}/recrutamento`}>{dados?.estudo.titulo ?? 'Estudo'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoHistorico}>{dados?.participacao.participanteNome ?? 'Histórico'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Resultados</span>
        </nav>

        <header className="estudos-cabecalho estudos-cabecalho-formulario">
          <div>
            <h1>Resultados da visita</h1>
            {dados && (
              <p className="estudos-subtitulo historico-subtitulo">
                <span>{dados.participacao.participanteNome}</span>
                <span>•</span>
                <span>{dados.visita.nomeVisita}</span>
                <span className={`etiqueta etiqueta-visita-${dados.visita.situacao.toLowerCase()}`}>
                  {NOMES_SITUACAO_VISITA[dados.visita.situacao]}
                </span>
                <span>{formatarDataHora(dados.visita.dataHora)}</span>
              </p>
            )}
          </div>
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando visita…</p>}

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
              <Icone nome="calendario" tamanho={30} />
            </span>
            <h2>Visita não encontrada</h2>
            <p>A visita não existe para este participante ou o estudo não está vinculado a você como coordenador.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {dados && !realizada && (
          <section className="estudos-cartao estudos-vazio">
            <span className="estudos-vazio-icone">
              <Icone nome="calendario" tamanho={30} />
            </span>
            <h2>Visita não realizada</h2>
            <p>
              Só é possível registrar resultados em visita realizada. Esta visita está como{' '}
              {NOMES_SITUACAO_VISITA[dados.visita.situacao].toLowerCase()}.
            </p>
            <Link className="botao botao-secundario" to={caminhoHistorico}>
              Voltar ao histórico
            </Link>
          </section>
        )}

        {dados && realizada && (
          <form className="resultados-formulario" onSubmit={enviar} noValidate>
            {/* Aviso fixo do RF14: os resultados não são dados reais de saúde */}
            <p className="aviso aviso-alerta resultados-ficticios">
              <Icone nome="alerta" />
              Dados fictícios: não registre informações reais de saúde dos participantes.
            </p>

            {encerrado && (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                Estudo encerrado: os resultados podem ser consultados, mas não alterados.
              </p>
            )}

            {erroGeral && (
              <p className="aviso aviso-erro" role="alert">
                <Icone nome="alerta" />
                {erroGeral}
              </p>
            )}

            <section className="estudos-cartao resultados-cartao" aria-labelledby="titulo-atividades">
              <header>
                <h2 id="titulo-atividades">Avaliações previstas</h2>
                <p>
                  Um resultado por atividade, com até {LIMITE_RESULTADO.toLocaleString('pt-BR')} caracteres. Pode
                  salvar só uma parte e completar depois.
                </p>
              </header>

              {dados.atividades.length === 0 ? (
                <p className="campo-ajuda">A visita prevista não tem atividades cadastradas no protocolo.</p>
              ) : (
                dados.atividades.map((atividade) => {
                  const salvo = dados.resultados.find((r) => r.atividadePrevistaId === atividade.id);
                  const texto = valores[atividade.id] ?? '';
                  const erro = erros[atividade.id];
                  const idCampo = `resultado-${atividade.id}`;
                  return (
                    <div className="campo" key={atividade.id}>
                      <label htmlFor={idCampo}>{atividade.descricao}</label>
                      <textarea
                        id={idCampo}
                        className="entrada"
                        value={texto}
                        disabled={!editavel || enviando}
                        aria-invalid={Boolean(erro)}
                        aria-describedby={erro ? `erro-${idCampo}` : `ajuda-${idCampo}`}
                        onChange={(e) => alterar(atividade.id, e.target.value)}
                        placeholder="Ex.: resultado fictício da avaliação."
                      />
                      <span className="campo-rodape">
                        {erro ? (
                          <span id={`erro-${idCampo}`} className="campo-erro">
                            {erro}
                          </span>
                        ) : (
                          <span id={`ajuda-${idCampo}`} className="campo-ajuda">
                            {salvo
                              ? `Registrado por ${nomeResponsavel(salvo.registradoPorId)} em ${formatarDataHora(salvo.registradoEm)}${
                                  salvo.atualizadoEm ? `; editado em ${formatarDataHora(salvo.atualizadoEm)}` : ''
                                }.`
                              : 'Ainda sem resultado.'}
                          </span>
                        )}
                        <span className="campo-contador">
                          {texto.trim().length}/{LIMITE_RESULTADO}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </section>

            {semAlteracoes && (
              <p className="aviso aviso-informacao" role="status">
                <Icone nome="info" />
                Nenhuma alteração para salvar.
              </p>
            )}

            <div className="estudos-acoes">
              <Link className="botao botao-secundario" to={caminhoHistorico}>
                {editavel ? 'Cancelar' : 'Voltar ao histórico'}
              </Link>
              {editavel && (
                <button type="submit" className="botao botao-primario" disabled={enviando}>
                  <Icone nome="sucesso" />
                  {enviando ? 'Salvando…' : 'Salvar resultados'}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
