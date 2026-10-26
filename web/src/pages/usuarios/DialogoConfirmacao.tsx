import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import Icone, { type NomeIcone } from '../../components/icones';

export type ItemConsequencia = { texto: string; tipo: 'perde' | 'mantem' };

type Props = {
  titulo: string;
  descricao: string;
  icone: NomeIcone;
  /** "perigo" (desativar) ou "positivo" (reativar): define as cores do ícone e do botão. */
  tom: 'perigo' | 'positivo';
  consequencias: ItemConsequencia[];
  /** Aviso extra abaixo das consequências (ex.: a própria conta). */
  aviso?: ReactNode;
  textoConfirmar: string;
  erro?: string;
  enviando: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
};

const FOCAVEIS = 'button:not([disabled]), a[href], input, select, textarea';

// <-------------------DIÁLOGO DE CONFIRMAÇÃO------------------->
// Explica as consequências antes de desativar ou reativar uma conta.
// Recebe o foco ao abrir, Esc e Cancelar fecham, Tab circula só dentro dele
// e, ao fechar, o foco volta ao botão que o abriu.
export default function DialogoConfirmacao({
  titulo,
  descricao,
  icone,
  tom,
  consequencias,
  aviso,
  textoConfirmar,
  erro,
  enviando,
  aoConfirmar,
  aoCancelar,
}: Props) {
  const dialogo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    dialogo.current?.focus();
    return () => anterior?.focus();
  }, []);

  // No documento: Esc fecha mesmo que o foco tenha saído do diálogo (clique no fundo)
  useEffect(() => {
    const fecharComEsc = (evento: globalThis.KeyboardEvent) => {
      if (evento.key === 'Escape' && !enviando) aoCancelar();
    };
    document.addEventListener('keydown', fecharComEsc);
    return () => document.removeEventListener('keydown', fecharComEsc);
  }, [enviando, aoCancelar]);

  const aoTeclar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Tab' || !dialogo.current) return;
    const focaveis = Array.from(dialogo.current.querySelectorAll<HTMLElement>(FOCAVEIS));
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    const ativo = document.activeElement;
    if (evento.shiftKey && (ativo === primeiro || ativo === dialogo.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <div className="usuarios-sobreposicao">
      <div
        ref={dialogo}
        className="usuarios-dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-descricao"
        tabIndex={-1}
        onKeyDown={aoTeclar}
      >
        <span className={`usuarios-dialogo-icone usuarios-dialogo-${tom}`}>
          <Icone nome={icone} tamanho={22} />
        </span>
        <h2 id="dialogo-titulo">{titulo}</h2>
        <p id="dialogo-descricao" className="usuarios-dialogo-descricao">
          {descricao}
        </p>

        <ul className="usuarios-consequencias">
          {consequencias.map((item) => (
            <li key={item.texto} className={`usuarios-consequencia-${item.tipo}`}>
              <Icone nome={item.tipo === 'perde' ? 'fechar' : 'sucesso'} tamanho={16} />
              {item.texto}
            </li>
          ))}
        </ul>

        {aviso}

        {erro && (
          <p className="aviso aviso-erro" role="alert">
            <Icone nome="alerta" />
            {erro}
          </p>
        )}

        <div className="usuarios-dialogo-acoes">
          <button type="button" className="botao botao-secundario" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button
            type="button"
            className={`botao ${tom === 'perigo' ? 'botao-perigo' : 'botao-primario'}`}
            onClick={aoConfirmar}
            disabled={enviando}
          >
            <Icone nome={icone} />
            {enviando ? 'Aguarde…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
