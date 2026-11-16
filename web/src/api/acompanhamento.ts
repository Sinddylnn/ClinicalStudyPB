import { api } from './cliente';
import { servicoAcompanhamentoSimulado } from './acompanhamentoSimulado';

// <-------------------CONTRATO DE ACOMPANHAMENTO------------------->
// Segue o rascunho do contrato da Sprint 3 (docs/api/acompanhamento-de-participantes.md).
// A lista de participações, o agendamento e o reagendamento seguem o PR #41 (task 3964). As demais
// rotas ainda não existem no backend: conferir campos e códigos quando forem implementadas.

/** Situação da participação no estudo: a retirada é irreversível (RF16). */
export type SituacaoParticipacao = 'ATIVA' | 'RETIRADA';

/** Item de GET /estudos/{estudoId}/participacoes: participantes incluídos, inclusive os retirados. */
export type Participacao = {
  id: number;
  participanteId: number;
  participanteNome: string;
  /** Data e hora da inclusão (Instant, ISO 8601). */
  dataInclusao: string;
  situacao: SituacaoParticipacao;
  /** Só na participação retirada. */
  dataRetirada?: string | null;
};

/** Situação de uma visita agendada (RF13). */
export type SituacaoVisita = 'AGENDADA' | 'REALIZADA' | 'AUSENTE' | 'CANCELADA';

/** Resultado fictício de uma atividade prevista (RF14). */
export type ResultadoHistorico = {
  atividadePrevistaId: number;
  descricaoAtividade: string;
  texto: string;
};

/** Correção de uma situação final, guardada sem apagar o registro anterior. */
export type CorrecaoVisita = {
  situacaoAnterior: SituacaoVisita;
  situacaoNova: SituacaoVisita;
  justificativa: string;
  corrigidaPorId: number;
  corrigidaPorNome?: string;
  corrigidaEm: string;
};

export type ItemHistoricoVisita = {
  tipo: 'VISITA';
  visitaAgendadaId: number;
  nomeVisita: string;
  /** Data e hora agendadas (Instant, ISO 8601). */
  dataHora: string;
  situacao: SituacaoVisita;
  /** Motivo da ausência ou do cancelamento; null quando não há. */
  motivo: string | null;
  /** Quem registrou a situação; null enquanto a visita está agendada. */
  registradoPorId: number | null;
  /**
   * Nome de quem registrou. O rascunho do contrato só traz o ID: o campo opcional já está pronto
   * para quando o backend devolver o nome. Sem ele, a tela mostra "Usuário nº {id}".
   */
  registradoPorNome?: string | null;
  registradoEm: string | null;
  resultados: ResultadoHistorico[];
  correcoes: CorrecaoVisita[];
};

export type ItemHistoricoRetirada = {
  tipo: 'RETIRADA';
  dataRetirada: string;
  motivo: string;
  retiradaPorId: number;
  retiradaPorNome?: string | null;
};

export type ItemHistorico = ItemHistoricoVisita | ItemHistoricoRetirada;

/** Devolvido em GET /estudos/{estudoId}/participacoes/{participacaoId}/historico (RF15). */
export type HistoricoParticipacao = {
  participacaoId: number;
  itens: ItemHistorico[];
};

// <-------------------RESULTADOS DAS AVALIAÇÕES (RF14)------------------->
/** Visita agendada como o contrato devolve no agendamento e no registro da situação. */
export type VisitaAgendada = {
  id: number;
  participacaoId: number;
  /** Visita do protocolo: as atividades dela são as avaliações que recebem resultado. */
  visitaPrevistaId: number;
  nomeVisita: string;
  dataHora: string;
  situacao: SituacaoVisita;
  motivo: string | null;
  registradoPorId: number | null;
  registradoEm: string | null;
};

/** Resultado fictício de uma atividade prevista, com quem registrou e quem editou por último. */
export type ResultadoAtividade = {
  id: number;
  visitaAgendadaId: number;
  atividadePrevistaId: number;
  descricaoAtividade: string;
  texto: string;
  registradoPorId: number;
  registradoEm: string;
  atualizadoPorId: number | null;
  atualizadoEm: string | null;
};

/** Dados enviados em POST .../resultados: no máximo um resultado por atividade em cada visita. */
export type ResultadoEntrada = {
  atividadePrevistaId: number;
  texto: string;
};

// <-------------------AGENDAMENTO DE VISITAS (RF12)------------------->
/** Dados enviados em POST .../visitas (VisitaAgendadaCadastroEntrada do backend). */
export type VisitaAgendadaEntrada = {
  visitaPrevistaId: number;
  /** Data e hora da visita (Instant, ISO 8601 em UTC). */
  dataHora: string;
};

