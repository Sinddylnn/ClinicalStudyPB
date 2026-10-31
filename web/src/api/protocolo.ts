import { api } from './cliente';
import { servicoProtocoloSimulado } from './protocoloSimulado';

// <-------------------CONTRATO DO PROTOCOLO------------------->
// Contrato proposto para a T39 (backend ainda sem protocolo); conferir na integração.
// Campos e regras seguem docs/modelagem/RF05-RF07.md; as rotas e os DTOs saem no OpenAPI.
// Os critérios são textos avaliados pelo coordenador: o sistema não decide elegibilidade (RF05).

export type TipoCriterio = 'INCLUSAO' | 'EXCLUSAO';

export type Criterio = {
  id: number;
  descricao: string;
};

/**
 * O que ainda impede a passagem para Recrutamento (modelagem, seção 5; transição da T47).
 * COORDENADOR vem do estudo; VISITA_PREVISTA depende das visitas do protocolo (T46).
 */
export type PendenciaRecrutamento =
  | 'COORDENADOR'
  | 'CRITERIO_INCLUSAO'
  | 'CRITERIOS_EXCLUSAO'
  | 'VISITA_PREVISTA';

/** Protocolo do estudo (no máximo um por estudo). Sem protocolo, as listas vêm vazias. */
export type Protocolo = {
  estudoId: number;
  criteriosInclusao: Criterio[];
  criteriosExclusao: Criterio[];
  /** Declaração explícita de que o estudo não possui critérios de exclusão (modelagem, seção 3). */
  semCriteriosExclusao: boolean;
  pendenciasRecrutamento: PendenciaRecrutamento[];
};

/** Dados enviados em POST /estudos/{estudoId}/criterios. */
export type CriterioCadastroEntrada = {
  tipo: TipoCriterio;
  descricao: string;
};

export type ServicoProtocolo = {
  obter(estudoId: number): Promise<Protocolo>;
  adicionarCriterio(estudoId: number, entrada: CriterioCadastroEntrada): Promise<Criterio>;
  editarCriterio(estudoId: number, criterioId: number, descricao: string): Promise<Criterio>;
  removerCriterio(estudoId: number, criterioId: number): Promise<void>;
  definirSemExclusao(estudoId: number, semCriteriosExclusao: boolean): Promise<Protocolo>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend responde 404 para estudo inexistente ou de outro pesquisador (ou critério de outro
// protocolo) e 400 para: VALIDACAO_INVALIDA (descrição vazia ou acima de 1.000 caracteres),
// ESTUDO_FORA_DE_PLANEJAMENTO, EXCLUSAO_JA_DEFINIDA (declarar "sem exclusão" com exclusões
// cadastradas) e SEM_EXCLUSAO_DECLARADA (cadastrar exclusão com a declaração marcada)
export const servicoProtocoloApi: ServicoProtocolo = {
  async obter(estudoId) {
    const { data } = await api.get<Protocolo>(`/estudos/${estudoId}/protocolo`);
    return data;
  },
  async adicionarCriterio(estudoId, entrada) {
    const { data } = await api.post<Criterio>(`/estudos/${estudoId}/criterios`, entrada);
    return data;
  },
  async editarCriterio(estudoId, criterioId, descricao) {
    const { data } = await api.put<Criterio>(`/estudos/${estudoId}/criterios/${criterioId}`, { descricao });
    return data;
  },
  async removerCriterio(estudoId, criterioId) {
    await api.delete(`/estudos/${estudoId}/criterios/${criterioId}`);
  },
  async definirSemExclusao(estudoId, semCriteriosExclusao) {
    const { data } = await api.patch<Protocolo>(`/estudos/${estudoId}/protocolo`, { semCriteriosExclusao });
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão até a T39 publicar o protocolo no backend.
// Para usar o backend, definir VITE_PROTOCOLO_API=real no web/.env
export const servicoProtocolo: ServicoProtocolo =
  import.meta.env.VITE_PROTOCOLO_API === 'real' ? servicoProtocoloApi : servicoProtocoloSimulado;
