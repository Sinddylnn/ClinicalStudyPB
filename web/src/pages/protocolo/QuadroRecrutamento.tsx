import type { Protocolo } from '../../api/protocolo';
import Icone from '../../components/icones';
import { TEXTOS_REQUISITO } from './formatacao';
import { ORDEM_REQUISITOS, requisitosRecrutamento } from './validacao';

type Props = {
  protocolo: Pick<Protocolo, 'criteriosInclusao' | 'criteriosExclusao' | 'semCriteriosExclusao'>;
  /** Do estudo: a abertura do recrutamento exige um coordenador atribuído. */
  coordenadorId: number | null;
};

// <-------------------PARA ABRIR O RECRUTAMENTO------------------->
// Checklist calculada na tela a partir do estudo e dos critérios; a abertura em si é da T47.
// As visitas chegam na T46: até lá, o item fica sempre pendente.
export default function QuadroRecrutamento({ protocolo, coordenadorId }: Props) {
  const atendidos = requisitosRecrutamento(protocolo, coordenadorId);
  const faltam = ORDEM_REQUISITOS.filter((codigo) => !atendidos[codigo]).length;

  return (
    <aside className="estudos-cartao protocolo-quadro" aria-labelledby="quadro-recrutamento">
      <h2 id="quadro-recrutamento">Para abrir o recrutamento</h2>
      <p className="protocolo-quadro-resumo">
        {faltam === 1 ? 'Falta 1 item.' : `Faltam ${faltam} itens.`}
      </p>
      <ul className="protocolo-requisitos">
        {ORDEM_REQUISITOS.map((codigo) => {
          const ok = atendidos[codigo];
          return (
            <li key={codigo} className={ok ? 'protocolo-requisito-ok' : 'protocolo-requisito-pendente'}>
              <Icone nome={ok ? 'sucesso' : 'alerta'} tamanho={16} />
              <span>
                {TEXTOS_REQUISITO[codigo]}
                <span className="protocolo-requisito-situacao">
                  {ok ? 'Atendido' : codigo === 'VISITA_PREVISTA' ? 'Pendente: cadastro de visitas em breve' : 'Pendente'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
