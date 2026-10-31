import type { PendenciaRecrutamento, Protocolo } from '../../api/protocolo';

// <-------------------VALIDAÇÃO DO CRITÉRIO------------------->
// Mesmas regras usadas pelo serviço simulado, para a tela e o "backend" concordarem
// Modelagem RF05-RF07, seção 2.2: de 1 a 1.000 caracteres após retirar espaços das pontas
export const LIMITE_DESCRICAO_CRITERIO = 1000;

export function validarCriterio(descricao: string): string | undefined {
  const texto = descricao.trim();
  if (!texto) return 'Descreva o critério.';
  if (texto.length > LIMITE_DESCRICAO_CRITERIO) {
    return `Use até ${LIMITE_DESCRICAO_CRITERIO.toLocaleString('pt-BR')} caracteres.`;
  }
  return undefined;
}

// <-------------------REQUISITOS PARA O RECRUTAMENTO------------------->
// Modelagem RF05-RF07, seção 5 (transição da T47): coordenador atribuído, ao menos 1 critério de
// inclusão, exclusões definidas ou declaradas ausentes e ao menos 1 visita prevista, com atividade em cada uma
type CriteriosProtocolo = Pick<Protocolo, 'criteriosInclusao' | 'criteriosExclusao' | 'semCriteriosExclusao'>;

/** Ordem das pendências devolvidas pelo serviço; o quadro da tela usa ORDEM_QUADRO. */
export const ORDEM_REQUISITOS: PendenciaRecrutamento[] = [
  'COORDENADOR',
  'CRITERIO_INCLUSAO',
  'CRITERIOS_EXCLUSAO',
  'VISITA_PREVISTA',
];

/** Situação de cada requisito. Sem as visitas (T46), VISITA_PREVISTA nunca é atendido. */
export function requisitosRecrutamento(
  protocolo: CriteriosProtocolo,
  coordenadorId: number | null,
): Record<PendenciaRecrutamento, boolean> {
  return {
    COORDENADOR: coordenadorId !== null,
    CRITERIO_INCLUSAO: protocolo.criteriosInclusao.length > 0,
    CRITERIOS_EXCLUSAO: protocolo.criteriosExclusao.length > 0 || protocolo.semCriteriosExclusao,
    VISITA_PREVISTA: false,
  };
}

/** Requisitos ainda não atendidos, na ordem do quadro. */
export function calcularPendencias(
  protocolo: CriteriosProtocolo,
  coordenadorId: number | null,
): PendenciaRecrutamento[] {
  const atendidos = requisitosRecrutamento(protocolo, coordenadorId);
  return ORDEM_REQUISITOS.filter((codigo) => !atendidos[codigo]);
}
