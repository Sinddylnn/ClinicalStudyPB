import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { UsuarioSessao } from '../../api/autenticacao';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import { servicoPainel, type PainelEstudo, type ServicoPainel } from '../../api/painel';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone, { type NomeIcone } from '../../components/icones';
import { NOMES_ESTADO, formatarPeriodo } from '../estudos/formatacao';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './painel.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoPainel?: ServicoPainel;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type EstadoEstudos =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; estudos: Estudo[] };

// Cada resposta guarda o estudo consultado: ao trocar de estudo, a resposta anterior não é exibida
type EstadoPainel =
  | { tipo: 'carregando'; estudoId?: number }
  | { tipo: 'erro'; estudoId: number; mensagem: string }
  | { tipo: 'nao-encontrado'; estudoId: number }
  | { tipo: 'pronto'; estudoId: number; painel: PainelEstudo };

type Indicador = {
  rotulo: string;
  valor: number;
  detalhe: string;
  icone: NomeIcone;
  destaque?: boolean;
};

const formatarNumero = (valor: number) => valor.toLocaleString('pt-BR');

const textoVagas = (incluidos: number, limite: number) =>
  `${formatarNumero(incluidos)} de ${formatarNumero(limite)} ${limite === 1 ? 'vaga' : 'vagas'} preenchidas`;

// <-------------------INDICADORES DO RECRUTAMENTO E DAS VISITAS------------------->
// Regras de contagem do Kickoff (seção 8.5): incluídos é o total histórico; pendente é só AGENDADA
function indicadoresRecrutamento(painel: PainelEstudo, estudo: Estudo): Indicador[] {
  return [
    {
      rotulo: 'Candidatos cadastrados',
      valor: painel.candidatosCadastrados,
      detalhe: 'Registrados no recrutamento',
      icone: 'usuarioMais',
    },
    {
      rotulo: 'Participantes incluídos',
      valor: painel.participantesIncluidos,
      detalhe: textoVagas(painel.participantesIncluidos, estudo.limiteParticipantes),
      icone: 'usuarios',
      destaque: true,
    },
    {
      rotulo: 'Ativos',
      valor: painel.participantesAtivos,
      detalhe: 'Seguem no estudo',
      icone: 'usuarioCheck',
    },
    {
      rotulo: 'Retirados',
      valor: painel.participantesRetirados,
      detalhe: 'Saíram do estudo',
      icone: 'usuarioX',
    },
  ];
}

function indicadoresVisitas(painel: PainelEstudo): Indicador[] {
  return [
    {
      rotulo: 'Visitas realizadas',
      valor: painel.visitasRealizadas,
      detalhe: 'Registradas como realizadas',
      icone: 'sucesso',
      destaque: true,
    },
    {
      rotulo: 'Visitas pendentes',
      valor: painel.visitasPendentes,
      detalhe: 'Agendadas, inclusive com a data já passada',
      icone: 'relogio',
    },
  ];
}

