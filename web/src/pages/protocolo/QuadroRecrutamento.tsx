import type { Protocolo } from '../../api/protocolo';
import Icone from '../../components/icones';
import { REQUISITOS_RECRUTAMENTO } from './formatacao';
import { requisitosCriterios } from './validacao';

type Props = {
  protocolo: Pick<Protocolo, 'criteriosInclusao' | 'criteriosExclusao' | 'semCriteriosExclusao'>;
};

// <-------------------PARA ABRIR O RECRUTAMENTO------------------->
// Checklist calculada na tela a partir dos critérios; a abertura em si é da T47.
// As visitas chegam na T46: até lá, o item fica sempre pendente.
export default function QuadroRecrutamento({ protocolo }: Props) {
  const atendidos = { ...requisitosCriterios(protocolo), VISITA_PREVISTA: false };
  const faltam = REQUISITOS_RECRUTAMENTO.filter((r) => !atendidos[r.codigo]).length;

  return (
    <aside className="estudos-cartao protocolo-quadro" aria-labelledby="quadro-recrutamento">
      <h2 id="quadro-recrutamento">Para abrir o recrutamento</h2>
      <p className="protocolo-quadro-resumo">
        {faltam === 1 ? 'Falta 1 item.' : `Faltam ${faltam} itens.`}
      </p>
      <ul className="protocolo-requisitos">
        {REQUISITOS_RECRUTAMENTO.map(({ codigo, texto }) => {
          const ok = atendidos[codigo];
          return (
            <li key={codigo} className={ok ? 'protocolo-requisito-ok' : 'protocolo-requisito-pendente'}>
              <Icone nome={ok ? 'sucesso' : 'alerta'} tamanho={16} />
              <span>
                {texto}
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
