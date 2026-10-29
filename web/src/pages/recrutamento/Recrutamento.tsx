import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { servicoCandidatos, type Candidato, type ServicoCandidatos } from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import { formatarData, formatarPeriodo, NOMES_ESTADO } from '../estudos/formatacao';
import type { AvisoCadastro } from '../estudos/ListaEstudos';
import { NOMES_CONSENTIMENTO, NOMES_ELEGIBILIDADE, proximaEtapa } from './formatacao';
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
  | { tipo: 'pronto'; estudo: Estudo; candidatos: Candidato[] };

const DURACAO_NOTIFICACAO_MS = 6000;

// As telas de avaliação (3390) e de consentimento e inclusão (3391) ainda não existem
const AVISO_ETAPA = 'Disponível nas próximas entregas da Sprint 2.';

function textoContagem(quantidade: number): string {
  return quantidade === 1 ? 'Mostrando 1 candidato' : `Mostrando ${quantidade} candidatos`;
}

/**
 * Busca o estudo entre os que a sessão pode ver: o backend já filtra a lista
 * (coordenador só recebe os vinculados a ele), então fora dela é "não encontrado".
 */
async function carregar(estudoId: number, estudos: ServicoEstudos, candidatos: ServicoCandidatos) {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  return { estudo, candidatos: await candidatos.listar(estudoId) };
}

