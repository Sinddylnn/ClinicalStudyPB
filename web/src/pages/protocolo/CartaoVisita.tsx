import type { AtividadePrevista, VisitaPrevista, VisitaPrevistaEntrada } from '../../api/protocolo';
import Icone from '../../components/icones';
import { tituloVisita } from './formatacao';
import FormularioDescricao from './FormularioDescricao';
import FormularioVisita from './FormularioVisita';
import { LIMITE_DESCRICAO_ATIVIDADE, validarAtividade } from './validacao';

/** O que está aberto para edição na aba Visitas: um formulário por vez. */
export type EdicaoVisitas =
  | { tipo: 'nova-visita' }
  | { tipo: 'visita'; id: number }
  | { tipo: 'nova-atividade'; visitaId: number }
  | { tipo: 'atividade'; id: number };

type Props = {
  visita: VisitaPrevista;
  /** false fora de Planejamento: o cartão fica só para consulta. */
  editavel: boolean;
  /** false quando o backend em uso ainda não publicou a edição e a remoção. */
  editarRemover: boolean;
  edicao: EdicaoVisitas | null;
  aoAbrir: (edicao: EdicaoVisitas | null) => void;
  aoSalvarVisita: (entrada: VisitaPrevistaEntrada) => Promise<void>;
  aoAdicionarAtividade: (descricao: string) => Promise<void>;
  aoEditarAtividade: (atividade: AtividadePrevista, descricao: string) => Promise<void>;
  aoPedirRemocaoVisita: () => void;
  aoPedirRemocaoAtividade: (atividade: AtividadePrevista) => void;
};

const propsAtividade = {
  validar: validarAtividade,
  limite: LIMITE_DESCRICAO_ATIVIDADE,
  placeholder: 'Ex.: Aplicar questionário fictício de acompanhamento.',
  textoFalha: 'Não foi possível salvar a atividade.',
};

// <-------------------CARTÃO DA VISITA------------------->
// Uma visita prevista com a descrição e as atividades numeradas. Sem atividade, o cartão fica em
// destaque: a visita impede a abertura do recrutamento (modelagem, seção 5)
export default function CartaoVisita({
  visita,
  editavel,
  editarRemover,
  edicao,
  aoAbrir,
  aoSalvarVisita,
  aoAdicionarAtividade,
  aoEditarAtividade,
  aoPedirRemocaoVisita,
  aoPedirRemocaoAtividade,
}: Props) {
  const idTitulo = `visita-${visita.id}`;
  const semAtividade = visita.atividades.length === 0;
  const editandoVisita = edicao?.tipo === 'visita' && edicao.id === visita.id;
  const adicionandoAtividade = edicao?.tipo === 'nova-atividade' && edicao.visitaId === visita.id;
  const fechar = () => aoAbrir(null);

  return (
    <section
      className={`estudos-cartao protocolo-cartao${semAtividade ? ' protocolo-visita-pendente' : ''}`}
      aria-labelledby={idTitulo}
    >
      <header className="protocolo-cartao-cabecalho">
        <div className="protocolo-cartao-linha">
          <div className="protocolo-cartao-titulo">
            <h3 id={idTitulo}>{tituloVisita(visita)}</h3>
            <span className="etiqueta protocolo-contagem" aria-hidden="true">
              {visita.atividades.length}
            </span>
          </div>
          {editavel && editarRemover && !editandoVisita && (
            <span className="protocolo-item-acoes">
              <button
                type="button"
                className="protocolo-botao-icone"
                aria-label={`Editar visita: ${visita.nome}`}
                title="Editar"
                onClick={() => aoAbrir({ tipo: 'visita', id: visita.id })}
              >
                <Icone nome="lapis" tamanho={16} />
              </button>
              <button
                type="button"
                className="protocolo-botao-icone protocolo-botao-remover"
                aria-label={`Remover visita: ${visita.nome}`}
                title="Remover"
                onClick={aoPedirRemocaoVisita}
              >
                <Icone nome="lixeira" tamanho={16} />
              </button>
            </span>
          )}
        </div>
        {visita.descricao && <p className="protocolo-cartao-ajuda">{visita.descricao}</p>}
        {semAtividade && (
          <p className="protocolo-visita-aviso">
            <Icone nome="alerta" tamanho={16} />
            Sem atividades: cadastre ao menos uma para iniciar o recrutamento
          </p>
        )}
      </header>

      {editandoVisita && (
        <div className="protocolo-visita-edicao">
          <FormularioVisita
            id={`visita-${visita.id}`}
            titulo={`Editar visita ${visita.nome}`}
            inicial={visita}
            textoSalvar="Salvar"
            aoSalvar={aoSalvarVisita}
            aoCancelar={fechar}
          />
        </div>
      )}

      {visita.atividades.length > 0 && (
        <ol className="protocolo-lista" aria-label={`Atividades da visita ${visita.nome}`}>
          {visita.atividades.map((atividade) =>
            edicao?.tipo === 'atividade' && edicao.id === atividade.id ? (
              <li key={atividade.id} className="protocolo-item protocolo-item-edicao">
                <FormularioDescricao
                  {...propsAtividade}
                  id={`atividade-${atividade.id}`}
                  rotulo="Editar atividade"
                  inicial={atividade.descricao}
                  textoSalvar="Salvar"
                  aoSalvar={async (descricao) => {
                    await aoEditarAtividade(atividade, descricao);
                    fechar();
                  }}
                  aoCancelar={fechar}
                />
              </li>
            ) : (
              <li key={atividade.id} className="protocolo-item">
                <span className="protocolo-descricao">{atividade.descricao}</span>
                {editavel && editarRemover && (
                  <span className="protocolo-item-acoes">
                    <button
                      type="button"
                      className="protocolo-botao-icone"
                      aria-label={`Editar atividade: ${atividade.descricao}`}
                      title="Editar"
                      onClick={() => aoAbrir({ tipo: 'atividade', id: atividade.id })}
                    >
                      <Icone nome="lapis" tamanho={16} />
                    </button>
                    <button
                      type="button"
                      className="protocolo-botao-icone protocolo-botao-remover"
                      aria-label={`Remover atividade: ${atividade.descricao}`}
                      title="Remover"
                      onClick={() => aoPedirRemocaoAtividade(atividade)}
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

      {adicionandoAtividade && (
        <FormularioDescricao
          {...propsAtividade}
          id={`atividade-nova-${visita.id}`}
          rotulo="Nova atividade"
          inicial=""
          textoSalvar="Adicionar"
          aoSalvar={async (descricao) => {
            await aoAdicionarAtividade(descricao);
            fechar();
          }}
          aoCancelar={fechar}
        />
      )}

      {editavel && !adicionandoAtividade && (
        <div className="protocolo-visita-rodape">
          <button
            type="button"
            className="botao botao-secundario protocolo-botao-pequeno"
            onClick={() => aoAbrir({ tipo: 'nova-atividade', visitaId: visita.id })}
          >
            <Icone nome="mais" tamanho={16} />
            Adicionar atividade
          </button>
        </div>
      )}
    </section>
  );
}
