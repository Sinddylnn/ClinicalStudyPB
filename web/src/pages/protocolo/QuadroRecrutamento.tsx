import type { PendenciaRecrutamento, Protocolo } from '../../api/protocolo';
import Icone from '../../components/icones';
import { contarCriterios, ORDEM_QUADRO, TEXTOS_REQUISITO } from './formatacao';
import { requisitosRecrutamento } from './validacao';

type Props = {
  protocolo: Pick<Protocolo, 'criteriosInclusao' | 'criteriosExclusao' | 'semCriteriosExclusao'>;
  /** Do estudo: a abertura do recrutamento exige um coordenador atribuído. */
  coordenadorId: number | null;
};

// Linha de apoio de cada item, como no protótipo ("3 critérios cadastrados", "Nenhuma visita cadastrada")
function detalhe(codigo: PendenciaRecrutamento, ok: boolean, props: Props): string {
  const { protocolo } = props;
  switch (codigo) {
    case 'CRITERIO_INCLUSAO':
      return ok ? contarCriterios(protocolo.criteriosInclusao.length) : 'Nenhum critério cadastrado';
    case 'CRITERIOS_EXCLUSAO':
      if (protocolo.semCriteriosExclusao) return 'O estudo não possui critérios de exclusão';
      return ok ? contarCriterios(protocolo.criteriosExclusao.length) : 'Cadastre ou indique que não há';
    case 'VISITA_PREVISTA':
      return 'Nenhuma visita cadastrada';
    case 'COORDENADOR':
      return ok ? 'Coordenador vinculado ao estudo' : 'Atribua na seção Coordenador';
  }
}

// <-------------------PARA INICIAR O RECRUTAMENTO------------------->
// Checklist da aba Resumo, calculada na tela a partir do estudo e dos critérios; a abertura em si é da T47.
// As visitas chegam na T46: até lá, o item fica sempre pendente.
export default function QuadroRecrutamento(props: Props) {
  const atendidos = requisitosRecrutamento(props.protocolo, props.coordenadorId);
  const faltam = ORDEM_QUADRO.filter((codigo) => !atendidos[codigo]).length;

  return (
    <aside className="estudos-cartao protocolo-quadro" aria-labelledby="quadro-recrutamento">
      <div className="protocolo-quadro-cabecalho">
        <h2 id="quadro-recrutamento">Para iniciar o recrutamento</h2>
        <span className={`etiqueta ${faltam === 0 ? 'etiqueta-pronto' : 'etiqueta-pendencias'}`}>
          {faltam === 0 ? 'Pronto' : faltam === 1 ? '1 pendente' : `${faltam} pendentes`}
        </span>
      </div>
      <ul className="protocolo-requisitos">
        {ORDEM_QUADRO.map((codigo) => {
          const ok = atendidos[codigo];
          return (
            <li key={codigo} className={ok ? 'protocolo-requisito-ok' : 'protocolo-requisito-pendente'}>
              <span className="protocolo-requisito-situacao">
                <Icone nome={ok ? 'sucesso' : 'relogio'} tamanho={14} />
                <span className="protocolo-oculto">{ok ? 'Atendido: ' : 'Pendente: '}</span>
              </span>
              <span className="protocolo-requisito-texto">
                {TEXTOS_REQUISITO[codigo]}
                <span className="protocolo-requisito-detalhe">{detalhe(codigo, ok, props)}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
