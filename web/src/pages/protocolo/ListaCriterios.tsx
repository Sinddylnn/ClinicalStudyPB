import { useState, type FormEvent, type ReactNode } from 'react';
import { ErroRequisicao } from '../../api/erros';
import type { Criterio, TipoCriterio } from '../../api/protocolo';
import Icone from '../../components/icones';
import { AJUDA_TIPO_CRITERIO, NOMES_TIPO_CRITERIO } from './formatacao';
import { LIMITE_DESCRICAO_CRITERIO, validarCriterio } from './validacao';

type Props = {
  tipo: TipoCriterio;
  criterios: Criterio[];
  /** false fora de Planejamento: a lista fica só para consulta. */
  editavel: boolean;
  /** Texto mostrado quando a lista está vazia. */
  textoVazio: string;
  /** Quando informado, "Adicionar critério" fica desativado e este texto explica o motivo. */
  bloqueioAdicao?: string;
  /** Repassa o ErroRequisicao para o formulário mostrar. */
  aoAdicionar: (descricao: string) => Promise<void>;
  aoEditar: (criterio: Criterio, descricao: string) => Promise<void>;
  aoPedirRemocao: (criterio: Criterio) => void;
  /** Conteúdo extra no fim do cartão (opção "sem critérios de exclusão"). */
  children?: ReactNode;
};

// <-------------------LISTA DE CRITÉRIOS------------------->
// Um cartão por tipo: os critérios numerados e, em Planejamento, adicionar, editar e remover
export default function ListaCriterios({
  tipo,
  criterios,
  editavel,
  textoVazio,
  bloqueioAdicao,
  aoAdicionar,
  aoEditar,
  aoPedirRemocao,
  children,
}: Props) {
  // Critério em edição: 'novo' para o formulário de adição, o id para a edição
  const [edicao, setEdicao] = useState<'novo' | number | null>(null);
  const nome = NOMES_TIPO_CRITERIO[tipo];
  const idTitulo = `criterios-${tipo.toLowerCase()}`;
  const idBloqueio = `bloqueio-adicao-${tipo.toLowerCase()}`;

  const salvarNovo = async (descricao: string) => {
    await aoAdicionar(descricao);
    setEdicao(null);
  };

  const salvarEdicao = (criterio: Criterio) => async (descricao: string) => {
    await aoEditar(criterio, descricao);
    setEdicao(null);
  };

  return (
    <section className="estudos-cartao protocolo-cartao" aria-labelledby={idTitulo}>
      <header className="protocolo-cartao-cabecalho">
        <div className="protocolo-cartao-linha">
          <div className="protocolo-cartao-titulo">
            <h3 id={idTitulo}>Critérios de {nome}</h3>
            <span className="etiqueta protocolo-contagem" aria-hidden="true">
              {criterios.length}
            </span>
          </div>
          {editavel && edicao !== 'novo' && (
            <button
              type="button"
              className="botao botao-secundario protocolo-botao-pequeno"
              disabled={Boolean(bloqueioAdicao)}
              aria-describedby={bloqueioAdicao ? idBloqueio : undefined}
              onClick={() => setEdicao('novo')}
            >
              <Icone nome="mais" tamanho={16} />
              Adicionar critério
            </button>
          )}
        </div>
        <p className="protocolo-cartao-ajuda">{AJUDA_TIPO_CRITERIO[tipo]}</p>
        {editavel && bloqueioAdicao && (
          <p id={idBloqueio} className="protocolo-cartao-ajuda">
            {bloqueioAdicao}
          </p>
        )}
      </header>

      {criterios.length === 0 && edicao !== 'novo' && <p className="protocolo-vazio">{textoVazio}</p>}

      {criterios.length > 0 && (
        <ol className="protocolo-lista" aria-label={`Critérios de ${nome}`}>
          {criterios.map((criterio) =>
            edicao === criterio.id ? (
              <li key={criterio.id} className="protocolo-item protocolo-item-edicao">
                <FormularioCriterio
                  id={`criterio-${criterio.id}`}
                  rotulo={`Editar critério de ${nome}`}
                  inicial={criterio.descricao}
                  textoSalvar="Salvar"
                  aoSalvar={salvarEdicao(criterio)}
                  aoCancelar={() => setEdicao(null)}
                />
              </li>
            ) : (
              <li key={criterio.id} className="protocolo-item">
                <span className="protocolo-descricao">{criterio.descricao}</span>
                {editavel && (
                  <span className="protocolo-item-acoes">
                    <button
                      type="button"
                      className="protocolo-botao-icone"
                      aria-label={`Editar critério: ${criterio.descricao}`}
                      title="Editar"
                      onClick={() => setEdicao(criterio.id)}
                    >
                      <Icone nome="lapis" tamanho={16} />
                    </button>
                    <button
                      type="button"
                      className="protocolo-botao-icone protocolo-botao-remover"
                      aria-label={`Remover critério: ${criterio.descricao}`}
                      title="Remover"
                      onClick={() => aoPedirRemocao(criterio)}
                    >
                      <Icone nome="lixeira" tamanho={16} />
                    </button>
                  </span>
                )}
              </li>
            ),
          )}
        </ol>
      )}

      {edicao === 'novo' && (
        <FormularioCriterio
          id={`criterio-novo-${tipo.toLowerCase()}`}
          rotulo={`Novo critério de ${nome}`}
          inicial=""
          textoSalvar="Adicionar"
          aoSalvar={salvarNovo}
          aoCancelar={() => setEdicao(null)}
        />
      )}

      {children}
    </section>
  );
}

