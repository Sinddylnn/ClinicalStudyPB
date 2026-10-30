import { api } from './cliente';
import { servicoCandidatosSimulado } from './candidatosSimulado';
import type { TipoCriterio } from './protocolo';

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

// <-------------------AVALIAÇÃO DE ELEGIBILIDADE (RF09)------------------->
/** Inclusão: ATENDIDO ou NAO_ATENDIDO. Exclusão: PRESENTE ou AUSENTE. */
export type RespostaCriterio = 'ATENDIDO' | 'NAO_ATENDIDO' | 'PRESENTE' | 'AUSENTE';

/** Um critério do protocolo do estudo com a resposta do coordenador (null = sem resposta). */
export type ItemAvaliacao = {
  criterioId: number;
  tipo: TipoCriterio;
  descricao: string;
  resposta: RespostaCriterio | null;
};

/** Devolvida em GET e PUT /estudos/{estudoId}/candidatos/{candidatoId}/elegibilidade. */
export type AvaliacaoElegibilidade = {
  candidato: Candidato;
  /** Situação calculada pelo backend a partir das respostas. */
  situacao: Elegibilidade;
  /** Critérios de inclusão e exclusão do protocolo, na ordem do protocolo. */
  itens: ItemAvaliacao[];
  /** Nome do coordenador que salvou por último; null enquanto não foi avaliado. */
  avaliadoPor: string | null;
  /** Data e hora do último salvamento (ISO 8601); null enquanto não foi avaliado. */
  avaliadoEm: string | null;
};

/** Dados enviados em PUT .../elegibilidade: uma resposta por critério, null para deixar sem resposta. */
export type AvaliacaoEntrada = {
  respostas: { criterioId: number; resposta: RespostaCriterio | null }[];
};

export type ServicoCandidatos = {
  listar(estudoId: number): Promise<Candidato[]>;
  cadastrar(estudoId: number, entrada: CandidatoCadastroEntrada): Promise<Candidato>;
  obterElegibilidade(estudoId: number, candidatoId: number): Promise<AvaliacaoElegibilidade>;
  avaliarElegibilidade(
    estudoId: number,
    candidatoId: number,
    entrada: AvaliacaoEntrada,
  ): Promise<AvaliacaoElegibilidade>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend responde 404 para estudo fora do escopo do coordenador, 400 para estudo fora
// de Recrutamento (regra de negócio) e 409 para e-mail repetido no mesmo estudo (conflito).
// Na elegibilidade, 404 para candidato de outro estudo, 400 VALIDACAO_INVALIDA para critério
// de outro protocolo ou avaliação sem nenhuma resposta e 400 CANDIDATO_JA_INCLUIDO para
// corrigir depois da inclusão (a avaliação fica no histórico)
export const servicoCandidatosApi: ServicoCandidatos = {
  async listar(estudoId) {
    const { data } = await api.get<Candidato[]>(`/estudos/${estudoId}/candidatos`);
    return data;
  },
  async cadastrar(estudoId, entrada) {
    const { data } = await api.post<Candidato>(`/estudos/${estudoId}/candidatos`, entrada);
    return data;
  },
  async obterElegibilidade(estudoId, candidatoId) {
    const { data } = await api.get<AvaliacaoElegibilidade>(
      `/estudos/${estudoId}/candidatos/${candidatoId}/elegibilidade`,
    );
    return data;
  },
  async avaliarElegibilidade(estudoId, candidatoId, entrada) {
    const { data } = await api.put<AvaliacaoElegibilidade>(
      `/estudos/${estudoId}/candidatos/${candidatoId}/elegibilidade`,
      entrada,
    );
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão até o backend do recrutamento ficar pronto.
// Para usar o backend, definir VITE_CANDIDATOS_API=real no web/.env
export const servicoCandidatos: ServicoCandidatos =
  import.meta.env.VITE_CANDIDATOS_API === 'real' ? servicoCandidatosApi : servicoCandidatosSimulado;
