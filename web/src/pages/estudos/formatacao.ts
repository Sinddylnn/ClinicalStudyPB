import type { EstadoEstudo } from '../../api/estudos';

// <-------------------EXIBIÇÃO DE ESTUDOS------------------->
export const NOMES_ESTADO: Record<EstadoEstudo, string> = {
  PLANEJAMENTO: 'Planejamento',
  RECRUTAMENTO: 'Recrutamento',
  EXECUCAO: 'Execução',
  ENCERRADO: 'Encerrado',
};

/** Converte AAAA-MM-DD em DD/MM/AAAA sem passar por Date, para não variar com o fuso. */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Período no formato do protótipo: 03/11/2026 – 28/02/2027. */
export function formatarPeriodo(inicio: string, fim: string): string {
  return `${formatarData(inicio)} – ${formatarData(fim)}`;
}
