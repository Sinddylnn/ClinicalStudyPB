import type { ItemHistorico, SituacaoParticipacao, SituacaoVisita } from '../../api/acompanhamento';

// <-------------------EXIBIÇÃO DO HISTÓRICO------------------->
export const NOMES_SITUACAO_VISITA: Record<SituacaoVisita, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  AUSENTE: 'Ausente',
  CANCELADA: 'Cancelada',
};

export const NOMES_SITUACAO_PARTICIPACAO: Record<SituacaoParticipacao, string> = {
  ATIVA: 'Incluído',
  RETIRADA: 'Retirado',
};

/** Nome de quem registrou; enquanto o backend só manda o ID, "Usuário nº {id}". */
export function nomeResponsavel(id: number, nome?: string | null): string {
  return nome?.trim() || `Usuário nº ${id}`;
}

/**
 * Visitas em ordem cronológica e a retirada sempre como último evento (RF15). As visitas
 * canceladas pela retirada podem ter data posterior a ela, mas continuam antes no histórico.
 * Empate de data mantém a ordem recebida do backend.
 */
export function ordenarHistorico(itens: ItemHistorico[]): ItemHistorico[] {
  const visitas = itens.filter((i) => i.tipo === 'VISITA');
  const retiradas = itens.filter((i) => i.tipo === 'RETIRADA');
  const ordenadas = [...visitas].sort((a, b) => Date.parse(a.dataHora) - Date.parse(b.dataHora));
  return [...ordenadas, ...retiradas];
}
