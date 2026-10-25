import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErroRequisicao } from '../../api/erros';
import { servicoEstudos, type ServicoEstudos } from '../../api/estudos';
import type { UsuarioSessao } from '../../api/autenticacao';
import { useUsuarioLogado } from '../../autenticacao/contextoAutenticacao';
import BarraNavegacao from '../../components/BarraNavegacao';
import Icone from '../../components/icones';
import type { AvisoCadastro } from './ListaEstudos';
import {
  LIMITES,
  MENSAGEM_PERIODO_INVALIDO,
  validarEstudo,
  type CampoEstudo,
  type DadosEstudo,
} from './validacao';
import './estudos.css';

type Props = {
  servico?: ServicoEstudos;
  /** Quem está na sessão; quando omitido, vem do contexto de autenticação. */
  usuario?: UsuarioSessao;
};

type Erros = Partial<Record<CampoEstudo, string>>;

const VAZIO: DadosEstudo = {
  titulo: '',
  objetivo: '',
  dataInicio: '',
  dataFim: '',
  limiteParticipantes: '',
};

const CAMPOS: CampoEstudo[] = ['titulo', 'objetivo', 'dataInicio', 'dataFim', 'limiteParticipantes'];

// Mesmo texto do backend para VALIDACAO_INVALIDA
const MENSAGEM_CAMPOS = 'Confira os campos informados.';

// Mantém só os erros de campos conhecidos vindos do backend
function errosDoServidor(errosCampos: Record<string, string>): Erros {
  return Object.fromEntries(
    Object.entries(errosCampos).filter(([campo]) => (CAMPOS as string[]).includes(campo)),
  ) as Erros;
}

