import type { Participacao } from '../../api/acompanhamento';
import type { Estudo } from '../../api/estudos';
import { estadoPermiteAgendamento } from './agendamento';

// <-------------------RETIRADA DO PARTICIPANTE (RF16)------------------->
/** Limite do motivo, depois de tirar os espaços das pontas (modelagem RF12 a RF18, seção 2). */
export const LIMITE_MOTIVO_RETIRADA = 500;

/** Motivo automático das visitas agendadas que a retirada cancela (modelagem, seção 3.5). */
export const MOTIVO_CANCELAMENTO_RETIRADA = 'Retirada do participante';

/** Regra do motivo no backend: de 1 a 500 caracteres depois de aparar. */
export function erroMotivoRetirada(motivo: string): string | undefined {
  const aparado = motivo.trim();
  if (!aparado) return 'Informe o motivo da retirada.';
  if (aparado.length > LIMITE_MOTIVO_RETIRADA) return `O motivo pode ter até ${LIMITE_MOTIVO_RETIRADA} caracteres.`;
  return undefined;
}

/** A retirada vale para participação ativa, com o estudo em Recrutamento ou Execução (modelagem, seção 5). */
export function podeRetirar(estudo: Pick<Estudo, 'estado'>, participacao: Pick<Participacao, 'situacao'>): boolean {
  return estadoPermiteAgendamento(estudo) && participacao.situacao === 'ATIVA';
}
