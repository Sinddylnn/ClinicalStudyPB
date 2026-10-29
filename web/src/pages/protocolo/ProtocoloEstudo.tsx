import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import {
  servicoProtocolo,
  type Criterio,
  type Protocolo,
  type ServicoProtocolo,
  type TipoCriterio,
} from '../../api/protocolo';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import DialogoConfirmacao, { type ItemConsequencia } from '../../components/DialogoConfirmacao';
import Icone from '../../components/icones';
import { formatarPeriodo, NOMES_ESTADO } from '../estudos/formatacao';
import { NOMES_TIPO_CRITERIO } from './formatacao';
import ListaCriterios from './ListaCriterios';
import QuadroRecrutamento from './QuadroRecrutamento';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import '../recrutamento/recrutamento.css';
import './protocolo.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoProtocolo?: ServicoProtocolo;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'pronto'; estudo: Estudo; protocolo: Protocolo };

type Remocao = { tipo: TipoCriterio; criterio: Criterio };

const DURACAO_NOTIFICACAO_MS = 6000;

const CONSEQUENCIAS_REMOCAO: ItemConsequencia[] = [
  { texto: 'O critério sai do protocolo do estudo.', tipo: 'perde' },
  { texto: 'Os demais critérios continuam como estão.', tipo: 'mantem' },
];

const LISTAS: Record<TipoCriterio, 'criteriosInclusao' | 'criteriosExclusao'> = {
  INCLUSAO: 'criteriosInclusao',
  EXCLUSAO: 'criteriosExclusao',
};

/**
 * Busca o estudo entre os que a sessão pode ver: o backend já filtra a lista
 * (pesquisador só recebe os próprios), então fora dela é "não encontrado".
 */
async function carregar(estudoId: number, estudos: ServicoEstudos, protocolo: ServicoProtocolo) {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  return { estudo, protocolo: await protocolo.obter(estudoId) };
}

