import type { PendenciaRecrutamento, TipoCriterio } from '../../api/protocolo';

// <-------------------EXIBIÇÃO DO PROTOCOLO------------------->
export const NOMES_TIPO_CRITERIO: Record<TipoCriterio, string> = {
  INCLUSAO: 'inclusão',
  EXCLUSAO: 'exclusão',
};

/** Itens do quadro "Para abrir o recrutamento", na ordem da regra da T47. */
export const REQUISITOS_RECRUTAMENTO: { codigo: PendenciaRecrutamento; texto: string }[] = [
  { codigo: 'CRITERIO_INCLUSAO', texto: 'Pelo menos 1 critério de inclusão' },
  { codigo: 'CRITERIOS_EXCLUSAO', texto: 'Critérios de exclusão definidos ou indicação de que não há' },
  { codigo: 'VISITA_PREVISTA', texto: 'Pelo menos 1 visita prevista com atividade' },
];
