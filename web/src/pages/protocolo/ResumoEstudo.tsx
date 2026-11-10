import type { ReactNode } from 'react';
import type { Estudo } from '../../api/estudos';
import { formatarPeriodo } from '../estudos/formatacao';

type Props = {
  estudo: Estudo;
  /** Nome de quem está na sessão: o pesquisador só abre os próprios estudos. */
  nomeResponsavel: string;
  /** Seção do coordenador (SecaoCoordenador), logo abaixo dos dados. */
  coordenador: ReactNode;
};

// <-------------------RESUMO DO ESTUDO------------------->
// Aba Resumo do protótipo: dados do cadastro e o coordenador
export default function ResumoEstudo({ estudo, nomeResponsavel, coordenador }: Props) {
  const dados: [string, string][] = [
    ['Objetivo', estudo.objetivo],
    ['Período previsto', formatarPeriodo(estudo.dataInicio, estudo.dataFim)],
    ['Limite de participantes', `${estudo.limiteParticipantes} vagas`],
    ['Responsável', `${nomeResponsavel} (você)`],
  ];

  return (
    <div className="protocolo-coluna">
      <section className="estudos-cartao protocolo-bloco" aria-labelledby="secao-dados">
        <h2 id="secao-dados">Dados do estudo</h2>
        <dl className="protocolo-dados">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      {coordenador}
    </div>
  );
}