// <-------------------FORMULÁRIO DO CRITÉRIO------------------->
type PropsFormulario = {
  id: string;
  rotulo: string;
  inicial: string;
  textoSalvar: string;
  aoSalvar: (descricao: string) => Promise<void>;
  aoCancelar: () => void;
};

function FormularioCriterio({ id, rotulo, inicial, textoSalvar, aoSalvar, aoCancelar }: PropsFormulario) {
  const [descricao, setDescricao] = useState(inicial);
  const [erro, setErro] = useState<string>();
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const erroLocal = validarCriterio(descricao);
    if (erroLocal) {
      setErro(erroLocal);
      return;
    }

    setEnviando(true);
    try {
      await aoSalvar(descricao.trim());
    } catch (falha) {
      setEnviando(false);
      if (falha instanceof ErroRequisicao && falha.errosCampos.descricao) {
        setErro(falha.errosCampos.descricao);
      } else {
        setErroGeral(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível salvar o critério.');
      }
    }
  };

  return (
    <form className="protocolo-formulario" onSubmit={enviar} noValidate>
      {erroGeral && (
        <p className="aviso aviso-erro" role="alert">
          <Icone nome="alerta" />
          {erroGeral}
        </p>
      )}

      <div className="campo">
        <label className="obrigatorio" htmlFor={id}>
          {rotulo}
        </label>
        <textarea
          id={id}
          rows={3}
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            setErro(undefined);
          }}
          maxLength={LIMITE_DESCRICAO_CRITERIO}
          placeholder="Ex.: Adultos com idade entre 18 e 60 anos."
          aria-required
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${id}-erro` : undefined}
          // Abre já pronto para digitar, como ao clicar em Adicionar ou Editar
          autoFocus
        />
        <span className="campo-rodape">
          {erro && (
            <span id={`${id}-erro`} className="campo-erro">
              {erro}
            </span>
          )}
          <span className="campo-contador">
            {descricao.length}/{LIMITE_DESCRICAO_CRITERIO.toLocaleString('pt-BR')}
          </span>
        </span>
      </div>

      <div className="estudos-acoes">
        <button type="button" className="botao botao-secundario" onClick={aoCancelar} disabled={enviando}>
          Cancelar
        </button>
        <button type="submit" className="botao botao-primario" disabled={enviando}>
          {enviando ? 'Salvando…' : textoSalvar}
        </button>
      </div>
    </form>
  );
}
