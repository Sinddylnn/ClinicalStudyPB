import { api } from './cliente';
import { servicoProtocoloSimulado } from './protocoloSimulado';

// <-------------------CONTRATO DO PROTOCOLO------------------->
// Segue o backend da main (PR #32 e commit 08d857a: critérios, visitas previstas e atividades) e
// docs/modelagem/RF05-RF07.md.
// Os critérios são textos avaliados pelo coordenador: o sistema não decide elegibilidade (RF05).

export type TipoCriterio = 'INCLUSAO' | 'EXCLUSAO';

export type Criterio = {
  id: number;
  descricao: string;
};

/** Item da checklist "Para iniciar o recrutamento" (modelagem, seção 5); a tela calcula a partir do protocolo. */
export type PendenciaRecrutamento =
  | 'COORDENADOR'
  | 'CRITERIO_INCLUSAO'
  | 'CRITERIOS_EXCLUSAO'
  | 'VISITA_PREVISTA';

/** AtividadePrevistaResposta: o que fazer na visita (modelagem, seção 2.4). */
export type AtividadePrevista = {
  id: number;
  descricao: string;
};

/** VisitaPrevistaResposta: modelo de visita do protocolo, sem participante nem data (seção 2.3). */
export type VisitaPrevista = {
  id: number;
  nome: string;
  /** null quando não foi informada. */
  descricao: string | null;
  /** Maior que zero e única no protocolo; intervalos (1, 3, 5) são válidos. */
  ordem: number;
  /** Na ordem de cadastro. */
  atividades: AtividadePrevista[];
};

/** Protocolo do estudo (no máximo um por estudo). Sem protocolo, as listas vêm vazias. */
export type Protocolo = {
  estudoId: number;
  criteriosInclusao: Criterio[];
  criteriosExclusao: Criterio[];
  /** Declaração explícita de que o estudo não possui critérios de exclusão (modelagem, seção 3). */
  semCriteriosExclusao: boolean;
  /** Em ordem crescente de `ordem`. */
  visitas: VisitaPrevista[];
};

/** Dados enviados em POST /estudos/{estudoId}/criterios e PUT /estudos/{estudoId}/criterios/{criterioId}. */
export type CriterioCadastroEntrada = {
  tipo: TipoCriterio;
  descricao: string;
};

/** VisitaPrevistaCadastroEntrada: nome de 1 a 150, descrição opcional até 1.000 e ordem positiva. */
export type VisitaPrevistaEntrada = {
  nome: string;
  descricao: string | null;
  ordem: number;
};

/** O que o backend em uso oferece além do cadastro e da consulta. */
export type RecursosProtocolo = {
  /** Edição e remoção de critérios, visitas e atividades; sem elas, a tela esconde os botões. */
  editarRemover: boolean;
};

export type ServicoProtocolo = {
  recursos: RecursosProtocolo;
  obter(estudoId: number): Promise<Protocolo>;
  adicionarCriterio(estudoId: number, entrada: CriterioCadastroEntrada): Promise<Criterio>;
  /** O backend exige o tipo também na edição (CriterioCadastroEntrada). */
  editarCriterio(estudoId: number, criterioId: number, entrada: CriterioCadastroEntrada): Promise<Criterio>;
  removerCriterio(estudoId: number, criterioId: number): Promise<void>;
  /** Devolve o valor gravado da declaração "sem critérios de exclusão". */
  definirSemExclusao(estudoId: number, semCriteriosExclusao: boolean): Promise<boolean>;
  adicionarVisita(estudoId: number, entrada: VisitaPrevistaEntrada): Promise<VisitaPrevista>;
  editarVisita(estudoId: number, visitaId: number, entrada: VisitaPrevistaEntrada): Promise<VisitaPrevista>;
  /** Remove a visita e as atividades dela na mesma operação (modelagem, seção 4.2). */
  removerVisita(estudoId: number, visitaId: number): Promise<void>;
  adicionarAtividade(estudoId: number, visitaId: number, descricao: string): Promise<AtividadePrevista>;
  editarAtividade(
    estudoId: number,
    visitaId: number,
    atividadeId: number,
    descricao: string,
  ): Promise<AtividadePrevista>;
  removerAtividade(estudoId: number, visitaId: number, atividadeId: number): Promise<void>;
};