// <-------------------RECRUTAMENTO DO ESTUDO------------------->
// Coordenador: candidatos do estudo vinculado e as etapas do RF08 ao RF11
export default function Recrutamento({
  servicoEstudos: estudosProp = servicoEstudos,
  servicoCandidatos: candidatosProp = servicoCandidatos,
  usuario: usuarioProp,
}: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const { id } = useParams();
  const estudoId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');

  // Notificação do cadastro; limpa do histórico para não reaparecer ao recarregar
  const [cadastro] = useState<AvisoCadastro | undefined>(() => location.state ?? undefined);
  const [notificacaoVisivel, setNotificacaoVisivel] = useState(Boolean(cadastro));
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
  useEffect(() => {
    if (!notificacaoVisivel) return;
    const temporizador = setTimeout(() => setNotificacaoVisivel(false), DURACAO_NOTIFICACAO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacaoVisivel]);

  useEffect(() => {
    let ativo = true;
    carregar(estudoId, estudosProp, candidatosProp)
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
        const mensagem =
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar os candidatos.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudoId, estudosProp, candidatosProp, tentativa]);

  const filtrados = useMemo(() => {
    if (tela.tipo !== 'pronto') return [];
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return tela.candidatos;
    return tela.candidatos.filter((c) =>
      `${c.nome} ${c.email}`.toLocaleLowerCase('pt-BR').includes(termo),
    );
  }, [tela, busca]);

  const tentarNovamente = () => {
    setTela({ tipo: 'carregando' });
    setTentativa((n) => n + 1);
  };

  const trilha = (atual: string) => (
    <nav className="estudos-trilha" aria-label="Trilha de navegação">
      <Link to="/">Início</Link>
      <Icone nome="setaDireita" tamanho={14} />
      <Link to="/estudos">Estudos</Link>
      <Icone nome="setaDireita" tamanho={14} />
      <span aria-current="page">{atual}</span>
    </nav>
  );

  if (tela.tipo === 'nao-encontrado') {
    return (
      <div className="pagina-interna estudos-pagina">
        <BarraNavegacao usuario={usuario} />
        <main className="estudos-conteudo">
          {trilha('Recrutamento')}
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
        </main>
      </div>
    );
  }

  const estudo = tela.tipo === 'pronto' ? tela.estudo : undefined;
  // RF08 a RF11 só valem com o estudo em Recrutamento (matriz de permissões)
  const podeRecrutar = estudo?.estado === 'RECRUTAMENTO';
  const caminhoNovo = `/estudos/${estudoId}/candidatos/novo`;

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      {notificacaoVisivel && cadastro && (
        <p className="notificacao" role="status">
          <Icone nome="sucesso" />
          {cadastro.aviso}
        </p>
      )}

      <main className="estudos-conteudo">
        {trilha(estudo?.titulo ?? 'Recrutamento')}

        {tela.tipo === 'carregando' && (
          <p className="estudos-cartao estudos-carregando">Carregando candidatos…</p>
        )}

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
                  <span>Responsável: {estudo.responsavelNome ?? `Pesquisador nº ${estudo.responsavelId}`}</span>
                  <span className="estudos-periodo">
                    <Icone nome="calendario" tamanho={16} />
                    {formatarPeriodo(estudo.dataInicio, estudo.dataFim)}
                  </span>
                  <span>{estudo.limiteParticipantes} vagas</span>
                </p>
              </div>
              {podeRecrutar && tela.candidatos.length > 0 && (
                <Link className="botao botao-primario" to={caminhoNovo}>
                  <Icone nome="usuarioMais" />
                  Novo candidato
                </Link>
              )}
            </header>

            {!podeRecrutar && (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                O cadastro e a avaliação de candidatos só ficam disponíveis com o estudo em Recrutamento.
              </p>
            )}

            <Indicadores estudo={estudo} candidatos={tela.candidatos} />

            {tela.candidatos.length === 0 ? (
              <section className="estudos-cartao estudos-vazio">
                <span className="estudos-vazio-icone">
                  <Icone nome="usuarios" tamanho={30} />
                </span>
                <h2>Nenhum candidato cadastrado</h2>
                <p>Cadastre o primeiro candidato para começar o recrutamento deste estudo.</p>
                {podeRecrutar && (
                  <Link className="botao botao-primario" to={caminhoNovo}>
                    <Icone nome="usuarioMais" />
                    Cadastrar candidato
                  </Link>
                )}
              </section>
            ) : (
              <section className="estudos-cartao recrutamento-tabela-cartao" aria-label="Lista de candidatos">
                <div className="estudos-filtros recrutamento-filtros">
                  <div className="entrada-com-icone estudos-busca">
                    <Icone nome="busca" />
                    <input
                      type="search"
                      aria-label="Buscar por nome ou e-mail"
                      placeholder="Buscar por nome ou e-mail"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                </div>

                {filtrados.length === 0 ? (
                  <p className="estudos-sem-resultado">Nenhum candidato encontrado com essa busca.</p>
                ) : (
                  <>
                    <table className="estudos-tabela recrutamento-tabela">
                      <thead>
                        <tr>
                          <th scope="col">Candidato</th>
                          <th scope="col">Elegibilidade</th>
                          <th scope="col">Consentimento</th>
                          <th scope="col">Situação</th>
                          <th scope="col">Próxima etapa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((candidato) => (
                          <LinhaCandidato
                            key={candidato.id}
                            candidato={candidato}
                            nova={candidato.id === cadastro?.novoId}
                            podeRecrutar={podeRecrutar}
                          />
                        ))}
                      </tbody>
                    </table>
                    <p className="estudos-rodape">{textoContagem(filtrados.length)}</p>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// <-------------------INDICADORES------------------->
function Indicadores({ estudo, candidatos }: { estudo: Estudo; candidatos: Candidato[] }) {
  const elegiveis = candidatos.filter((c) => c.elegibilidade === 'ELEGIVEL').length;
  const incluidos = candidatos.filter((c) => c.dataInclusao).length;
  // Participantes que saíram não liberam vaga: a conta usa todas as inclusões (regra do RF11)
  const vagas = Math.max(0, estudo.limiteParticipantes - incluidos);

  const itens = [
    { rotulo: 'Candidatos', valor: String(candidatos.length) },
    { rotulo: 'Elegíveis', valor: String(elegiveis) },
    { rotulo: 'Incluídos', valor: `${incluidos} de ${estudo.limiteParticipantes}` },
    { rotulo: 'Vagas restantes', valor: String(vagas) },
  ];

  return (
    <ul className="recrutamento-indicadores" aria-label="Resumo do recrutamento">
      {itens.map((item) => (
        <li key={item.rotulo} className="estudos-cartao recrutamento-indicador">
          <span className="recrutamento-indicador-rotulo">{item.rotulo}</span>
          <span className="recrutamento-indicador-valor">{item.valor}</span>
        </li>
      ))}
    </ul>
  );
}

// <-------------------LINHA DA TABELA------------------->
type PropsLinha = { candidato: Candidato; nova: boolean; podeRecrutar: boolean };

function LinhaCandidato({ candidato, nova, podeRecrutar }: PropsLinha) {
  const etapa = proximaEtapa(candidato);
  const incluido = Boolean(candidato.dataInclusao);

  return (
    <tr className={nova ? 'estudos-linha-nova' : undefined}>
      <td>
        <span className="estudos-titulo">{candidato.nome}</span>
        <span className="estudos-objetivo">{candidato.email}</span>
      </td>
      <td>
        <span className={`etiqueta etiqueta-${candidato.elegibilidade.toLowerCase()}`}>
          {NOMES_ELEGIBILIDADE[candidato.elegibilidade]}
        </span>
      </td>
      <td>
        <span className={`etiqueta etiqueta-${candidato.consentimento.toLowerCase()}`}>
          {NOMES_CONSENTIMENTO[candidato.consentimento]}
        </span>
      </td>
      <td>
        <span className={`etiqueta ${incluido ? 'etiqueta-incluido' : 'etiqueta-candidato'}`}>
          {incluido ? 'Incluído' : 'Candidato'}
        </span>
      </td>
      <td>
        {candidato.dataInclusao ? (
          <span className="recrutamento-incluido">
            <Icone nome="sucesso" tamanho={16} />
            Incluído em {formatarData(candidato.dataInclusao)}
          </span>
        ) : (
          etapa &&
          podeRecrutar && (
            <button
              type="button"
              className={`botao recrutamento-etapa ${etapa.principal ? 'botao-primario' : 'botao-secundario'}`}
              disabled
              title={AVISO_ETAPA}
            >
              {etapa.texto}
            </button>
          )
        )}
      </td>
    </tr>
  );
}