// <-------------------PROTOCOLO DO ESTUDO------------------->
// Pesquisador responsável: dados do estudo e critérios de inclusão e exclusão (RF05).
// Só se edita com o estudo em Planejamento; depois, o protocolo fica para consulta (kickoff 8.1)
export default function ProtocoloEstudo({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoProtocolo: protocoloProp = servicoProtocolo,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id } = useParams();
  const estudoId = Number(id);
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [notificacao, setNotificacao] = useState<string>();
  const [remocao, setRemocao] = useState<Remocao>();
  const [removendo, setRemovendo] = useState(false);
  const [erroRemocao, setErroRemocao] = useState<string>();
  const [salvandoSemExclusao, setSalvandoSemExclusao] = useState(false);
  const [erroSemExclusao, setErroSemExclusao] = useState<string>();

  useEffect(() => {
    if (!notificacao) return;
    const temporizador = setTimeout(() => setNotificacao(undefined), DURACAO_NOTIFICACAO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacao]);

  useEffect(() => {
    let ativo = true;
    carregar(estudoId, estudosProp, protocoloProp)
      .then((dados) => {
        if (!ativo) return;
        setTela(dados ? { tipo: 'pronto', ...dados } : { tipo: 'nao-encontrado' });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar o estudo.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudoId, estudosProp, protocoloProp, tentativa]);

  // Aplica uma alteração ao protocolo já carregado, sem buscar tudo de novo
  const alterarProtocolo = (alterar: (protocolo: Protocolo) => Protocolo) =>
    setTela((atual) => (atual.tipo === 'pronto' ? { ...atual, protocolo: alterar(atual.protocolo) } : atual));

  const adicionar = (tipo: TipoCriterio) => async (descricao: string) => {
    const novo = await protocoloProp.adicionarCriterio(estudoId, { tipo, descricao });
    alterarProtocolo((p) => ({
      ...p,
      [LISTAS[tipo]]: [...p[LISTAS[tipo]], novo],
      // Um critério de exclusão desfaz a indicação de que não há exclusões (mesma regra do backend)
      semCriteriosExclusao: tipo === 'EXCLUSAO' ? false : p.semCriteriosExclusao,
    }));
    setNotificacao('Critério adicionado.');
  };

  const editar = (tipo: TipoCriterio) => async (criterio: Criterio, descricao: string) => {
    const editado = await protocoloProp.editarCriterio(estudoId, criterio.id, descricao);
    alterarProtocolo((p) => ({
      ...p,
      [LISTAS[tipo]]: p[LISTAS[tipo]].map((c) => (c.id === editado.id ? editado : c)),
    }));
    setNotificacao('Critério atualizado.');
  };

  const pedirRemocao = (tipo: TipoCriterio) => (criterio: Criterio) => {
    setErroRemocao(undefined);
    setRemocao({ tipo, criterio });
  };

  const fecharRemocao = useCallback(() => setRemocao(undefined), []);

  const confirmarRemocao = async () => {
    if (!remocao) return;
    const { tipo, criterio } = remocao;
    setRemovendo(true);
    setErroRemocao(undefined);
    try {
      await protocoloProp.removerCriterio(estudoId, criterio.id);
      alterarProtocolo((p) => ({ ...p, [LISTAS[tipo]]: p[LISTAS[tipo]].filter((c) => c.id !== criterio.id) }));
      setRemocao(undefined);
      setNotificacao('Critério removido.');
    } catch (erro) {
      setErroRemocao(erro instanceof ErroRequisicao ? erro.message : 'Não foi possível remover o critério.');
    } finally {
      setRemovendo(false);
    }
  };

  const definirSemExclusao = async (marcado: boolean) => {
    setSalvandoSemExclusao(true);
    setErroSemExclusao(undefined);
    try {
      const protocolo = await protocoloProp.definirSemExclusao(estudoId, marcado);
      alterarProtocolo(() => protocolo);
    } catch (erro) {
      setErroSemExclusao(
        erro instanceof ErroRequisicao ? erro.message : 'Não foi possível salvar a indicação.',
      );
    } finally {
      setSalvandoSemExclusao(false);
    }
  };

  const tentarNovamente = () => {
    setTela({ tipo: 'carregando' });
    setTentativa((n) => n + 1);
  };

  const trilha = (atual: string) => (
    <nav className="estudos-trilha" aria-label="Trilha de navegação">
      <Link to="/">Início</Link>
      <Icone nome="setaDireita" tamanho={14} />
      <Link to="/estudos">Meus estudos</Link>
      <Icone nome="setaDireita" tamanho={14} />
      <span aria-current="page">{atual}</span>
    </nav>
  );

  if (tela.tipo === 'nao-encontrado') {
    return (
      <div className="pagina-interna estudos-pagina">
        <BarraNavegacao usuario={usuario} />
        <main className="estudos-conteudo">
          {trilha('Estudo')}
          <section className="estudos-cartao estudos-vazio">
            <span className="estudos-vazio-icone">
              <Icone nome="frasco" tamanho={30} />
            </span>
            <h2>Estudo não encontrado</h2>
            <p>O estudo não existe ou não está sob sua responsabilidade.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const estudo = tela.tipo === 'pronto' ? tela.estudo : undefined;
  const editavel = estudo?.estado === 'PLANEJAMENTO';

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
        {trilha(estudo?.titulo ?? 'Estudo')}

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando estudo…</p>}

        {tela.tipo === 'erro' && (
          <div className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            <span className="aviso-texto">{tela.mensagem}</span>
            <button type="button" className="botao botao-secundario" onClick={tentarNovamente}>
              Tentar novamente
            </button>
          </div>
        )}

        {tela.tipo === 'pronto' && estudo && (
          <>
            <header className="estudos-cabecalho">
              <div>
                <div className="recrutamento-titulo">
                  <h1>{estudo.titulo}</h1>
                  <span className={`etiqueta etiqueta-${estudo.estado.toLowerCase()}`}>
                    {NOMES_ESTADO[estudo.estado]}
                  </span>
                </div>
                <p className="estudos-subtitulo recrutamento-dados">
                  <span className="estudos-periodo">
                    <Icone nome="calendario" tamanho={16} />
                    {formatarPeriodo(estudo.dataInicio, estudo.dataFim)}
                  </span>
                  <span>Limite de {estudo.limiteParticipantes} participantes</span>
                </p>
              </div>
            </header>

            {!editavel && (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                O protocolo fica só para consulta depois que o recrutamento é aberto: os critérios não podem
                mais ser alterados.
              </p>
            )}

            <div className={`protocolo-grade ${editavel ? '' : 'protocolo-grade-unica'}`}>
              <section className="protocolo-criterios" aria-labelledby="secao-criterios">
                <div className="protocolo-secao-texto">
                  <h2 id="secao-criterios">Critérios de inclusão e exclusão</h2>
                  <p>
                    Os critérios são avaliados pelo coordenador na elegibilidade de cada candidato; o sistema
                    não decide sozinho.
                  </p>
                </div>

                <ListaCriterios
                  tipo="INCLUSAO"
                  criterios={tela.protocolo.criteriosInclusao}
                  editavel={editavel}
                  textoVazio="Nenhum critério de inclusão cadastrado."
                  aoAdicionar={adicionar('INCLUSAO')}
                  aoEditar={editar('INCLUSAO')}
                  aoPedirRemocao={pedirRemocao('INCLUSAO')}
                />

                <ListaCriterios
                  tipo="EXCLUSAO"
                  criterios={tela.protocolo.criteriosExclusao}
                  editavel={editavel}
                  textoVazio={
                    tela.protocolo.semCriteriosExclusao
                      ? 'Este estudo não tem critérios de exclusão.'
                      : 'Nenhum critério de exclusão cadastrado.'
                  }
                  aoAdicionar={adicionar('EXCLUSAO')}
                  aoEditar={editar('EXCLUSAO')}
                  aoPedirRemocao={pedirRemocao('EXCLUSAO')}
                >
                  {editavel && (
                    <OpcaoSemExclusao
                      marcado={tela.protocolo.semCriteriosExclusao}
                      temExclusoes={tela.protocolo.criteriosExclusao.length > 0}
                      salvando={salvandoSemExclusao}
                      erro={erroSemExclusao}
                      aoAlterar={definirSemExclusao}
                    />
                  )}
                </ListaCriterios>
              </section>

              {/* Com o recrutamento aberto, não há o que conferir para abri-lo */}
              {editavel && <QuadroRecrutamento protocolo={tela.protocolo} />}
            </div>
          </>
        )}
      </main>

      {remocao && (
        <DialogoConfirmacao
          titulo={`Remover critério de ${NOMES_TIPO_CRITERIO[remocao.tipo]}?`}
          descricao={`“${remocao.criterio.descricao}”`}
          icone="lixeira"
          tom="perigo"
          consequencias={CONSEQUENCIAS_REMOCAO}
          textoConfirmar="Remover critério"
          erro={erroRemocao}
          enviando={removendo}
          aoConfirmar={confirmarRemocao}
          aoCancelar={fecharRemocao}
        />
      )}
    </div>
  );
}

// <-------------------SEM CRITÉRIOS DE EXCLUSÃO------------------->
type PropsSemExclusao = {
  marcado: boolean;
  temExclusoes: boolean;
  salvando: boolean;
  erro?: string;
  aoAlterar: (marcado: boolean) => void;
};

// O backend recusa a indicação com exclusões cadastradas (EXCLUSAO_JA_DEFINIDA): a opção fica desativada
function OpcaoSemExclusao({ marcado, temExclusoes, salvando, erro, aoAlterar }: PropsSemExclusao) {
  return (
    <div className="protocolo-sem-exclusao">
      <label className="protocolo-opcao">
        <input
          type="checkbox"
          checked={marcado}
          disabled={temExclusoes || salvando}
          aria-describedby={temExclusoes ? 'nota-sem-exclusao' : undefined}
          onChange={(e) => aoAlterar(e.target.checked)}
        />
        Este estudo não tem critérios de exclusão
      </label>
      {temExclusoes && (
        <span id="nota-sem-exclusao" className="campo-ajuda">
          Para marcar esta opção, remova os critérios de exclusão cadastrados.
        </span>
      )}
      {erro && (
        <p className="aviso aviso-erro" role="alert">
          <Icone nome="alerta" />
          {erro}
        </p>
      )}
    </div>
  );
}
