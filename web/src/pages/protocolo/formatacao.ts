import type { PendenciaRecrutamento, TipoCriterio } from '../../api/protocolo';

// <-------------------EXIBIÇÃO DO PROTOCOLO------------------->
export const NOMES_TIPO_CRITERIO: Record<TipoCriterio, string> = {
  INCLUSAO: 'inclusão',
  EXCLUSAO: 'exclusão',
};

/** Textos dos itens do quadro "Para abrir o recrutamento" (a ordem fica em ORDEM_REQUISITOS). */
export const TEXTOS_REQUISITO: Record<PendenciaRecrutamento, string> = {
  COORDENADOR: 'Coordenador atribuído',
  CRITERIO_INCLUSAO: 'Pelo menos 1 critério de inclusão',
  CRITERIOS_EXCLUSAO: 'Critérios de exclusão definidos ou indicação de que não há',
  VISITA_PREVISTA: 'Pelo menos 1 visita prevista, com atividade em cada visita',
};
