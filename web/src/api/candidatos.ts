import { api } from './cliente';
import { servicoCandidatosSimulado } from './candidatosSimulado';

// <-------------------CONTRATO DE CANDIDATOS------------------->
// O backend da Sprint 2 ainda não publicou o contrato (docs/openapi.md);
// estes tipos seguem o protótipo e as regras do RF08 a RF11 e devem ser conferidos na integração.

/** Situação da avaliação de elegibilidade (RF09). */
export type Elegibilidade = 'NAO_AVALIADO' | 'INCOMPLETA' | 'ELEGIVEL' | 'INELEGIVEL';

/** Resposta ao termo de consentimento (RF10). */
export type Consentimento = 'PENDENTE' | 'ACEITOU' | 'RECUSOU';

/** Dados enviados em POST /estudos/{estudoId}/candidatos. */
export type CandidatoCadastroEntrada = {
  nome: string;
  email: string;
};

/** Candidato devolvido pela API, sempre vinculado a um estudo (RF08). */
export type Candidato = CandidatoCadastroEntrada & {
  id: number;
  estudoId: number;
  elegibilidade: Elegibilidade;
  consentimento: Consentimento;
  /** Data da inclusão como participante (AAAA-MM-DD); null enquanto não foi incluído (RF11). */
  dataInclusao: string | null;
};

export type ServicoCandidatos = {
  listar(estudoId: number): Promise<Candidato[]>;
  cadastrar(estudoId: number, entrada: CandidatoCadastroEntrada): Promise<Candidato>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend responde 404 para estudo fora do escopo do coordenador e
// 409 para e-mail repetido no mesmo estudo ou estudo fora de Recrutamento
export const servicoCandidatosApi: ServicoCandidatos = {
  async listar(estudoId) {
    const { data } = await api.get<Candidato[]>(`/estudos/${estudoId}/candidatos`);
    return data;
  },
  async cadastrar(estudoId, entrada) {
    const { data } = await api.post<Candidato>(`/estudos/${estudoId}/candidatos`, entrada);
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão até o backend do recrutamento ficar pronto.
// Para usar o backend, definir VITE_CANDIDATOS_API=real no web/.env
export const servicoCandidatos: ServicoCandidatos =
  import.meta.env.VITE_CANDIDATOS_API === 'real' ? servicoCandidatosApi : servicoCandidatosSimulado;
