import { useState, type FormEvent } from 'react';
import { ErroRequisicao } from '../../api/erros';
import Icone from '../../components/icones';

type Props = {
  id: string;
  rotulo: string;
  inicial: string;
  textoSalvar: string;
  /** Mesma regra do backend para o campo; devolve a mensagem ou undefined. */
  validar: (descricao: string) => string | undefined;
  limite: number;
  placeholder: string;
  /** Mensagem quando a falha não é um ErroRequisicao (ex.: "Não foi possível salvar o critério."). */
  textoFalha: string;
  aoSalvar: (descricao: string) => Promise<void>;
  aoCancelar: () => void;
};

// <-------------------FORMULÁRIO DE DESCRIÇÃO------------------->
// Um campo de texto com contador, usado nos critérios e nas atividades das visitas. Valida na tela
// antes de enviar; o erro do campo vindo do backend aparece no campo e os demais, no topo
export default function FormularioDescricao({
  id,
  rotulo,
  inicial,
  textoSalvar,
  validar,
  limite,
  placeholder,
  textoFalha,
  aoSalvar,
  aoCancelar,
}: Props) {
  const [descricao, setDescricao] = useState(inicial);
  const [erro, setErro] = useState<string>();
  const [erroGeral, setErroGeral] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErroGeral(undefined);

    const erroLocal = validar(descricao);
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
        setErroGeral(falha instanceof ErroRequisicao ? falha.message : textoFalha);
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
          maxLength={limite}
          placeholder={placeholder}
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
            {descricao.length}/{limite.toLocaleString('pt-BR')}
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
