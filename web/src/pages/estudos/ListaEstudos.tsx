import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type EstadoEstudo, type Estudo, type ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import Avatar from '../../components/Avatar';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import { formatarPeriodo, NOMES_ESTADO } from './formatacao';
import '../../estilos/comum.css';
import './estudos.css';

type Props = {
  servico?: ServicoEstudos;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; estudos: Estudo[] };

/** Enviado pelo cadastro ao voltar para a lista. */
export type AvisoCadastro = { aviso: string; novoId: number };

const ESTADOS = Object.keys(NOMES_ESTADO) as EstadoEstudo[];

// As inclusões de participantes chegam na Sprint 2 (RF11); até lá todo estudo tem 0 incluídos
const INCLUIDOS = 0;

const DURACAO_NOTIFICACAO_MS = 6000;

function textoContagem(quantidade: number): string {
  if (quantidade === 1) return 'Mostrando 1 de 1 estudo';
  return `Mostrando 1–${quantidade} de ${quantidade} estudos`;
}

// <-------------------LISTA DE ESTUDOS------------------->
// Pesquisador: "Meus estudos", com cadastro. Coordenador: estudos vinculados a ele (D02), com acesso ao recrutamento.
export default function ListaEstudos({ servico = servicoEstudos, usuario: usuarioProp }: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const location = useLocation();
  const navigate = useNavigate();
  const [tela, setTela] = useState<EstadoTela>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoEstudo | ''>('');

  const pesquisador = usuario.perfil === 'PESQUISADOR';
  const titulo = pesquisador ? 'Meus estudos' : 'Estudos';

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
    servico
      .listar()
      .then((estudos) => ativo && setTela({ tipo: 'pronto', estudos }))
      .catch((erro: unknown) => {
        const mensagem =
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar os estudos.';
        if (ativo) setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [servico, tentativa]);

  const filtrados = useMemo(() => {
    if (tela.tipo !== 'pronto') return [];
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const contem = (texto?: string) => Boolean(texto?.toLocaleLowerCase('pt-BR').includes(termo));
    return tela.estudos.filter(
      (estudo) =>
        // O coordenador também busca pelo responsável ("Buscar por título ou responsável")
        (!termo || contem(estudo.titulo) || (!pesquisador && contem(estudo.responsavelNome))) &&
        (!filtroEstado || estudo.estado === filtroEstado),
    );
  }, [tela, busca, filtroEstado, pesquisador]);

  const tentarNovamente = () => {
    setTela({ tipo: 'carregando' });
    setTentativa((n) => n + 1);
  };

  const etiqueta = (estado: EstadoEstudo) => (
    <span className={`etiqueta etiqueta-${estado.toLowerCase()}`}>{NOMES_ESTADO[estado]}</span>
  );

  const periodo = (estudo: Estudo) => (
    <span className="estudos-periodo">
      <Icone nome="calendario" tamanho={16} />
      {formatarPeriodo(estudo.dataInicio, estudo.dataFim)}
    </span>
  );

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
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">{titulo}</span>
        </nav>

        <header className="estudos-cabecalho">
          <div>
            <h1>{titulo}</h1>
            <p className="estudos-subtitulo">
              {pesquisador
                ? 'Estudos sob sua responsabilidade.'
                : 'Estudos vinculados a você como coordenador.'}
            </p>
          </div>
          {pesquisador && (
            <Link className="botao botao-primario" to="/estudos/novo">
              <Icone nome="mais" />
              Novo estudo
            </Link>
          )}
        </header>

        {tela.tipo === 'carregando' && (
          <p className="estudos-cartao estudos-carregando">Carregando estudos…</p>
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

        {tela.tipo === 'pronto' && tela.estudos.length === 0 && (
          <section className="estudos-cartao estudos-vazio">
            <span className="estudos-vazio-icone">
              <Icone nome="frasco" tamanho={30} />
            </span>
            <h2>{pesquisador ? 'Nenhum estudo cadastrado ainda' : 'Nenhum estudo vinculado a você'}</h2>
            <p>
              {pesquisador
                ? 'Cadastre seu primeiro estudo informando título, objetivo, período previsto e limite de participantes. Ele começa no estado Planejamento.'
                : 'Quando um pesquisador atribuir você como coordenador de um estudo, ele aparecerá aqui.'}
            </p>
            {pesquisador && (
              <Link className="botao botao-primario" to="/estudos/novo">
                <Icone nome="mais" />
                Cadastrar primeiro estudo
              </Link>
            )}
          </section>
        )}

        {tela.tipo === 'pronto' && tela.estudos.length > 0 && (
          <section
            className={`estudos-cartao estudos-tabela-cartao ${pesquisador ? '' : 'estudos-leitura'}`}
            aria-label="Lista de estudos"
          >
            <div className="estudos-filtros">
              <div className="entrada-com-icone estudos-busca">
                <Icone nome="busca" />
                <input
                  type="search"
                  aria-label={pesquisador ? 'Buscar por título' : 'Buscar por título ou responsável'}
                  placeholder={pesquisador ? 'Buscar por título' : 'Buscar por título ou responsável'}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              {pesquisador && (
                <div className="entrada-selecao estudos-filtro-estado">
                  <select
                    aria-label="Filtrar por estado"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as EstadoEstudo | '')}
                  >
                    <option value="">Todos os estados</option>
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {NOMES_ESTADO[estado]}
                      </option>
                    ))}
                  </select>
                  <Icone nome="setaBaixo" />
                </div>
              )}
            </div>

            {filtrados.length === 0 ? (
              <p className="estudos-sem-resultado">Nenhum estudo encontrado com esses filtros.</p>
            ) : (
              <>
                <table className="estudos-tabela">
                  <thead>
                    {pesquisador ? (
                      <tr>
                        <th scope="col">Estudo</th>
                        <th scope="col">Período previsto</th>
                        <th scope="col">Participantes</th>
                        <th scope="col">Estado</th>
                      </tr>
                    ) : (
                      <tr>
                        <th scope="col">Estudo</th>
                        <th scope="col">Responsável</th>
                        <th scope="col">Período previsto</th>
                        <th scope="col">Limite</th>
                        <th scope="col">Estado</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {filtrados.map((estudo) => (
                      <tr
                        key={estudo.id}
                        className={estudo.id === cadastro?.novoId ? 'estudos-linha-nova' : undefined}
                      >
                        <td>
                          {pesquisador ? (
                            <span className="estudos-titulo">{estudo.titulo}</span>
                          ) : (
                            // O coordenador abre o recrutamento do estudo (RF08 a RF11)
                            <Link
                              className="estudos-titulo estudos-titulo-link"
                              to={`/estudos/${estudo.id}/recrutamento`}
                            >
                              {estudo.titulo}
                            </Link>
                          )}
                          <span className="estudos-objetivo">{estudo.objetivo}</span>
                        </td>
                        {!pesquisador && (
                          <td>
                            <span className="estudos-pessoa">
                              {/* Sem o nome não há iniciais: o avatar só aparece quando a API envia responsavelNome */}
                              {estudo.responsavelNome && (
                                <Avatar nome={estudo.responsavelNome} perfil="PESQUISADOR" />
                              )}
                              {estudo.responsavelNome ?? `Pesquisador nº ${estudo.responsavelId}`}
                            </span>
                          </td>
                        )}
                        <td>{periodo(estudo)}</td>
                        {pesquisador ? (
                          <td>
                            <span className="estudos-participantes">
                              {INCLUIDOS} de {estudo.limiteParticipantes} incluídos
                            </span>
                            <span className="estudos-barra" aria-hidden="true">
                              <span
                                style={{
                                  width: `${(INCLUIDOS / estudo.limiteParticipantes) * 100}%`,
                                }}
                              />
                            </span>
                          </td>
                        ) : (
                          <td className="estudos-limite">{estudo.limiteParticipantes} vagas</td>
                        )}
                        <td>{etiqueta(estudo.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="estudos-rodape">{textoContagem(filtrados.length)}</p>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
