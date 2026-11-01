import type { EstadoEstudo } from '../../api/estudos';
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

// <-------------------ESTADO DO ESTUDO------------------->
/** O que cada estado permite, no cartão "Estado do estudo" (modelagem, seção 6). */
export const FRASES_ESTADO: Record<EstadoEstudo, string> = {
  PLANEJAMENTO:
    'O protocolo pode ser configurado. Com o protocolo completo e um coordenador atribuído, o recrutamento pode ser iniciado.',
  RECRUTAMENTO:
    'O coordenador cadastra e avalia candidatos e inclui participantes. O protocolo fica somente para consulta.',
  EXECUCAO: 'Novas inclusões estão bloqueadas. Os participantes já incluídos continuam no estudo.',
  ENCERRADO: 'O estudo foi encerrado e fica disponível somente para consulta.',
};

/** Botão de cada destino no cabeçalho do estudo; PLANEJAMENTO nunca é destino. */
export const ACOES_ESTADO: Record<Exclude<EstadoEstudo, 'PLANEJAMENTO'>, string> = {
  RECRUTAMENTO: 'Iniciar recrutamento',
  EXECUCAO: 'Iniciar execução',
  ENCERRADO: 'Encerrar estudo',
};
