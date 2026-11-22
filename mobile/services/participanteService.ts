import { requisitar } from './authService';

// ---------- Estudos (#3952) ----------

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

// ---------- Visitas (#3953) ----------

export type SituacaoVisita = 'AGENDADA' | 'REALIZADA' | 'AUSENTE' | 'CANCELADA';

// Formato usado pela tela
export type VisitaParticipante = {
  id: number;
  estudoTitulo: string;
  titulo: string; // nome da visita prevista
  dataHora: string; // instante ISO com Z; a tela formata no fuso America/Recife
  situacao: SituacaoVisita;
};

// Campos de ProximaVisitaParticipanteResposta e HistoricoVisitaParticipanteResposta
type VisitaApi = {
  visitaAgendadaId: number;
  estudoId: number;
  tituloEstudo: string;
  nomeVisita: string;
  dataHora: string;
  situacao?: SituacaoVisita; // só o histórico devolve
};

// As próximas visitas não trazem situação: a rota só devolve visitas AGENDADA
function paraVisita(d: VisitaApi): VisitaParticipante {
  return {
    id: d.visitaAgendadaId,
    estudoTitulo: d.tituloEstudo,
    titulo: d.nomeVisita,
    dataHora: d.dataHora,
    situacao: d.situacao ?? 'AGENDADA',
  };
}

async function listarVisitas(caminho: string): Promise<VisitaParticipante[]> {
  const res = await requisitar(caminho); // 401 volta o app ao login
  if (!res.ok) throw new Error('Falha ao listar as visitas.');
  const dados: VisitaApi[] = await res.json();
  return dados.map(paraVisita);
}

// GET /participante/visitas/proximas e /historico: o servidor usa a sessão
export const listarProximasVisitas = () => listarVisitas('/participante/visitas/proximas');
export const listarHistoricoVisitas = () => listarVisitas('/participante/visitas/historico');