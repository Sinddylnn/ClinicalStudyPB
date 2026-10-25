import { api } from './cliente';
import { servicoEstudosSimulado } from './estudosSimulado';

// <-------------------CONTRATO DE ESTUDOS------------------->
// Espelha a entidade Estudo e a migração V2 do backend.
// As rotas seguem o diagrama 08 e docs/autenticacao.md; conferir com a Task 3241.
export type EstadoEstudo = 'PLANEJAMENTO' | 'RECRUTAMENTO' | 'EXECUCAO' | 'ENCERRADO';

/** Dados enviados em POST /estudos. Datas no formato AAAA-MM-DD. */
export type EstudoCadastroEntrada = {
  titulo: string;
  objetivo: string;
  dataInicio: string;
  dataFim: string;
  limiteParticipantes: number;
};

/** Estudo devolvido pela API. O responsável vem da sessão, nunca do formulário (D02). */
export type Estudo = EstudoCadastroEntrada & {
  id: number;
  estado: EstadoEstudo;
  responsavelId: number;
  /**
   * Nome do pesquisador responsável, mostrado ao coordenador (coluna Responsável do protótipo).
   * Ainda não está no contrato do planejamento (8.2); combinar com a Task 3241.
   */
  responsavelNome?: string;
};

export type ServicoEstudos = {
  listar(): Promise<Estudo[]>;
  cadastrar(entrada: EstudoCadastroEntrada): Promise<Estudo>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend filtra a lista: pesquisador vê os próprios estudos, coordenador os vinculados (D04)
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
// Enquanto os endpoints de estudos não chegam à main, as telas usam o simulado.
// Com o backend pronto, definir VITE_ESTUDOS_API=real no web/.env
export const servicoEstudos: ServicoEstudos =
  import.meta.env.VITE_ESTUDOS_API === 'real' ? servicoEstudosApi : servicoEstudosSimulado;
