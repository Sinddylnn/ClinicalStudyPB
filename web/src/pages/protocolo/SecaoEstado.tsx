import type { Estudo } from '../../api/estudos';
import { NOMES_ESTADO } from '../estudos/formatacao';
import { FRASES_ESTADO } from './formatacao';

type Props = {
  estudo: Pick<Estudo, 'estado' | 'justificativaEncerramento'>;
};

// <-------------------ESTADO DO ESTUDO------------------->
// Topo da aba Resumo: o estado atual e o que ele permite. As ações ficam no cabeçalho da tela,
// visíveis em todas as abas; aqui aparece a justificativa registrada no encerramento, se houver
export default function SecaoEstado({ estudo }: Props) {
  return (
    <section className="estudos-cartao protocolo-bloco" aria-labelledby="secao-estado">
      <div className="protocolo-estado-cabecalho">
        <h2 id="secao-estado">Estado do estudo</h2>
        <span className={`etiqueta etiqueta-${estudo.estado.toLowerCase()}`}>{NOMES_ESTADO[estudo.estado]}</span>
      </div>
      <p className="protocolo-estado-frase">{FRASES_ESTADO[estudo.estado]}</p>
      {estudo.estado === 'ENCERRADO' && estudo.justificativaEncerramento && (
        <dl className="protocolo-dados">
          <div>
            <dt>Justificativa do encerramento</dt>
            <dd>{estudo.justificativaEncerramento}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
