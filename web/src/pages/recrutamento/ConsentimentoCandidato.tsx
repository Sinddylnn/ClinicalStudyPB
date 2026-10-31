import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  servicoCandidatos,
  type RegistroConsentimento,
  type RespostaConsentimento,
  type ServicoCandidatos,
} from '../../api/candidatos';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type Estudo, type ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone, { type NomeIcone } from '../../components/icones';
import type { AvisoCadastro } from '../estudos/ListaEstudos';
import { formatarDataHora, NOMES_CONSENTIMENTO } from './formatacao';
import { LIMITE_OBSERVACAO, validarConsentimento, type CampoConsentimento } from './validacao';
import '../../estilos/comum.css';
import '../estudos/estudos.css';
import './recrutamento.css';

type Props = {
  servicoEstudos?: ServicoEstudos;
  servicoCandidatos?: ServicoCandidatos;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type Erros = Partial<Record<CampoConsentimento, string>>;

type EstadoTela =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'nao-encontrado' }
  | { tipo: 'pronto'; estudo: Estudo; registro: RegistroConsentimento };

// Textos do quadro "Coordenador / Consentimento – ..." do protótipo
const MENSAGEM_RESPOSTA = 'Escolha a resposta do candidato antes de registrar.';
const MENSAGEM_CAMPOS = 'Revise os campos destacados antes de registrar.';

const OPCOES: { resposta: RespostaConsentimento; descricao: string; icone: NomeIcone; classe: string }[] = [
  {
    resposta: 'ACEITOU',
    descricao: 'O candidato concordou em participar do estudo.',
    icone: 'sucesso',
    classe: 'consentimento-icone-ok',
  },
  {
    resposta: 'RECUSOU',
    descricao: 'O candidato não concordou. A inclusão fica bloqueada.',
    icone: 'fechar',
    classe: 'consentimento-icone-perigo',
  },
];

/** Fora da lista da sessão é "não encontrado", sem nem pedir o registro (como nas outras telas). */
async function carregar(estudoId: number, candidatoId: number, estudos: ServicoEstudos, candidatos: ServicoCandidatos) {
  const estudo = (await estudos.listar()).find((e) => e.id === estudoId);
  if (!estudo) return null;
  return { estudo, registro: await candidatos.obterConsentimento(estudoId, candidatoId) };
}

// Motivo de a tela ficar só para consulta; null quando pode registrar
function motivoBloqueio(estudo: Estudo, { candidato }: RegistroConsentimento): string | null {
  if (candidato.dataInclusao) return 'O candidato já foi incluído: o consentimento não pode mais ser corrigido.';
  if (estudo.estado !== 'RECRUTAMENTO') return 'Só é possível registrar o consentimento com o estudo em Recrutamento.';
  if (candidato.elegibilidade === 'NAO_AVALIADO') {
    return 'Avalie a elegibilidade do candidato antes de registrar o consentimento.';
  }
  return null;
}

