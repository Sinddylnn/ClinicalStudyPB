import type { Elegibilidade, ItemAvaliacao, RespostaCriterio } from '../../api/candidatos';
import type { TipoCriterio } from '../../api/protocolo';

// <-------------------REGRAS DA ELEGIBILIDADE (RF09)------------------->
// Mesmas regras usadas pelo serviço simulado, para a tela e o "backend" concordarem.
// Sem cálculo clínico: o sistema só aplica o que o coordenador marcou em cada critério.

/** As duas respostas de cada tipo, na ordem dos botões do protótipo (a primeira é a favorável). */
export const OPCOES_RESPOSTA: Record<TipoCriterio, [RespostaCriterio, RespostaCriterio]> = {
  INCLUSAO: ['ATENDIDO', 'NAO_ATENDIDO'],
  EXCLUSAO: ['AUSENTE', 'PRESENTE'],
};

export const NOMES_RESPOSTA: Record<RespostaCriterio, string> = {
  ATENDIDO: 'Atendido',
  NAO_ATENDIDO: 'Não atendido',
  AUSENTE: 'Ausente',
  PRESENTE: 'Presente',
};

/** Contagens do quadro "Resultado da avaliação". */
export type ResumoAvaliacao = {
  inclusaoTotal: number;
  inclusaoAtendidos: number;
  inclusaoNaoAtendidos: number;
  exclusaoTotal: number;
  exclusaoPresentes: number;
  semResposta: number;
};

export function resumirAvaliacao(itens: Pick<ItemAvaliacao, 'tipo' | 'resposta'>[]): ResumoAvaliacao {
  const inclusao = itens.filter((i) => i.tipo === 'INCLUSAO');
  const exclusao = itens.filter((i) => i.tipo === 'EXCLUSAO');
  return {
    inclusaoTotal: inclusao.length,
    inclusaoAtendidos: inclusao.filter((i) => i.resposta === 'ATENDIDO').length,
    inclusaoNaoAtendidos: inclusao.filter((i) => i.resposta === 'NAO_ATENDIDO').length,
    exclusaoTotal: exclusao.length,
    exclusaoPresentes: exclusao.filter((i) => i.resposta === 'PRESENTE').length,
    semResposta: itens.filter((i) => i.resposta === null).length,
  };
}

/**
 * Nenhuma resposta: não avaliado. Algum critério sem resposta: incompleta, mesmo que outro já
 * reprove. Tudo respondido: elegível só com todos de inclusão atendidos e nenhum de exclusão presente.
 */
export function calcularElegibilidade(itens: Pick<ItemAvaliacao, 'tipo' | 'resposta'>[]): Elegibilidade {
  const resumo = resumirAvaliacao(itens);
  if (resumo.semResposta === itens.length) return 'NAO_AVALIADO';
  if (resumo.semResposta > 0) return 'INCOMPLETA';
  return resumo.inclusaoNaoAtendidos === 0 && resumo.exclusaoPresentes === 0 ? 'ELEGIVEL' : 'INELEGIVEL';
}

/** Confere se a resposta combina com o tipo do critério (ex.: PRESENTE só em exclusão). */
export function respostaValida(tipo: TipoCriterio, resposta: RespostaCriterio | null): boolean {
  return resposta === null || OPCOES_RESPOSTA[tipo].includes(resposta);
}
