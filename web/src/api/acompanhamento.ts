import { api } from './cliente';
import { servicoAcompanhamentoSimulado } from './acompanhamentoSimulado';

// <-------------------CONTRATO DE ACOMPANHAMENTO------------------->
// Segue o rascunho do contrato da Sprint 3 (docs/api/acompanhamento-de-participantes.md).
// As rotas ainda não existem no backend: conferir campos e códigos quando forem implementadas.

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

export type ServicoAcompanhamento = {
  listarParticipacoes(estudoId: number): Promise<Participacao[]>;
  obterHistorico(estudoId: number, participacaoId: number): Promise<HistoricoParticipacao>;
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
};

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
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão enquanto as rotas não existem no backend.
// Para usar o backend, definir VITE_ACOMPANHAMENTO_API=real no web/.env
export const servicoAcompanhamento: ServicoAcompanhamento =
  import.meta.env.VITE_ACOMPANHAMENTO_API === 'real' ? servicoAcompanhamentoApi : servicoAcompanhamentoSimulado;
