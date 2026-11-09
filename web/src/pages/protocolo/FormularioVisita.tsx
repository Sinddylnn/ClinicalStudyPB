import { useState, type FormEvent } from 'react';
import { ErroRequisicao } from '../../api/erros';
import type { VisitaPrevistaEntrada } from '../../api/protocolo';
import Icone from '../../components/icones';
import {
  LIMITE_DESCRICAO_VISITA,
  LIMITE_NOME_VISITA,
  normalizarVisita,
  validarVisita,
  type ErrosVisita,
} from './validacao';

type Props = {
  /** Prefixo dos ids dos campos (ex.: "visita-nova", "visita-3"). */
  id: string;
  titulo: string;
  inicial: { nome: string; descricao: string | null; ordem: number };
  textoSalvar: string;
  aoSalvar: (entrada: VisitaPrevistaEntrada) => Promise<void>;
  aoCancelar: () => void;
};

// <-------------------FORMULÁRIO DA VISITA------------------->
// Nome, ordem e descrição opcional, com as regras do backend (VisitaPrevistaCadastroEntrada).
// A ordem repetida (ORDEM_VISITA_DUPLICADA) aparece no próprio campo da ordem
export default function FormularioVisita({ id, titulo, inicial, textoSalvar, aoSalvar, aoCancelar }: Props) {
  const [nome, setNome] = useState(inicial.nome);
  const [ordem, setOrdem] = useState(String(inicial.ordem));
  const [descricao, setDescricao] = useState(inicial.descricao ?? '');
  const [erros, setErros] = useState<ErrosVisita>({});
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const limparErro = (campo: keyof ErrosVisita) => setErros((atuais) => ({ ...atuais, [campo]: undefined }));

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const dados = { nome, descricao, ordem };
    const errosLocais = validarVisita(dados);
    if (Object.keys(errosLocais).length > 0) {
      setErros(errosLocais);
      return;
    }

    setEnviando(true);
    try {
      await aoSalvar(normalizarVisita(dados));
    } catch (falha) {
      setEnviando(false);
      if (falha instanceof ErroRequisicao && falha.codigo === 'ORDEM_VISITA_DUPLICADA') {
        setErros({ ordem: falha.message });
      } else if (falha instanceof ErroRequisicao && Object.keys(falha.errosCampos).length > 0) {
        setErros(falha.errosCampos);
      } else {
        setErroGeral(falha instanceof ErroRequisicao ? falha.message : 'Não foi possível salvar a visita.');
      }
    }
  };

  // Liga o campo à mensagem de erro, quando houver
  const descrito = (campo: keyof ErrosVisita, ajuda?: string) =>
    erros[campo] ? `${id}-${campo}-erro` : ajuda;

  return (
    <form className="protocolo-formulario" onSubmit={enviar} noValidate aria-label={titulo}>
      {erroGeral && (
        <p className="aviso aviso-erro" role="alert">
          <Icone nome="alerta" />
          {erroGeral}
        </p>
      )}

      <div className="protocolo-visita-campos">
        <div className="campo">
          <label className="obrigatorio" htmlFor={`${id}-nome`}>
            Nome da visita
          </label>
          <input
            id={`${id}-nome`}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              limparErro('nome');
            }}
            maxLength={LIMITE_NOME_VISITA}
            placeholder="Ex.: Visita inicial"
            aria-required
            aria-invalid={Boolean(erros.nome)}
            aria-describedby={descrito('nome')}
            autoFocus
          />
          <span className="campo-rodape">
            {erros.nome && (
              <span id={`${id}-nome-erro`} className="campo-erro">
                {erros.nome}
              </span>
            )}
            <span className="campo-contador">
              {nome.length}/{LIMITE_NOME_VISITA}
            </span>
          </span>
        </div>

        <div className="campo">
          <label className="obrigatorio" htmlFor={`${id}-ordem`}>
            Ordem
          </label>
          <input
            id={`${id}-ordem`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={ordem}
            onChange={(e) => {
              setOrdem(e.target.value);
              limparErro('ordem');
            }}
            aria-required
            aria-invalid={Boolean(erros.ordem)}
            aria-describedby={descrito('ordem', `${id}-ordem-ajuda`)}
          />
          <span className="campo-rodape">
            {erros.ordem ? (
              <span id={`${id}-ordem-erro`} className="campo-erro">
                {erros.ordem}
              </span>
            ) : (
              <span id={`${id}-ordem-ajuda`} className="campo-ajuda">
                Define a sequência; não pode repetir.
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="campo">
        <label htmlFor={`${id}-descricao`}>Descrição (opcional)</label>
        <textarea
          id={`${id}-descricao`}
          rows={2}
          value={descricao}
          onChange={(e) => {
            setDescricao(e.target.value);
            limparErro('descricao');
          }}
          maxLength={LIMITE_DESCRICAO_VISITA}
          placeholder="Ex.: Apresentação do estudo e orientações iniciais."
          aria-invalid={Boolean(erros.descricao)}
          aria-describedby={descrito('descricao')}
        />
        <span className="campo-rodape">
          {erros.descricao && (
            <span id={`${id}-descricao-erro`} className="campo-erro">
              {erros.descricao}
            </span>
          )}
          <span className="campo-contador">
            {descricao.length}/{LIMITE_DESCRICAO_VISITA.toLocaleString('pt-BR')}
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