/** Dados enviados em PUT .../visitas/{visitaAgendadaId} (VisitaAgendadaReagendamentoEntrada do backend). */
export type ReagendamentoEntrada = {
  dataHora: string;
};

/**
 * Visita agendada como a tela de agendamento lista. Só usa campos que o item do histórico também traz:
 * o histórico do contrato não devolve o visitaPrevistaId, que o reagendamento não precisa.
 */
export type ResumoVisitaAgendada = Pick<VisitaAgendada, 'id' | 'nomeVisita' | 'dataHora' | 'situacao'>;

// <-------------------RETIRADA DO PARTICIPANTE (RF16)------------------->
/** Dados enviados em POST .../retirada: motivo de 1 a 500 caracteres depois de aparar. */
export type RetiradaEntrada = {
  motivo: string;
};

/** Resposta 200 da retirada, como no rascunho do contrato. */
export type RetiradaParticipacao = {
  participacaoId: number;
  situacao: 'RETIRADA';
  dataRetirada: string;
  motivoRetirada: string;
  retiradaPorId: number;
};

export type ServicoAcompanhamento = {
  listarParticipacoes(estudoId: number): Promise<Participacao[]>;
  obterHistorico(estudoId: number, participacaoId: number): Promise<HistoricoParticipacao>;
  /**
   * Visitas agendadas da participação, em qualquer situação. Não há rota própria no backend: vem do
   * histórico (RF15). Só deve ser chamada quando recursosAcompanhamento.historico for verdadeiro.
   */
  listarVisitas(estudoId: number, participacaoId: number): Promise<ResumoVisitaAgendada[]>;
  agendarVisita(estudoId: number, participacaoId: number, entrada: VisitaAgendadaEntrada): Promise<VisitaAgendada>;
  reagendarVisita(
    estudoId: number,
    participacaoId: number,
    visitaAgendadaId: number,
    entrada: ReagendamentoEntrada,
  ): Promise<VisitaAgendada>;
  /**
   * GET .../visitas/{visitaAgendadaId}. Não está no rascunho do contrato: a tela de resultados
   * precisa da visita prevista e da situação. Pedido ao backend junto com a listagem abaixo.
   */
  obterVisita(estudoId: number, participacaoId: number, visitaAgendadaId: number): Promise<VisitaAgendada>;
  /** GET .../visitas/{visitaAgendadaId}/resultados. Também fora do rascunho: traz os IDs para a edição. */
  listarResultados(estudoId: number, participacaoId: number, visitaAgendadaId: number): Promise<ResultadoAtividade[]>;
  registrarResultado(
    estudoId: number,
    participacaoId: number,
    visitaAgendadaId: number,
    entrada: ResultadoEntrada,
  ): Promise<ResultadoAtividade>;
  editarResultado(
    estudoId: number,
    participacaoId: number,
    visitaAgendadaId: number,
    resultadoId: number,
    texto: string,
  ): Promise<ResultadoAtividade>;
  /**
   * POST .../retirada (RF16), irreversível. Só deve ser chamada quando recursosAcompanhamento.retirada
   * for verdadeiro: a rota ainda não existe no backend.
   */
  retirarParticipante(estudoId: number, participacaoId: number, entrada: RetiradaEntrada): Promise<RetiradaParticipacao>;
};

const caminhoVisitas = (estudoId: number, participacaoId: number) =>
  `/estudos/${estudoId}/participacoes/${participacaoId}/visitas`;

const caminhoVisita = (estudoId: number, participacaoId: number, visitaAgendadaId: number) =>
  `/estudos/${estudoId}/participacoes/${participacaoId}/visitas/${visitaAgendadaId}`;