// <-------------------SERVIÇO REAL------------------->
// Rotas do backend (CriterioController e VisitaPrevistaController):
// - GET /estudos/{id}/criterios e GET /estudos/{id}/criterios/exclusao ({ semCriteriosExclusao },
//   false quando o estudo ainda não tem protocolo); POST /estudos/{id}/criterios ({ tipo, descricao });
//   PUT /estudos/{id}/criterios/exclusao; PUT /estudos/{id}/criterios/{criterioId} ({ tipo, descricao });
//   DELETE /estudos/{id}/criterios/{criterioId} (204; remover a última exclusão não marca a declaração).
// - GET e POST /estudos/{id}/visitas; PUT e DELETE /estudos/{id}/visitas/{visitaId} (o DELETE remove
//   as atividades junto); POST /estudos/{id}/visitas/{visitaId}/atividades; PUT e DELETE
//   /estudos/{id}/visitas/{visitaId}/atividades/{atividadeId}.
// As consultas (GET) valem para o pesquisador responsável e o coordenador vinculado; as alterações,
// só para o pesquisador responsável e só em Planejamento.
// Erros: 404 para estudo de outro pesquisador, critério, visita ou atividade fora do estudo;
// 400 VALIDACAO_INVALIDA (errosCampos), ESTUDO_FORA_PLANEJAMENTO, ORDEM_VISITA_DUPLICADA (também na
// edição, ignorando a própria visita) e CRITERIOS_EXCLUSAO_INCONSISTENTES (declarar "sem exclusão"
// com exclusões cadastradas, ou cadastrar/editar uma exclusão com a declaração marcada).
type CriterioResposta = Criterio & { tipo: TipoCriterio };

export const servicoProtocoloApi: ServicoProtocolo = {
  recursos: { editarRemover: true },

  async obter(estudoId) {
    const [criterios, exclusao, visitas] = await Promise.all([
      api.get<CriterioResposta[]>(`/estudos/${estudoId}/criterios`),
      api.get<{ semCriteriosExclusao: boolean }>(`/estudos/${estudoId}/criterios/exclusao`),
      api.get<VisitaPrevista[]>(`/estudos/${estudoId}/visitas`),
    ]);
    const doTipo = (tipo: TipoCriterio) =>
      criterios.data.filter((c) => c.tipo === tipo).map(({ id, descricao }) => ({ id, descricao }));
    return {
      estudoId,
      criteriosInclusao: doTipo('INCLUSAO'),
      criteriosExclusao: doTipo('EXCLUSAO'),
      semCriteriosExclusao: exclusao.data.semCriteriosExclusao,
      visitas: visitas.data,
    };
  },
  async adicionarCriterio(estudoId, entrada) {
    const { data } = await api.post<CriterioResposta>(`/estudos/${estudoId}/criterios`, entrada);
    return { id: data.id, descricao: data.descricao };
  },
  async editarCriterio(estudoId, criterioId, entrada) {
    const { data } = await api.put<CriterioResposta>(`/estudos/${estudoId}/criterios/${criterioId}`, entrada);
    return { id: data.id, descricao: data.descricao };
  },
  async removerCriterio(estudoId, criterioId) {
    await api.delete(`/estudos/${estudoId}/criterios/${criterioId}`);
  },
  async definirSemExclusao(estudoId, semCriteriosExclusao) {
    const { data } = await api.put<{ semCriteriosExclusao: boolean }>(`/estudos/${estudoId}/criterios/exclusao`, {
      semCriteriosExclusao,
    });
    return data.semCriteriosExclusao;
  },
  async adicionarVisita(estudoId, entrada) {
    const { data } = await api.post<VisitaPrevista>(`/estudos/${estudoId}/visitas`, entrada);
    return data;
  },
  async editarVisita(estudoId, visitaId, entrada) {
    const { data } = await api.put<VisitaPrevista>(`/estudos/${estudoId}/visitas/${visitaId}`, entrada);
    return data;
  },
  // O backend remove as atividades junto
  async removerVisita(estudoId, visitaId) {
    await api.delete(`/estudos/${estudoId}/visitas/${visitaId}`);
  },
  async adicionarAtividade(estudoId, visitaId, descricao) {
    const { data } = await api.post<AtividadePrevista>(`/estudos/${estudoId}/visitas/${visitaId}/atividades`, {
      descricao,
    });
    return data;
  },
  async editarAtividade(estudoId, visitaId, atividadeId, descricao) {
    const { data } = await api.put<AtividadePrevista>(
      `/estudos/${estudoId}/visitas/${visitaId}/atividades/${atividadeId}`,
      { descricao },
    );
    return data;
  },
  async removerAtividade(estudoId, visitaId, atividadeId) {
    await api.delete(`/estudos/${estudoId}/visitas/${visitaId}/atividades/${atividadeId}`);
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado continua o padrão (dados fictícios, sem depender do backend).
// Para usar o backend, definir VITE_PROTOCOLO_API=real no web/.env
export const servicoProtocolo: ServicoProtocolo =
  import.meta.env.VITE_PROTOCOLO_API === 'real' ? servicoProtocoloApi : servicoProtocoloSimulado;
