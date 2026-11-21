import { api } from './cliente';
import { servicoAcompanhamentoSimulado } from './acompanhamentoSimulado';

// <-------------------CONTRATO DE ACOMPANHAMENTO------------------->
// Segue o contrato da Sprint 3 (docs/api/acompanhamento-de-participantes.md).
// A lista de participações, o agendamento e o reagendamento seguem o PR #41 (task 3964); o registro e a
// correção da situação das visitas, o PR #46 (RF13); a retirada, o PR #48 (RF16); o histórico da
// participação, o PR #54 (RF15). Os resultados (RF14) seguem o PR #52, que só tem POST e PUT: as rotas
// GET .../visitas/{visitaAgendadaId} e GET .../resultados ainda não existem no backend.

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

/** Situação registrada ao fim da visita: uma visita nunca volta para AGENDADA (RF13). */
export type SituacaoFinal = Exclude<SituacaoVisita, 'AGENDADA'>;

/** Resultado fictício de uma atividade prevista (RF14). */
export type ResultadoHistorico = {
  atividadePrevistaId: number;
  descricaoAtividade: string;
  texto: string;
};

/** Correção de uma situação final, guardada sem apagar o registro anterior (CorrecaoVisitaResposta do backend). */
export type CorrecaoVisita = {
  // O backend sempre devolve id, visitaAgendadaId, motivoAnterior e motivoNovo (PR #54). Ficam opcionais
  // aqui só porque parte dos dados fictícios dos testes não os traz
  id?: number;
  visitaAgendadaId?: number;
  situacaoAnterior: SituacaoVisita;
  situacaoNova: SituacaoVisita;
  justificativa: string;
  corrigidaPorId: number;
  corrigidaPorNome: string;
  corrigidaEm: string;
  /** Motivo que a visita tinha antes da correção; null quando não tinha. */
  motivoAnterior?: string | null;
  /** Motivo da visita depois da correção; null quando não há. */
  motivoNovo?: string | null;
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
   * Nome de quem registrou, devolvido pelo backend (PR #54); null enquanto a visita está agendada ou
   * quando o nome não está disponível. Sem ele, a tela mostra "Usuário nº {id}".
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
  /** Nome de quem retirou, devolvido pelo backend (PR #54); null quando não está disponível. */
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
export type ResumoVisitaAgendada = Pick<VisitaAgendada, 'id' | 'nomeVisita' | 'dataHora' | 'situacao' | 'motivo'> & {
  /** Visita com resultado de atividade (RF14): a correção da situação fica bloqueada. */
  possuiResultados: boolean;
};

// <-------------------REGISTRO DA SITUAÇÃO DA VISITA (RF13)------------------->
/** Dados enviados em PATCH .../visitas/{visitaAgendadaId}/situacao (VisitaAgendadaSituacaoEntrada do backend). */
export type SituacaoVisitaEntrada = {
  situacao: SituacaoFinal;
  /** Obrigatório em CANCELADA, opcional em AUSENTE e proibido em REALIZADA; até 500 caracteres. */
  motivo?: string | null;
};

/** Dados enviados em POST .../visitas/{visitaAgendadaId}/correcoes (CorrecaoVisitaEntrada do backend). */
export type CorrecaoVisitaEntrada = {
  situacao: SituacaoFinal;
  /** De 1 a 500 caracteres depois de aparar: explica por que o registro anterior estava errado. */
  justificativa: string;
  /** Mesma regra do registro, conforme a nova situação. */
  motivo?: string | null;
};

/**
 * Resposta 201 da correção (CorrecaoVisitaResposta do backend, o mesmo record do histórico). O backend
 * também devolve motivoAnterior, motivoNovo e corrigidaPorNome; a web declara só o que usa aqui.
 */
export type CorrecaoVisitaRegistrada = {
  id: number;
  visitaAgendadaId: number;
  situacaoAnterior: SituacaoFinal;
  situacaoNova: SituacaoFinal;
  justificativa: string;
  corrigidaPorId: number;
  corrigidaEm: string;
};

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
   * PATCH .../visitas/{visitaAgendadaId}/situacao (RF13): registra a realização, a ausência ou o
   * cancelamento de uma visita AGENDADA. Devolve a visita atualizada.
   */
  registrarSituacao(
    estudoId: number,
    participacaoId: number,
    visitaAgendadaId: number,
    entrada: SituacaoVisitaEntrada,
  ): Promise<VisitaAgendada>;
  /**
   * POST .../visitas/{visitaAgendadaId}/correcoes (RF13): troca uma situação final por outra, com
   * justificativa. Devolve o registro da correção.
   */
  corrigirSituacao(
    estudoId: number,
    participacaoId: number,
    visitaAgendadaId: number,
    entrada: CorrecaoVisitaEntrada,
  ): Promise<CorrecaoVisitaRegistrada>;
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
   * for verdadeiro.
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
      .map((v) => ({
        id: v.visitaAgendadaId,
        nomeVisita: v.nomeVisita,
        dataHora: v.dataHora,
        situacao: v.situacao,
        motivo: v.motivo,
        possuiResultados: v.resultados.length > 0,
      }));
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
  // Só o coordenador vinculado, com CSRF (PR #46). 400 VALIDACAO_INVALIDA (errosCampos situacao ou
  // motivo acima de 500; sem errosCampos: cancelamento sem motivo ou realização com motivo),
  // ESTADO_ESTUDO_INVALIDO (estudo fora de recrutamento ou execução), PARTICIPACAO_INVALIDA (participação
  // retirada) e TRANSICAO_VISITA_INVALIDA (visita que não está AGENDADA, ou realização/ausência antes do
  // dia da visita no fuso de Recife); 404 RECURSO_NAO_ENCONTRADO (estudo, participação ou visita fora do
  // vínculo). Não usa DATA_VISITA_INVALIDA, que é só do agendamento
  async registrarSituacao(estudoId, participacaoId, visitaAgendadaId, entrada) {
    const { data } = await api.patch<VisitaAgendada>(
      `${caminhoVisita(estudoId, participacaoId, visitaAgendadaId)}/situacao`,
      entrada,
    );
    return data;
  },
  // Mesmos códigos do registro, com errosCampos também em justificativa (vazia ou acima de 500).
  // TRANSICAO_VISITA_INVALIDA também para visita ainda AGENDADA ou nova situação igual à atual, e
  // CORRECAO_BLOQUEADA para visita com resultado registrado (última conferência do backend)
  async corrigirSituacao(estudoId, participacaoId, visitaAgendadaId, entrada) {
    const { data } = await api.post<CorrecaoVisitaRegistrada>(
      `${caminhoVisita(estudoId, participacaoId, visitaAgendadaId)}/correcoes`,
      entrada,
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
  // Só o coordenador vinculado, com CSRF, e com o estudo em recrutamento ou execução (PR #48). 400
  // VALIDACAO_INVALIDA (errosCampos motivo), ESTADO_ESTUDO_INVALIDO e PARTICIPACAO_JA_RETIRADA (retirada
  // repetida); 404 para estudo ou participação fora do vínculo. Cancela as visitas ainda agendadas
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
  /** GET .../historico (RF15): entregue no backend (PR #54), para o coordenador vinculado e o pesquisador responsável. */
  historico: boolean;
  /** GET /estudos/{estudoId}/participacoes pelo pesquisador responsável: liberado no backend (PR #41). */
  listaPesquisador: boolean;
  /** POST .../retirada (RF16): entregue no backend (PR #48). */
  retirada: boolean;
};

// O histórico (PR #54), a lista do pesquisador (PR #41) e a retirada (PR #48) já existem no backend, então
// os dois modos ligam tudo. Uma chave nova fica desligada no modo real até a rota existir: sem ela, a web
// chamaria uma rota negada e iria para "Acesso negado"
export const recursosAcompanhamento: RecursosAcompanhamento = usaBackend
  ? { historico: true, listaPesquisador: true, retirada: true }
  : { historico: true, listaPesquisador: true, retirada: true };
