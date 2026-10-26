import { api } from './cliente';
import { servicoEstudosSimulado } from './estudosSimulado';

// <-------------------CONTRATO DE ESTUDOS------------------->
// Espelha EstudoCadastroEntrada e EstudoResposta do backend (docs/openapi.md).
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
   * Ainda não vem em EstudoResposta; sem ele, a tela mostra "Pesquisador nº {responsavelId}".
   */
  responsavelNome?: string;
};

export type ServicoEstudos = {
  listar(): Promise<Estudo[]>;
  cadastrar(entrada: EstudoCadastroEntrada): Promise<Estudo>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend filtra a lista: pesquisador vê os próprios estudos, coordenador os vinculados (D02)
export const servicoEstudosApi: ServicoEstudos = {
  async listar() {
    const { data } = await api.get<Estudo[]>('/estudos');
    return data;
  },
  async cadastrar(entrada) {
    const { data } = await api.post<Estudo>('/estudos', entrada);
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado continua como padrão até a integração (Task 3131).
// Para usar o backend, definir VITE_ESTUDOS_API=real no web/.env
export const servicoEstudos: ServicoEstudos =
  import.meta.env.VITE_ESTUDOS_API === 'real' ? servicoEstudosApi : servicoEstudosSimulado;
