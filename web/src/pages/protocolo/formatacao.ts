import type { PendenciaRecrutamento, TipoCriterio } from '../../api/protocolo';

// <-------------------EXIBIÇÃO DO PROTOCOLO------------------->
export const NOMES_TIPO_CRITERIO: Record<TipoCriterio, string> = {
  INCLUSAO: 'inclusão',
  EXCLUSAO: 'exclusão',
};

/** Explicação abaixo do título de cada cartão de critérios (protótipo, aba Critérios). */
export const AJUDA_TIPO_CRITERIO: Record<TipoCriterio, string> = {
  INCLUSAO: 'O candidato precisa atender a todos para ser elegível.',
  EXCLUSAO: 'Se algum estiver presente, o candidato é inelegível.',
};

/** Textos dos itens do quadro "Para iniciar o recrutamento" (protótipo, aba Resumo). */
export const TEXTOS_REQUISITO: Record<PendenciaRecrutamento, string> = {
  CRITERIO_INCLUSAO: 'Pelo menos um critério de inclusão',
  CRITERIOS_EXCLUSAO: 'Critérios de exclusão definidos',
  VISITA_PREVISTA: 'Visitas com pelo menos uma atividade cada',
  COORDENADOR: 'Coordenador atribuído',
};

/** Ordem do quadro no protótipo: primeiro o protocolo, por último o coordenador. */
export const ORDEM_QUADRO: PendenciaRecrutamento[] = [
  'CRITERIO_INCLUSAO',
  'CRITERIOS_EXCLUSAO',
  'VISITA_PREVISTA',
  'COORDENADOR',
];

/** "1 critério cadastrado", "3 critérios cadastrados". */
export function contarCriterios(quantidade: number): string {
  return quantidade === 1 ? '1 critério cadastrado' : `${quantidade} critérios cadastrados`;
}
