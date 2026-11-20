import { requisitar } from './authService';

export type SituacaoParticipacao = 'ATIVA' | 'RETIRADA';

// Campos de ParticipanteEstudoResposta
export type EstudoParticipante = {
  estudoId: number;
  titulo: string;
  objetivo: string;
  estado: string; // estado do estudo
  dataInicio: string; // AAAA-MM-DD
  dataFim: string; // AAAA-MM-DD
  situacaoParticipacao: SituacaoParticipacao;
};

// GET /participante/estudos: o servidor identifica o participante pela sessão
export async function listarEstudos(): Promise<EstudoParticipante[]> {
  const res = await requisitar('/participante/estudos'); // 401 volta o app ao login
  if (!res.ok) throw new Error('Falha ao listar os estudos.');
  return res.json();
}