function ListaIndicadores({ titulo, indicadores }: { titulo: string; indicadores: Indicador[] }) {
  const idTitulo = `painel-${titulo.toLowerCase()}`;
  return (
    <section className="estudos-cartao painel-grupo" aria-labelledby={idTitulo}>
      <h2 id={idTitulo}>{titulo}</h2>
      <ul className="painel-indicadores">
        {indicadores.map((indicador) => (
          <li
            key={indicador.rotulo}
            className={`painel-indicador ${indicador.destaque ? 'painel-indicador-destaque' : ''}`}
          >
            <span className="painel-indicador-icone">
              <Icone nome={indicador.icone} tamanho={20} />
            </span>
            <span className="painel-indicador-texto">
              <span className="painel-indicador-rotulo">{indicador.rotulo}</span>
              <strong className="painel-indicador-valor">{formatarNumero(indicador.valor)}</strong>
              <span className="painel-indicador-detalhe">{indicador.detalhe}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// <-------------------PAINEL DE INDICADORES (RF21)------------------->
// O pesquisador responsável e o coordenador vinculado escolhem um dos estudos da própria lista e veem
// as contagens do recrutamento e das visitas. O estudo escolhido fica no endereço (?estudo=ID)
export default function PainelIndicadores({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoPainel: painelProp = servicoPainel,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const [parametros, setParametros] = useSearchParams();
  const [estudos, setEstudos] = useState<EstadoEstudos>({ tipo: 'carregando' });
  const [tentativaEstudos, setTentativaEstudos] = useState(0);
  const [painel, setPainel] = useState<EstadoPainel>({ tipo: 'carregando' });
  const [tentativaPainel, setTentativaPainel] = useState(0);

  // A lista vem filtrada pelo backend: pesquisador vê os próprios estudos, coordenador os vinculados (D02)
  useEffect(() => {
    let ativo = true;
    estudosProp
      .listar()
      .then((lista) => {
        if (ativo) setEstudos({ tipo: 'pronto', estudos: lista });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar os estudos.';
        setEstudos({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, tentativaEstudos]);

  const lista = estudos.tipo === 'pronto' ? estudos.estudos : [];
  const parametro = parametros.get('estudo');
  // Sem estudo no endereço, abre o primeiro da lista; um estudo fora da lista é "não encontrado"
  const estudo = parametro === null ? lista[0] : lista.find((e) => String(e.id) === parametro);
  const estudoId = estudo?.id;

  useEffect(() => {
    if (estudoId === undefined) return;
    let ativo = true;
    painelProp
      .consultar(estudoId)
      .then((dados) => {
        if (ativo) setPainel({ tipo: 'pronto', estudoId, painel: dados });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setPainel({ tipo: 'nao-encontrado', estudoId });
          return;
        }
        const mensagem =
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar os indicadores.';
        setPainel({ tipo: 'erro', estudoId, mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [painelProp, estudoId, tentativaPainel]);

  // Enquanto a resposta do estudo escolhido não chega, a tela mostra "Carregando"
  const painelAtual: EstadoPainel = painel.estudoId === estudoId ? painel : { tipo: 'carregando' };

  const consultarDeNovo = () => {
    setPainel({ tipo: 'carregando', estudoId });
    setTentativaPainel((n) => n + 1);
  };

  const escolherEstudo = (id: string) => setParametros({ estudo: id }, { replace: true });

  const estudoNaoEncontrado =
    (estudos.tipo === 'pronto' && lista.length > 0 && !estudo) || painelAtual.tipo === 'nao-encontrado';

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="estudos-conteudo">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Painel</span>
        </nav>

        <header className="estudos-cabecalho">
          <div>
            <h1>Painel de indicadores</h1>
            <p className="estudos-subtitulo">Recrutamento e visitas de um estudo</p>
          </div>
          {painelAtual.tipo === 'pronto' && (
            <button type="button" className="botao botao-secundario" onClick={consultarDeNovo}>
              Atualizar
            </button>
          )}
        </header>

        {estudos.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando estudos…</p>}

        {estudos.tipo === 'erro' && (
          <div className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            <span className="aviso-texto">{estudos.mensagem}</span>
            <button
              type="button"
              className="botao botao-secundario"
              onClick={() => {
                setEstudos({ tipo: 'carregando' });
                setTentativaEstudos((n) => n + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {estudos.tipo === 'pronto' && lista.length === 0 && (
          <section className="estudos-cartao estudos-vazio">
            <span className="estudos-vazio-icone">
              <Icone nome="atividade" tamanho={30} />
            </span>
            <h2>Nenhum estudo disponível</h2>
            <p>
              {usuario.perfil === 'PESQUISADOR'
                ? 'Cadastre um estudo para acompanhar os indicadores.'
                : 'Os indicadores aparecem quando um estudo for vinculado a você.'}
            </p>
          </section>
        )}

        {estudos.tipo === 'pronto' && lista.length > 0 && (
          <section className="estudos-cartao painel-selecao" aria-label="Escolha do estudo">
            <div className="campo painel-campo-estudo">
              <label htmlFor="painel-estudo">Estudo</label>
              <div className="entrada-selecao">
                <select id="painel-estudo" value={estudo?.id ?? ''} onChange={(e) => escolherEstudo(e.target.value)}>
                  {!estudo && (
                    <option value="" disabled>
                      Escolha um estudo
                    </option>
                  )}
                  {lista.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.titulo}
                    </option>
                  ))}
                </select>
                <Icone nome="setaBaixo" />
              </div>
            </div>
            {estudo && (
              <p className="painel-estudo-dados">
                <span className={`etiqueta etiqueta-${estudo.estado.toLowerCase()}`}>{NOMES_ESTADO[estudo.estado]}</span>
                <span>
                  <Icone nome="calendario" tamanho={16} />
                  {formatarPeriodo(estudo.dataInicio, estudo.dataFim)}
                </span>
              </p>
            )}
          </section>
        )}

        {estudoNaoEncontrado && (
          <section className="estudos-cartao estudos-vazio">
            <span className="estudos-vazio-icone">
              <Icone nome="frasco" tamanho={30} />
            </span>
            <h2>Estudo não encontrado</h2>
            <p>O estudo não existe ou não está vinculado a você. Escolha outro estudo na lista.</p>
          </section>
        )}

        {estudo && painelAtual.tipo === 'carregando' && (
          <p className="estudos-cartao estudos-carregando">Carregando indicadores…</p>
        )}

        {estudo && painelAtual.tipo === 'erro' && (
          <div className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            <span className="aviso-texto">{painelAtual.mensagem}</span>
            <button type="button" className="botao botao-secundario" onClick={consultarDeNovo}>
              Tentar novamente
            </button>
          </div>
        )}

        {estudo && painelAtual.tipo === 'pronto' && (
          <>
            <ListaIndicadores titulo="Recrutamento" indicadores={indicadoresRecrutamento(painelAtual.painel, estudo)} />
            <ListaIndicadores titulo="Visitas" indicadores={indicadoresVisitas(painelAtual.painel)} />
            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              Participantes incluídos conta todas as inclusões, inclusive de quem foi retirado depois. Ausências e
              cancelamentos não entram nas visitas pendentes.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
