import { api } from './cliente';
import { servicoPainelSimulado } from './painelSimulado';

// <-------------------CONTRATO DO PAINEL DE INDICADORES (RF21)------------------->
// Proposta para a Task 4061 (contagens do painel no backend): GET /estudos/{estudoId}/painel.
// Regras do Kickoff (seção 8.5) e do planejamento da Sprint 4:
// - incluídos é o total histórico, contando quem foi retirado depois; ativos e retirados mostram a situação atual;
// - pendente é visita AGENDADA, mesmo com a data já passada; ausências e cancelamentos não entram;
// - coordenador vinculado e pesquisador responsável consultam; estudo fora do vínculo responde 404.
// O relatório em PDF (RF22, Task 4062) usa as mesmas contagens e permissões.

/** Devolvido em GET /estudos/{estudoId}/painel. */
export type PainelEstudo = {
  estudoId: number;
  /** Todos os candidatos registrados no recrutamento do estudo (RF08). */
  candidatosCadastrados: number;
  /** Total histórico de inclusões (RF11), inclusive de quem saiu depois. */
  participantesIncluidos: number;
  /** Participações ATIVA. */
  participantesAtivos: number;
  /** Participações RETIRADA (RF16). */
  participantesRetirados: number;
  /** Visitas REALIZADA (RF13). */
  visitasRealizadas: number;
  /** Visitas AGENDADA, inclusive com a data já passada. */
  visitasPendentes: number;
};

export type ServicoPainel = {
  consultar(estudoId: number): Promise<PainelEstudo>;
};

// <-------------------SERVIÇO REAL------------------->
// Somente leitura, sem CSRF. Erros: 404 para estudo fora do vínculo da sessão e 403 para perfil sem acesso
export const servicoPainelApi: ServicoPainel = {
  async consultar(estudoId) {
    const { data } = await api.get<PainelEstudo>(`/estudos/${estudoId}/painel`);
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado continua como padrão até a integração com a Task 4061.
// Para usar o backend, definir VITE_PAINEL_API=real no web/.env
const usaBackend = import.meta.env.VITE_PAINEL_API === 'real';

export const servicoPainel: ServicoPainel = usaBackend ? servicoPainelApi : servicoPainelSimulado;
