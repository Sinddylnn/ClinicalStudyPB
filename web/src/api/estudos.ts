import { api } from './cliente';
import { servicoEstudosSimulado } from './estudosSimulado';

// <-------------------CONTRATO DE ESTUDOS------------------->
// Espelha EstudoCadastroEntrada, EstudoResposta e AlteracaoEstadoEntrada do backend (docs/openapi.md;
// mudança de estado no PR #26, docs/estados-estudo.md).
export type EstadoEstudo = 'PLANEJAMENTO' | 'RECRUTAMENTO' | 'EXECUCAO' | 'ENCERRADO';

/** Dados enviados em POST /estudos. Datas no formato AAAA-MM-DD. */
export type EstudoCadastroEntrada = {
  titulo: string;
  objetivo: string;
  dataInicio: string;
  dataFim: string;
  limiteParticipantes: number;
  /** Opcional no cadastro. A tela ainda não envia: a escolha do coordenador é da Sprint 2. */
  coordenadorId?: number | null;
};

/** Estudo devolvido pela API. O responsável vem da sessão, nunca do formulário (D02). */
export type Estudo = EstudoCadastroEntrada & {
  id: number;
  estado: EstadoEstudo;
  responsavelId: number;
  /** null enquanto nenhum coordenador foi atribuído. */
  coordenadorId: number | null;
  /**
   * Nome do pesquisador responsável, mostrado ao coordenador (coluna Responsável do protótipo).
   * Fornecido por EstudoResposta; o campo opcional preserva compatibilidade com respostas antigas.
   * Sem ele, a tela mostra "Pesquisador nº {responsavelId}".
   */
  responsavelNome?: string;
  /**
   * Motivo registrado no encerramento; null quando não houve. Opcional para aceitar
   * respostas anteriores ao PR #26, que ainda não traziam o campo.
   */
  justificativaEncerramento?: string | null;
};

/**
 * Dados enviados em PATCH /estudos/{id}/estado. A justificativa (até 500 caracteres) é
 * obrigatória para encerrar em Planejamento ou Recrutamento, opcional ao encerrar em Execução
 * e recusada em qualquer outra mudança.
 */
export type AlteracaoEstadoEntrada = {
  estado: EstadoEstudo;
  justificativaEncerramento?: string | null;
};

export type ServicoEstudos = {
  listar(): Promise<Estudo[]>;
  cadastrar(entrada: EstudoCadastroEntrada): Promise<Estudo>;
  alterarEstado(id: number, entrada: AlteracaoEstadoEntrada): Promise<Estudo>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend filtra a lista: pesquisador vê os próprios estudos, coordenador os vinculados (D02).
// A mudança de estado é só do pesquisador responsável e exige CSRF (o cliente já envia). Responde 404
// para estudo de outro pesquisador e 400 para VALIDACAO_INVALIDA (estado ausente ou justificativa
// acima de 500 caracteres), TRANSICAO_ESTADO_INVALIDA, COORDENADOR_OBRIGATORIO, PROTOCOLO_INCOMPLETO,
// CRITERIOS_EXCLUSAO_INCONSISTENTES, ESTUDO_SEM_PARTICIPANTES, ESTUDO_COM_PARTICIPANTES,
// JUSTIFICATIVA_OBRIGATORIA e JUSTIFICATIVA_INVALIDA; a mensagem explica o bloqueio (modelagem, seção 7)
export const servicoEstudosApi: ServicoEstudos = {
  async listar() {
    const { data } = await api.get<Estudo[]>('/estudos');
    return data;
  },
  async cadastrar(entrada) {
    const { data } = await api.post<Estudo>('/estudos', entrada);
    return data;
  },
  async alterarEstado(id, entrada) {
    const { data } = await api.patch<Estudo>(`/estudos/${id}/estado`, entrada);
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado continua como padrão até a integração (Task 3131).
// Para usar o backend, definir VITE_ESTUDOS_API=real no web/.env
export const servicoEstudos: ServicoEstudos =
  import.meta.env.VITE_ESTUDOS_API === 'real' ? servicoEstudosApi : servicoEstudosSimulado;
