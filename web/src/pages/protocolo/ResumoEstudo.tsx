import type { Estudo } from '../../api/estudos';
import Icone from '../../components/icones';
import { formatarPeriodo } from '../estudos/formatacao';

type Props = {
  estudo: Estudo;
  /** Nome de quem está na sessão: o pesquisador só abre os próprios estudos. */
  nomeResponsavel: string;
};

// <-------------------RESUMO DO ESTUDO------------------->
// Aba Resumo do protótipo: dados do cadastro e o coordenador.
// Atribuir ou trocar o coordenador é de outra task; aqui só aparece a situação.
export default function ResumoEstudo({ estudo, nomeResponsavel }: Props) {
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

      <section className="estudos-cartao protocolo-bloco" aria-labelledby="secao-coordenador">
        <h2 id="secao-coordenador">Coordenador</h2>
        <p className="protocolo-coordenador">
          <Icone nome="usuario" />
          {estudo.coordenadorId === null
            ? 'Nenhum coordenador atribuído. Ele é necessário para iniciar o recrutamento.'
            : 'Coordenador atribuído ao estudo.'}
        </p>
      </section>
    </div>
  );
}
