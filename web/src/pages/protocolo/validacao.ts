import type { PendenciaRecrutamento, Protocolo } from '../../api/protocolo';

// <-------------------VALIDAÇÃO DO CRITÉRIO------------------->
// Mesmas regras usadas pelo serviço simulado, para a tela e o "backend" concordarem
export const LIMITE_DESCRICAO_CRITERIO = 500;

export function validarCriterio(descricao: string): string | undefined {
  const texto = descricao.trim();
  if (!texto) return 'Descreva o critério.';
  if (texto.length > LIMITE_DESCRICAO_CRITERIO) return `Use até ${LIMITE_DESCRICAO_CRITERIO} caracteres.`;
  return undefined;
}

// <-------------------REQUISITOS PARA O RECRUTAMENTO------------------->
// Regra da T47 (kickoff 8.3): ao menos 1 critério de inclusão, exclusão definida ou
// dispensada e ao menos 1 visita prevista com atividade
type CriteriosProtocolo = Pick<Protocolo, 'criteriosInclusao' | 'criteriosExclusao' | 'semCriteriosExclusao'>;

/** Requisitos atendidos pelos critérios; VISITA_PREVISTA fica para a T46. */
export function requisitosCriterios(protocolo: CriteriosProtocolo): Record<
  Exclude<PendenciaRecrutamento, 'VISITA_PREVISTA'>,
  boolean
> {
  return {
    CRITERIO_INCLUSAO: protocolo.criteriosInclusao.length > 0,
    CRITERIOS_EXCLUSAO: protocolo.criteriosExclusao.length > 0 || protocolo.semCriteriosExclusao,
  };
}

/** Pendências na ordem da regra. Sem as visitas (T46), VISITA_PREVISTA sempre falta. */
export function calcularPendencias(protocolo: CriteriosProtocolo): PendenciaRecrutamento[] {
  const atendidos = requisitosCriterios(protocolo);
  const pendencias: PendenciaRecrutamento[] = [];
  if (!atendidos.CRITERIO_INCLUSAO) pendencias.push('CRITERIO_INCLUSAO');
  if (!atendidos.CRITERIOS_EXCLUSAO) pendencias.push('CRITERIOS_EXCLUSAO');
  pendencias.push('VISITA_PREVISTA');
  return pendencias;
}
