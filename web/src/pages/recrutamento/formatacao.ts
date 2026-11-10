import type { Candidato, Consentimento, Elegibilidade } from '../../api/candidatos';
import { formatarData } from '../estudos/formatacao';

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

// Mesmo fuso que o backend usa para a data da inclusão (CandidatoResposta)
const FUSO_ESTUDOS = 'America/Recife';

const HORARIO_LOCAL = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO_ESTUDOS,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * "27/10/2026 às 14:32". Com fuso (Instant do backend, ex.: "2026-10-27T17:32:00Z"), converte para o
 * horário de Recife; sem fuso ("2026-10-27T14:32:00"), o horário já é local e só muda o formato.
 */
export function formatarDataHora(iso: string): string {
  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(iso)) {
    const partes = Object.fromEntries(HORARIO_LOCAL.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
    return `${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`;
  }
  const [data, hora = ''] = iso.split('T');
  return `${formatarData(data)} às ${hora.slice(0, 5)}`;
}

/**
 * Ação que o coordenador faz em seguida com o candidato (coluna "Próxima etapa").
 * "tela" é o último trecho do endereço da etapa, dentro de /candidatos/:candidatoId.
 */
export type ProximaEtapa = { texto: string; principal?: boolean; tela: 'elegibilidade' | 'consentimento' | 'inclusao' };

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
      if (candidato.consentimento === 'ACEITOU') return { texto: 'Incluir', principal: true, tela: 'inclusao' };
      if (candidato.consentimento === 'RECUSOU') return { texto: 'Ver bloqueio', tela: 'inclusao' };
      return { texto: 'Registrar consentimento', tela: 'consentimento' };
  }
}
