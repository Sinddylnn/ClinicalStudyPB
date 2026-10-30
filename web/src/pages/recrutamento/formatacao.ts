import type { Candidato, Consentimento, Elegibilidade } from '../../api/candidatos';

// <-------------------EXIBIÇÃO DE CANDIDATOS------------------->
// Textos e cores das etiquetas do protótipo (Coordenador – Recrutamento)
export const NOMES_ELEGIBILIDADE: Record<Elegibilidade, string> = {
  NAO_AVALIADO: 'Não avaliado',
  INCOMPLETA: 'Incompleta',
  ELEGIVEL: 'Elegível',
  INELEGIVEL: 'Inelegível',
};

export const NOMES_CONSENTIMENTO: Record<Consentimento, string> = {
  PENDENTE: 'Pendente',
  ACEITOU: 'Aceitou',
  RECUSOU: 'Recusou',
};

/**
 * Ação que o coordenador faz em seguida com o candidato (coluna "Próxima etapa").
 * "elegibilidade" indica que a etapa abre a avaliação; as demais telas chegam nas próximas tasks.
 */
export type ProximaEtapa = { texto: string; principal?: boolean; tela?: 'elegibilidade' };

export function proximaEtapa(candidato: Candidato): ProximaEtapa | null {
  if (candidato.dataInclusao) return null;
  switch (candidato.elegibilidade) {
    case 'NAO_AVALIADO':
      return { texto: 'Avaliar', tela: 'elegibilidade' };
    case 'INCOMPLETA':
      return { texto: 'Continuar avaliação', tela: 'elegibilidade' };
    case 'INELEGIVEL':
      return { texto: 'Rever avaliação', tela: 'elegibilidade' };
    case 'ELEGIVEL':
      if (candidato.consentimento === 'ACEITOU') return { texto: 'Incluir', principal: true };
      if (candidato.consentimento === 'RECUSOU') return { texto: 'Ver bloqueio' };
      return { texto: 'Registrar consentimento' };
  }
}