// <-------------------CONSENTIMENTO SIMULADO------------------->
// RF10: o coordenador registra a resposta do candidato, sem termo anexado nem assinatura.
// Pode ser corrigida até a inclusão; data, hora e coordenador vêm do backend
export default function ConsentimentoCandidato({
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
  const [resposta, setResposta] = useState<RespostaConsentimento | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
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
        const { consentimento } = dados.registro.candidato;
        setResposta(consentimento === 'PENDENTE' ? null : consentimento);
        setObservacao(dados.registro.observacao ?? '');
        setTela({ tipo: 'pronto', ...dados });
      })
      .catch((erro: unknown) => {
        if (!ativo) return;
        if (erro instanceof ErroRequisicao && erro.status === 404) {
          setTela({ tipo: 'nao-encontrado' });
          return;
        }
        const mensagem = erro instanceof ErroRequisicao ? erro.message : 'Não foi possível carregar o consentimento.';
        setTela({ tipo: 'erro', mensagem });
      });
    return () => {
      ativo = false;
    };
  }, [estudosProp, candidatosProp, estudoId, candidatoId, tentativa]);

  const estudo = tela.tipo === 'pronto' ? tela.estudo : undefined;
  const registro = tela.tipo === 'pronto' ? tela.registro : undefined;
  const bloqueio = estudo && registro ? motivoBloqueio(estudo, registro) : null;
  const caminhoLista = `/estudos/${estudoId}/recrutamento`;

  const marcar = (opcao: RespostaConsentimento) => {
    setResposta(opcao);
    setErros((atual) => ({ ...atual, resposta: undefined }));
    setErroGeral(undefined);
  };

  const alterarObservacao = (valor: string) => {
    setObservacao(valor);
    setErros((atual) => ({ ...atual, observacao: undefined }));
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const errosLocais = validarConsentimento({ resposta, observacao });
    if (Object.keys(errosLocais).length > 0 || !resposta) {
      setErros(errosLocais);
      setErroGeral(errosLocais.resposta ? MENSAGEM_RESPOSTA : MENSAGEM_CAMPOS);
      return;
    }

    setEnviando(true);
    try {
      await candidatosProp.registrarConsentimento(estudoId, candidatoId, {
        resposta,
        observacao: observacao.trim() || null,
      });
      const aviso: AvisoCadastro = {
        aviso: `Consentimento registrado: ${NOMES_CONSENTIMENTO[resposta].toLowerCase()}.`,
        novoId: candidatoId,
      };
      navigate(caminhoLista, { state: aviso });
    } catch (erro) {
      setEnviando(false);
      if (erro instanceof ErroRequisicao && erro.codigo === 'VALIDACAO_INVALIDA') {
        setErros({ resposta: erro.errosCampos.resposta, observacao: erro.errosCampos.observacao });
        setErroGeral(MENSAGEM_CAMPOS);
      } else {
        setErroGeral(erro instanceof ErroRequisicao ? erro.message : 'Não foi possível registrar o consentimento.');
      }
    }
  };

  const nomeCandidato = registro?.candidato.nome;
  const desativado = Boolean(bloqueio) || enviando;

  return (
    <div className="pagina-interna estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="estudos-conteudo estudos-conteudo-formulario">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to={caminhoLista}>{estudo?.titulo ?? 'Recrutamento'}</Link>
          <Icone nome="setaDireita" tamanho={14} />
          {nomeCandidato && (
            <>
              <span>{nomeCandidato}</span>
              <Icone nome="setaDireita" tamanho={14} />
            </>
          )}
          <span aria-current="page">Consentimento</span>
        </nav>

        <header className="estudos-cabecalho estudos-cabecalho-formulario">
          <div>
            <h1>Registrar consentimento</h1>
            {registro && (
              <p className="estudos-subtitulo">
                {registro.candidato.nome} • {registro.candidato.email}
              </p>
            )}
          </div>
        </header>

        {tela.tipo === 'carregando' && <p className="estudos-cartao estudos-carregando">Carregando consentimento…</p>}

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
            <h2>Candidato não encontrado</h2>
            <p>O candidato não existe neste estudo ou o estudo não está vinculado a você como coordenador.</p>
            <Link className="botao botao-secundario" to="/estudos">
              Voltar para os estudos
            </Link>
          </section>
        )}

        {registro && (
          <form className="estudos-cartao estudos-formulario" onSubmit={enviar} noValidate>
            {bloqueio && (
              <p className="aviso aviso-informacao">
                <Icone nome="info" />
                {bloqueio}
              </p>
            )}

            {erroGeral && (
              <p className="aviso aviso-erro" role="alert">
                <Icone nome="alerta" />
                {erroGeral}
              </p>
            )}

            <section className="estudos-secao" aria-labelledby="secao-resposta">
              <div className="estudos-secao-texto">
                <h2 id="secao-resposta">Resposta do candidato</h2>
                <p>Consentimento simulado: sem termo anexado nem assinatura. Só a resposta “Aceitou” permite a inclusão.</p>
              </div>
              <div className="estudos-secao-campos">
                <div className="campo">
                  <span id="rotulo-resposta" className="consentimento-rotulo obrigatorio">
                    Resposta
                  </span>
                  <div
                    className="consentimento-opcoes"
                    role="radiogroup"
                    aria-labelledby="rotulo-resposta"
                    aria-required="true"
                    aria-invalid={Boolean(erros.resposta)}
                    aria-describedby={erros.resposta ? 'erro-resposta' : undefined}
                  >
                    {OPCOES.map((opcao) => {
                      const marcada = resposta === opcao.resposta;
                      const nome = NOMES_CONSENTIMENTO[opcao.resposta];
                      return (
                        <label
                          key={opcao.resposta}
                          className={`consentimento-opcao${marcada ? ' consentimento-opcao-marcada' : ''}${
                            erros.resposta ? ' consentimento-opcao-erro' : ''
                          }`}
                        >
                          <input
                            type="radio"
                            name="resposta"
                            value={opcao.resposta}
                            aria-label={nome}
                            aria-describedby={`opcao-${opcao.resposta}`}
                            checked={marcada}
                            disabled={desativado}
                            onChange={() => marcar(opcao.resposta)}
                          />
                          <span className="consentimento-opcao-texto">
                            <span className="consentimento-opcao-titulo">
                              <Icone nome={opcao.icone} tamanho={16} className={opcao.classe} />
                              {nome}
                            </span>
                            <span id={`opcao-${opcao.resposta}`}>{opcao.descricao}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {erros.resposta && (
                    <span className="campo-rodape">
                      <span id="erro-resposta" className="campo-erro">
                        {erros.resposta}
                      </span>
                    </span>
                  )}
                </div>

                <div className="campo">
                  <label htmlFor="consentimento-observacao">Observação</label>
                  <textarea
                    id="consentimento-observacao"
                    aria-invalid={Boolean(erros.observacao)}
                    aria-describedby={erros.observacao ? 'erro-observacao' : 'ajuda-observacao'}
                    value={observacao}
                    disabled={desativado}
                    onChange={(e) => alterarObservacao(e.target.value)}
                    placeholder="Ex.: candidato tirou dúvidas sobre a frequência das visitas."
                  />
                  <span className="campo-rodape">
                    {erros.observacao ? (
                      <span id="erro-observacao" className="campo-erro">
                        {erros.observacao}
                      </span>
                    ) : (
                      <span id="ajuda-observacao" className="campo-ajuda">
                        Opcional, até {LIMITE_OBSERVACAO} caracteres.
                      </span>
                    )}
                    <span className="campo-contador">
                      {observacao.length}/{LIMITE_OBSERVACAO}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <p className="aviso aviso-informacao">
              <Icone nome="info" />
              {registro.registradoPor && registro.registradoEm
                ? `Registrado por ${registro.registradoPor} em ${formatarDataHora(registro.registradoEm)}.${bloqueio ? '' : ' Ao corrigir, a data, a hora e o coordenador são atualizados.'}`
                : 'A data, a hora e o coordenador responsável são registrados automaticamente.'}
            </p>

            <div className="estudos-acoes">
              <Link className="botao botao-secundario" to={caminhoLista}>
                {bloqueio ? 'Voltar ao recrutamento' : 'Cancelar'}
              </Link>
              {!bloqueio && (
                <button type="submit" className="botao botao-primario" disabled={enviando}>
                  <Icone nome="sucesso" />
                  {enviando ? 'Registrando…' : 'Registrar consentimento'}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
