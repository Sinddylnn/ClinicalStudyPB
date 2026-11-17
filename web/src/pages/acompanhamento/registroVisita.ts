import type { ResumoVisitaAgendada, SituacaoFinal, SituacaoVisita } from '../../api/acompanhamento';
import { diaRecife } from './agendamento';

// <-------------------REGISTRO DA SITUAÇÃO DA VISITA (RF13)------------------->
// Mesmas regras do VisitaAgendadaService (PR #46), para a tela oferecer só o que o backend aceita e o
// serviço simulado responder igual. As mensagens são as do backend

/** Limite do motivo e da justificativa, depois de tirar os espaços das pontas. */
export const LIMITE_TEXTO_VISITA = 500;

/** Ordem em que as situações finais aparecem nas ações e no seletor da correção. */
export const SITUACOES_FINAIS: SituacaoFinal[] = ['REALIZADA', 'AUSENTE', 'CANCELADA'];

export const MENSAGENS_REGISTRO = {
  motivoObrigatorio: 'Informe o motivo do cancelamento.',
  motivoProibido: 'Uma visita realizada não deve ter motivo.',
  motivoLongo: `O motivo deve ter no máximo ${LIMITE_TEXTO_VISITA} caracteres.`,
  justificativaVazia: 'Informe a justificativa da correção.',
  justificativaLonga: `A justificativa deve ter no máximo ${LIMITE_TEXTO_VISITA} caracteres.`,
  visitaFutura: 'A visita ainda não pode ser registrada.',
} as const;

export type RegraMotivo = 'obrigatorio' | 'opcional' | 'proibido';

/** Motivo obrigatório no cancelamento, opcional na ausência e proibido na realização. */
export function regraMotivo(situacao: SituacaoFinal): RegraMotivo {
  if (situacao === 'CANCELADA') return 'obrigatorio';
  if (situacao === 'AUSENTE') return 'opcional';
  return 'proibido';
}

/** Motivo aparado, ou null quando fica vazio (o backend faz o mesmo). */
export function apararMotivo(motivo: string | null | undefined): string | null {
  const aparado = motivo?.trim() ?? '';
  return aparado || null;
}

/** Confere o motivo para a situação; undefined quando está certo. */
export function erroMotivoVisita(situacao: SituacaoFinal, motivo: string | null | undefined): string | undefined {
  const aparado = apararMotivo(motivo);
  const regra = regraMotivo(situacao);
  if (regra === 'obrigatorio' && !aparado) return MENSAGENS_REGISTRO.motivoObrigatorio;
  if (regra === 'proibido' && aparado) return MENSAGENS_REGISTRO.motivoProibido;
  if (aparado && aparado.length > LIMITE_TEXTO_VISITA) return MENSAGENS_REGISTRO.motivoLongo;
  return undefined;
}

/** A justificativa da correção tem de 1 a 500 caracteres depois de aparar. */
export function erroJustificativa(justificativa: string | null | undefined): string | undefined {
  const aparada = justificativa?.trim() ?? '';
  if (!aparada) return MENSAGENS_REGISTRO.justificativaVazia;
  if (aparada.length > LIMITE_TEXTO_VISITA) return MENSAGENS_REGISTRO.justificativaLonga;
  return undefined;
}

/** Realização e ausência só a partir do dia da visita (inclusive), no fuso de Recife. */
export function diaChegou(dataHora: string, hoje: string): boolean {
  return diaRecife(dataHora) <= hoje;
}

/** A data permite a situação: o cancelamento vale a qualquer momento. */
export function dataPermite(situacao: SituacaoFinal, dataHora: string, hoje: string): boolean {
  return situacao === 'CANCELADA' || diaChegou(dataHora, hoje);
}

type VisitaRegistro = Pick<ResumoVisitaAgendada, 'situacao' | 'dataHora'>;

/** Situações que uma visita AGENDADA pode receber hoje; vazio para visita já registrada. */
export function situacoesRegistraveis(visita: VisitaRegistro, hoje: string): SituacaoFinal[] {
  if (visita.situacao !== 'AGENDADA') return [];
  return SITUACOES_FINAIS.filter((s) => dataPermite(s, visita.dataHora, hoje));
}

/**
 * Situações para as quais uma visita registrada pode ser corrigida hoje: outra situação final, nunca
 * AGENDADA. Uma visita cancelada antes do dia agendado ainda não tem para onde ser corrigida.
 */
export function situacoesCorrigiveis(visita: VisitaRegistro, hoje: string): SituacaoFinal[] {
  if (visita.situacao === 'AGENDADA') return [];
  return SITUACOES_FINAIS.filter((s) => s !== visita.situacao && dataPermite(s, visita.dataHora, hoje));
}

/** Explica por que a correção está bloqueada pela própria visita; undefined quando não está. */
export function motivoCorrecaoBloqueada(visita: Pick<ResumoVisitaAgendada, 'possuiResultados'>): string | undefined {
  return visita.possuiResultados
    ? 'Correção bloqueada: a visita já tem resultados registrados.'
    : undefined;
}

/** Situação final como aparece nas mensagens ("registrada como realizada"). */
export const NOMES_SITUACAO_MINUSCULO: Record<SituacaoVisita, string> = {
  AGENDADA: 'agendada',
  REALIZADA: 'realizada',
  AUSENTE: 'ausente',
  CANCELADA: 'cancelada',
};