// <-------------------CADASTRO DE ESTUDO------------------->
export default function NovoEstudo({ servico = servicoEstudos, usuario: usuarioProp }: Props) {
  const usuario = useUsuarioLogado(usuarioProp);
  const navigate = useNavigate();
  const [dados, setDados] = useState<DadosEstudo>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo: CampoEstudo, valor: string) => {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  };

  // Erros por campo vêm com a faixa "Confira os campos informados."
  const mostrarErrosCampos = (novos: Erros) => {
    setErros(novos);
    setErroGeral(MENSAGEM_CAMPOS);
  };

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const { errosCampos, periodoInvalido } = validarEstudo(dados);
    const errosLocais: Erros = periodoInvalido
      ? { ...errosCampos, dataFim: MENSAGEM_PERIODO_INVALIDO }
      : errosCampos;
    if (Object.keys(errosLocais).length > 0) {
      mostrarErrosCampos(errosLocais);
      return;
    }

    setEnviando(true);
    try {
      const criado = await servico.cadastrar({
        titulo: dados.titulo.trim(),
        objetivo: dados.objetivo.trim(),
        dataInicio: dados.dataInicio,
        dataFim: dados.dataFim,
        limiteParticipantes: Number(dados.limiteParticipantes),
      });
      const aviso: AvisoCadastro = { aviso: 'Estudo cadastrado em Planejamento.', novoId: criado.id };
      navigate('/estudos', { state: aviso });
    } catch (erro) {
      setEnviando(false);
      if (erro instanceof ErroRequisicao && erro.codigo === 'VALIDACAO_INVALIDA') {
        const doServidor = errosDoServidor(erro.errosCampos);
        setErros(doServidor);
        setErroGeral(erro.message);
      } else if (erro instanceof ErroRequisicao && erro.codigo === 'DATA_INVALIDA') {
        mostrarErrosCampos({ dataFim: erro.message });
      } else {
        setErroGeral(
          erro instanceof ErroRequisicao ? erro.message : 'Não foi possível cadastrar o estudo.',
        );
      }
    }
  };

  // Liga o campo ao texto de erro, ou à ajuda quando não há erro
  const descricao = (campo: CampoEstudo, temAjuda: boolean) =>
    erros[campo] ? `erro-${campo}` : temAjuda ? `ajuda-${campo}` : undefined;

  // Rodapé do campo: o erro ocupa o lugar da ajuda, como no protótipo
  const rodape = (campo: CampoEstudo, ajuda?: string, limite?: number) => {
    if (!erros[campo] && !ajuda && limite === undefined) return null;
    return (
      <span className="campo-rodape">
        {erros[campo] ? (
          <span id={`erro-${campo}`} className="campo-erro">
            {erros[campo]}
          </span>
        ) : (
          ajuda && (
            <span id={`ajuda-${campo}`} className="campo-ajuda">
              {ajuda}
            </span>
          )
        )}
        {limite !== undefined && (
          <span className="campo-contador">
            {String(dados[campo]).length}/{limite}
          </span>
        )}
      </span>
    );
  };

  const propsCampo = (campo: CampoEstudo, temAjuda: boolean) => ({
    id: `estudo-${campo}`,
    'aria-required': true,
    'aria-invalid': Boolean(erros[campo]),
    'aria-describedby': descricao(campo, temAjuda),
  });

  const rotulo = (campo: CampoEstudo, texto: string) => (
    // O asterisco vem do CSS; "obrigatório" já é anunciado pelo aria-required do campo
    <label className="obrigatorio" htmlFor={`estudo-${campo}`}>
      {texto}
    </label>
  );

  return (
    <div className="estudos-pagina">
      <BarraNavegacao usuario={usuario} />

      <main className="estudos-conteudo estudos-conteudo-formulario">
        <nav className="estudos-trilha" aria-label="Trilha de navegação">
          <Link to="/">Início</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <Link to="/estudos">Meus estudos</Link>
          <Icone nome="setaDireita" tamanho={14} />
          <span aria-current="page">Novo estudo</span>
        </nav>

        <header className="estudos-cabecalho estudos-cabecalho-formulario">
          <div>
            <h1>Novo estudo</h1>
            <p className="estudos-subtitulo">
              O estudo será criado no estado Planejamento, com você como responsável.
            </p>
          </div>
        </header>

        <form className="estudos-cartao estudos-formulario" onSubmit={enviar} noValidate>
          {erroGeral && (
            <p className="aviso aviso-erro" role="alert">
              <Icone nome="alerta" />
              {erroGeral}
            </p>
          )}

          {/* <-------------------IDENTIFICAÇÃO-------------------> */}
          <section className="estudos-secao" aria-labelledby="secao-identificacao">
            <div className="estudos-secao-texto">
              <h2 id="secao-identificacao">Identificação</h2>
              <p>Como o estudo será reconhecido e qual é a sua finalidade. O título não precisa ser único.</p>
            </div>
            <div className="estudos-secao-campos">
              <div className="campo">
                {rotulo('titulo', 'Título')}
                <input
                  {...propsCampo('titulo', true)}
                  className="entrada"
                  value={dados.titulo}
                  onChange={(e) => alterar('titulo', e.target.value)}
                  maxLength={LIMITES.titulo}
                  placeholder="Ex.: Acompanhamento de hábitos"
                />
                {rodape('titulo', 'Até 150 caracteres.', LIMITES.titulo)}
              </div>

              <div className="campo">
                {rotulo('objetivo', 'Objetivo')}
                <textarea
                  {...propsCampo('objetivo', true)}
                  className="entrada"
                  value={dados.objetivo}
                  onChange={(e) => alterar('objetivo', e.target.value)}
                  maxLength={LIMITES.objetivo}
                  placeholder="Descreva a finalidade do estudo"
                />
                {rodape('objetivo', 'Texto simples, até 2.000 caracteres.', LIMITES.objetivo)}
              </div>
            </div>
          </section>

          <hr className="estudos-divisoria" />

          {/* <-------------------PLANEJAMENTO-------------------> */}
          <section className="estudos-secao" aria-labelledby="secao-planejamento">
            <div className="estudos-secao-texto">
              <h2 id="secao-planejamento">Planejamento</h2>
              <p>
                Datas previstas e quantidade máxima de participantes. O limite nunca pode ser
                ultrapassado nas inclusões.
              </p>
            </div>
            <div className="estudos-secao-campos estudos-periodo-previsto">
              <div className="campo">
                {rotulo('dataInicio', 'Data de início')}
                <div className="entrada-com-icone">
                  <Icone nome="calendario" />
                  <input
                    {...propsCampo('dataInicio', false)}
                    type="date"
                    value={dados.dataInicio}
                    onChange={(e) => alterar('dataInicio', e.target.value)}
                  />
                </div>
                {rodape('dataInicio')}
              </div>

              <div className="campo">
                {rotulo('dataFim', 'Data de término')}
                <div className="entrada-com-icone">
                  <Icone nome="calendario" />
                  <input
                    {...propsCampo('dataFim', true)}
                    type="date"
                    value={dados.dataFim}
                    onChange={(e) => alterar('dataFim', e.target.value)}
                  />
                </div>
                {rodape('dataFim', 'Igual ou posterior ao início.')}
              </div>

              <div className="campo">
                {rotulo('limiteParticipantes', 'Limite de participantes')}
                <div className="entrada-com-icone">
                  <Icone nome="usuarios" />
                  <input
                    {...propsCampo('limiteParticipantes', true)}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    placeholder="Ex.: 30"
                    value={dados.limiteParticipantes}
                    onChange={(e) => alterar('limiteParticipantes', e.target.value)}
                  />
                </div>
                {rodape('limiteParticipantes', 'Número inteiro maior que zero.')}
              </div>
            </div>
          </section>

          <p className="aviso aviso-informacao">
            <Icone nome="info" />
            Responsável: {usuario.nome} (você). Definido automaticamente a partir da sua sessão.
          </p>

          <div className="estudos-acoes">
            <Link className="botao botao-secundario" to="/estudos">
              Cancelar
            </Link>
            <button type="submit" className="botao botao-primario" disabled={enviando}>
              <Icone nome="sucesso" />
              {enviando ? 'Salvando…' : 'Salvar estudo'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
