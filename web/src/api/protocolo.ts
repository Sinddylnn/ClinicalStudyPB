import { api } from './cliente';
import { servicoProtocoloSimulado } from './protocoloSimulado';

// <-------------------CONTRATO DO PROTOCOLO------------------->
// Segue o PR #32 (T39/T40: critérios, visitas previstas e atividades) e docs/modelagem/RF05-RF07.md.
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

/** Dados enviados em POST /estudos/{estudoId}/criterios. */
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
  editarCriterio(estudoId: number, criterioId: number, descricao: string): Promise<Criterio>;
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
// Rotas do PR #32: GET e POST /estudos/{id}/criterios, PUT /estudos/{id}/criterios/exclusao,
// GET e POST /estudos/{id}/visitas e POST /estudos/{id}/visitas/{visitaId}/atividades.
// Só o pesquisador responsável e só em Planejamento. Erros: 404 para estudo de outro pesquisador
// ou visita de outro protocolo; 400 VALIDACAO_INVALIDA (errosCampos), ESTUDO_FORA_PLANEJAMENTO,
// ORDEM_VISITA_DUPLICADA e CRITERIOS_EXCLUSAO_INCONSISTENTES (declarar "sem exclusão" com exclusões).
//
// A confirmar com o backend: PUT e DELETE de critério, visita e atividade não existem no PR #32.
// As chamadas abaixo seguem as rotas propostas, mas recursos.editarRemover fica false: a segurança
// do backend nega qualquer rota não publicada com 403, e o cliente trata esse 403 levando à página
// de acesso negado antes de a tela poder mostrar um erro.
//
// Também depende do backend: não há GET do semCriteriosExclusao (proposta: GET
// /estudos/{id}/criterios/exclusao ou o campo na listagem). Pelo mesmo motivo do 403, a rota não é
// chamada; o valor começa false ao carregar e passa a seguir o que o PUT devolver.
type CriterioResposta = Criterio & { tipo: TipoCriterio };

export const servicoProtocoloApi: ServicoProtocolo = {
  recursos: { editarRemover: false },

  async obter(estudoId) {
    const [criterios, visitas] = await Promise.all([
      api.get<CriterioResposta[]>(`/estudos/${estudoId}/criterios`),
      api.get<VisitaPrevista[]>(`/estudos/${estudoId}/visitas`),
    ]);
    const doTipo = (tipo: TipoCriterio) =>
      criterios.data.filter((c) => c.tipo === tipo).map(({ id, descricao }) => ({ id, descricao }));
    return {
      estudoId,
      criteriosInclusao: doTipo('INCLUSAO'),
      criteriosExclusao: doTipo('EXCLUSAO'),
      semCriteriosExclusao: false,
      visitas: visitas.data,
    };
  },
  async adicionarCriterio(estudoId, entrada) {
    const { data } = await api.post<CriterioResposta>(`/estudos/${estudoId}/criterios`, entrada);
    return { id: data.id, descricao: data.descricao };
  },
  // A confirmar com o backend
  async editarCriterio(estudoId, criterioId, descricao) {
    const { data } = await api.put<Criterio>(`/estudos/${estudoId}/criterios/${criterioId}`, { descricao });
    return data;
  },
  // A confirmar com o backend
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
  // A confirmar com o backend
  async editarVisita(estudoId, visitaId, entrada) {
    const { data } = await api.put<VisitaPrevista>(`/estudos/${estudoId}/visitas/${visitaId}`, entrada);
    return data;
  },
  // A confirmar com o backend: remove as atividades junto
  async removerVisita(estudoId, visitaId) {
    await api.delete(`/estudos/${estudoId}/visitas/${visitaId}`);
  },
  async adicionarAtividade(estudoId, visitaId, descricao) {
    const { data } = await api.post<AtividadePrevista>(`/estudos/${estudoId}/visitas/${visitaId}/atividades`, {
      descricao,
    });
    return data;
  },
  // A confirmar com o backend
  async editarAtividade(estudoId, visitaId, atividadeId, descricao) {
    const { data } = await api.put<AtividadePrevista>(
      `/estudos/${estudoId}/visitas/${visitaId}/atividades/${atividadeId}`,
      { descricao },
    );
    return data;
  },
  // A confirmar com o backend
  async removerAtividade(estudoId, visitaId, atividadeId) {
    await api.delete(`/estudos/${estudoId}/visitas/${visitaId}/atividades/${atividadeId}`);
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão até o PR #32 entrar na main.
// Para usar o backend, definir VITE_PROTOCOLO_API=real no web/.env
export const servicoProtocolo: ServicoProtocolo =
  import.meta.env.VITE_PROTOCOLO_API === 'real' ? servicoProtocoloApi : servicoProtocoloSimulado;