// <-------------------SERVIÇO REAL------------------->
// Pesquisador responsável e coordenador vinculado consultam, inclusive com o estudo encerrado ou a
// participação retirada. 404 para estudo ou participação fora do vínculo, sem revelar se existem
export const servicoAcompanhamentoApi: ServicoAcompanhamento = {
  async listarParticipacoes(estudoId) {
    const { data } = await api.get<Participacao[]>(`/estudos/${estudoId}/participacoes`);
    return data;
  },
  async obterHistorico(estudoId, participacaoId) {
    const { data } = await api.get<HistoricoParticipacao>(
      `/estudos/${estudoId}/participacoes/${participacaoId}/historico`,
    );
    return data;
  },
  // Deriva as visitas dos itens do histórico, já que o PR #41 não tem rota que as liste
  async listarVisitas(estudoId, participacaoId) {
    const { itens } = await servicoAcompanhamentoApi.obterHistorico(estudoId, participacaoId);
    return itens
      .filter((item): item is ItemHistoricoVisita => item.tipo === 'VISITA')
      .map((v) => ({ id: v.visitaAgendadaId, nomeVisita: v.nomeVisita, dataHora: v.dataHora, situacao: v.situacao }));
  },
  // Só o coordenador vinculado, com CSRF (PR #41). 400 VALIDACAO_INVALIDA (errosCampos visitaPrevistaId
  // ou dataHora), ESTADO_ESTUDO_INVALIDO (estudo fora de recrutamento ou execução), PARTICIPACAO_INVALIDA
  // (participação retirada) e DATA_VISITA_INVALIDA (dia anterior a hoje ou fora do período, no fuso de
  // Recife); 404 RECURSO_NAO_ENCONTRADO (estudo, participação ou visita prevista fora do vínculo);
  // 409 VISITA_JA_AGENDADA (já existe visita AGENDADA para a mesma participação e visita prevista)
  async agendarVisita(estudoId, participacaoId, entrada) {
    const { data } = await api.post<VisitaAgendada>(caminhoVisitas(estudoId, participacaoId), entrada);
    return data;
  },
  // Mesmos códigos do agendamento, sem o 409, e 400 TRANSICAO_VISITA_INVALIDA para visita que não está
  // AGENDADA. A visita continua com o mesmo ID e a mesma visita prevista
  async reagendarVisita(estudoId, participacaoId, visitaAgendadaId, entrada) {
    const { data } = await api.put<VisitaAgendada>(caminhoVisita(estudoId, participacaoId, visitaAgendadaId), entrada);
    return data;
  },
  async obterVisita(estudoId, participacaoId, visitaAgendadaId) {
    const { data } = await api.get<VisitaAgendada>(caminhoVisita(estudoId, participacaoId, visitaAgendadaId));
    return data;
  },
  async listarResultados(estudoId, participacaoId, visitaAgendadaId) {
    const { data } = await api.get<ResultadoAtividade[]>(
      `${caminhoVisita(estudoId, participacaoId, visitaAgendadaId)}/resultados`,
    );
    return data;
  },
  // Só em visita REALIZADA, pelo coordenador vinculado e com CSRF. 400 RESULTADO_INVALIDO (visita não
  // realizada ou atividade de outra visita), VALIDACAO_INVALIDA (texto vazio ou acima de 1.000 caracteres)
  // e ESTADO_ESTUDO_INVALIDO (estudo encerrado); 409 RESULTADO_JA_REGISTRADO para a mesma atividade
  async registrarResultado(estudoId, participacaoId, visitaAgendadaId, entrada) {
    const { data } = await api.post<ResultadoAtividade>(
      `${caminhoVisita(estudoId, participacaoId, visitaAgendadaId)}/resultados`,
      entrada,
    );
    return data;
  },
  async editarResultado(estudoId, participacaoId, visitaAgendadaId, resultadoId, texto) {
    const { data } = await api.put<ResultadoAtividade>(
      `${caminhoVisita(estudoId, participacaoId, visitaAgendadaId)}/resultados/${resultadoId}`,
      { texto },
    );
    return data;
  },
  // Só o coordenador vinculado, com CSRF, e com o estudo em recrutamento ou execução. 400
  // VALIDACAO_INVALIDA (errosCampos motivo), ESTADO_ESTUDO_INVALIDO e PARTICIPACAO_INVALIDA (já retirada);
  // 404 para estudo ou participação fora do vínculo. Cancela as visitas ainda agendadas
  async retirarParticipante(estudoId, participacaoId, entrada) {
    const { data } = await api.post<RetiradaParticipacao>(
      `/estudos/${estudoId}/participacoes/${participacaoId}/retirada`,
      entrada,
    );
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão enquanto as rotas não existem no backend.
// Para usar o backend, definir VITE_ACOMPANHAMENTO_API=real no web/.env
const usaBackend = import.meta.env.VITE_ACOMPANHAMENTO_API === 'real';

export const servicoAcompanhamento: ServicoAcompanhamento = usaBackend
  ? servicoAcompanhamentoApi
  : servicoAcompanhamentoSimulado;

/** O que a web pode pedir ao backend sem receber 403 de uma rota que ainda não existe ou nega o perfil. */
export type RecursosAcompanhamento = {
  /** GET .../historico (RF15): ainda não existe no backend. */
  historico: boolean;
  /** GET /estudos/{estudoId}/participacoes pelo pesquisador responsável: o PR #41 ainda nega. */
  listaPesquisador: boolean;
  /** POST .../retirada (RF16): ainda não existe no backend (task 3957). */
  retirada: boolean;
};

// No modo real, ficam desligados até o backend entregar o histórico e a retirada e liberar o pesquisador
// na lista; sem isso, a web chamaria uma rota negada e iria para "Acesso negado"
export const recursosAcompanhamento: RecursosAcompanhamento = usaBackend
  ? { historico: false, listaPesquisador: false, retirada: false }
  : { historico: true, listaPesquisador: true, retirada: true };
