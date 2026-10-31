import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
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
import ResumoEstudo from './ResumoEstudo';
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

// Abas do protótipo; a aberta fica no endereço (?aba=criterios) para sobreviver ao recarregar
type Aba = 'resumo' | 'criterios' | 'visitas';

const ABAS: [Aba, string][] = [
  ['resumo', 'Resumo'],
  ['criterios', 'Critérios'],
  ['visitas', 'Visitas'],
];

function lerAba(valor: string | null): Aba {
  return ABAS.some(([chave]) => chave === valor) ? (valor as Aba) : 'resumo';
}

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
// Pesquisador responsável, em abas como no protótipo: Resumo (dados, coordenador e o que falta
// para iniciar o recrutamento), Critérios de inclusão e exclusão (RF05) e Visitas (T46).
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
  const [parametros, setParametros] = useSearchParams();
  const aba = lerAba(parametros.get('aba'));

  const trocarAba = (nova: Aba) => {
    setParametros(nova === 'resumo' ? {} : { aba: nova }, { replace: true });
    document.getElementById(`aba-${nova}`)?.focus();
  };

  // Setas trocam de aba, como no padrão de abas do WAI-ARIA
  const moverEntreAbas = (evento: KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
    evento.preventDefault();
    const atual = ABAS.findIndex(([chave]) => chave === aba);
    const passo = evento.key === 'ArrowRight' ? 1 : -1;
    trocarAba(ABAS[(atual + passo + ABAS.length) % ABAS.length][0]);
  };

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
    alterarProtocolo((p) => ({ ...p, [LISTAS[tipo]]: [...p[LISTAS[tipo]], novo] }));
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
                <p className="estudos-subtitulo">
                  Responsável: você • {formatarPeriodo(estudo.dataInicio, estudo.dataFim)} •{' '}
                  {estudo.limiteParticipantes} vagas
                </p>
              </div>
              {/* A abertura do recrutamento é da T47; até lá o botão aparece desativado, como no protótipo */}
              {editavel && (
                <button type="button" className="botao botao-secundario protocolo-acao-futura" disabled>
                  <Icone nome="atividade" />
                  Iniciar recrutamento
                </button>
              )}
            </header>

            <div className="protocolo-abas" role="tablist" aria-label="Seções do estudo">
              {ABAS.map(([chave, rotulo]) => (
                <button
                  key={chave}
                  type="button"
                  role="tab"
                  id={`aba-${chave}`}
                  aria-selected={aba === chave}
                  aria-controls={`painel-${chave}`}
                  tabIndex={aba === chave ? 0 : -1}
                  onClick={() => trocarAba(chave)}
                  onKeyDown={moverEntreAbas}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {aba === 'resumo' && (
              <div className="protocolo-painel" role="tabpanel" id="painel-resumo" aria-labelledby="aba-resumo">
                <div className={`protocolo-grade ${editavel ? '' : 'protocolo-grade-unica'}`}>
                  <ResumoEstudo estudo={estudo} nomeResponsavel={usuario.nome} />
                  {/* Com o recrutamento aberto, não há o que conferir para iniciá-lo */}
                  {editavel && <QuadroRecrutamento protocolo={tela.protocolo} coordenadorId={estudo.coordenadorId} />}
                </div>
              </div>
            )}

            {aba === 'visitas' && (
              <div className="protocolo-painel" role="tabpanel" id="painel-visitas" aria-labelledby="aba-visitas">
                <div className="protocolo-secao-texto">
                  <h2>Visitas previstas</h2>
                  <p>Modelos de visita do protocolo. As datas são marcadas depois, para cada participante.</p>
                </div>
                {/* O cadastro das visitas previstas é da T46 */}
                <p className="estudos-cartao protocolo-vazio-cartao">
                  Nenhuma visita cadastrada. O cadastro de visitas previstas chega em breve.
                </p>
              </div>
            )}

            {aba === 'criterios' && (
              <div className="protocolo-painel" role="tabpanel" id="painel-criterios" aria-labelledby="aba-criterios">
                <div className="protocolo-secao-texto">
                  <h2>Critérios de inclusão e exclusão</h2>
                  <p>
                    O coordenador avalia os critérios na elegibilidade de cada candidato; o sistema não decide
                    sozinho.
                  </p>
                </div>

                <p className="aviso aviso-informacao">
                  <Icone nome="info" />
                  {editavel
                    ? 'O protocolo pode ser alterado enquanto o estudo estiver em Planejamento. Depois de iniciar o recrutamento, fica somente para consulta.'
                    : 'O protocolo fica só para consulta depois que o recrutamento é aberto: os critérios não podem mais ser alterados.'}
                </p>

                <div className="protocolo-criterios">
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
                        ? 'Este estudo não possui critérios de exclusão.'
                        : 'Nenhum critério de exclusão cadastrado.'
                    }
                    // Com a declaração marcada, a exclusão seria recusada (SEM_EXCLUSAO_DECLARADA)
                    bloqueioAdicao={
                      tela.protocolo.semCriteriosExclusao
                        ? 'Para cadastrar um critério de exclusão, desmarque a opção abaixo.'
                        : undefined
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
                </div>
              </div>
            )}
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

// Modelagem, seção 3: a declaração com exclusões cadastradas é recusada (EXCLUSAO_JA_DEFINIDA),
// então a opção fica desativada até o pesquisador remover as exclusões
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
        Este estudo não possui critérios de exclusão
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
