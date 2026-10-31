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

// <-------------------CONSENTIMENTO SIMULADO (RF10)------------------->
/** Só ACEITOU permite a inclusão; RECUSOU é uma resposta registrada que a bloqueia. */
export type RespostaConsentimento = Exclude<Consentimento, 'PENDENTE'>;

/** Devolvido em GET e PUT /estudos/{estudoId}/candidatos/{candidatoId}/consentimento. */
export type RegistroConsentimento = {
  candidato: Candidato;
  /** Observação opcional de até 500 caracteres; null quando não foi informada. */
  observacao: string | null;
  /** Nome do coordenador que registrou por último; null enquanto está pendente. */
  registradoPor: string | null;
  /** Data e hora do último registro (ISO 8601); null enquanto está pendente. */
  registradoEm: string | null;
};

/** Dados enviados em PUT .../consentimento. */
export type ConsentimentoEntrada = {
  resposta: RespostaConsentimento;
  observacao: string | null;
};

// <-------------------INCLUSÃO DO PARTICIPANTE (RF11)------------------->
/** Conta ativa com perfil participante que o coordenador pode vincular ao candidato. */
export type ContaParticipante = {
  id: number;
  nome: string;
  email: string;
};

/** Devolvida em GET /estudos/{estudoId}/candidatos/{candidatoId}/inclusao: o que a tela confere antes de incluir. */
export type DadosInclusao = {
  candidato: Candidato;
  /** Data e hora da avaliação (ISO 8601); null enquanto não foi avaliado. */
  avaliadoEm: string | null;
  /** Data e hora do consentimento (ISO 8601); null enquanto está pendente. */
  consentimentoEm: string | null;
  /** Total histórico de inclusões do estudo: uma retirada não libera a vaga. */
  incluidos: number;
  contas: ContaParticipante[];
};

/** Dados enviados em POST .../inclusao. */
export type InclusaoEntrada = {
  contaId: number;
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
  obterConsentimento(estudoId: number, candidatoId: number): Promise<RegistroConsentimento>;
  registrarConsentimento(
    estudoId: number,
    candidatoId: number,
    entrada: ConsentimentoEntrada,
  ): Promise<RegistroConsentimento>;
  obterInclusao(estudoId: number, candidatoId: number): Promise<DadosInclusao>;
  incluir(estudoId: number, candidatoId: number, entrada: InclusaoEntrada): Promise<Candidato>;
};

// <-------------------SERVIÇO REAL------------------->
// O backend responde 404 para estudo fora do escopo do coordenador, 400 para estudo fora
// de Recrutamento (regra de negócio) e 409 para e-mail repetido no mesmo estudo (conflito).
// Na elegibilidade, 404 para candidato de outro estudo, 400 VALIDACAO_INVALIDA para critério
// de outro protocolo ou avaliação sem nenhuma resposta e 400 CANDIDATO_JA_INCLUIDO para
// corrigir depois da inclusão (a avaliação fica no histórico).
// No consentimento, 400 VALIDACAO_INVALIDA para resposta ausente ou observação longa e
// 400 AVALIACAO_PENDENTE para candidato sem avaliação registrada. Na inclusão, a API confere
// tudo de novo: 400 para regra não atendida (ELEGIBILIDADE_INVALIDA, CONSENTIMENTO_NAO_ACEITO,
// CONTA_INVALIDA) e 409 para INCLUSAO_DUPLICADA ou LIMITE_ATINGIDO (disputa pela última vaga)
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
  async obterConsentimento(estudoId, candidatoId) {
    const { data } = await api.get<RegistroConsentimento>(
      `/estudos/${estudoId}/candidatos/${candidatoId}/consentimento`,
    );
    return data;
  },
  async registrarConsentimento(estudoId, candidatoId, entrada) {
    const { data } = await api.put<RegistroConsentimento>(
      `/estudos/${estudoId}/candidatos/${candidatoId}/consentimento`,
      entrada,
    );
    return data;
  },
  async obterInclusao(estudoId, candidatoId) {
    const { data } = await api.get<DadosInclusao>(`/estudos/${estudoId}/candidatos/${candidatoId}/inclusao`);
    return data;
  },
  async incluir(estudoId, candidatoId, entrada) {
    const { data } = await api.post<Candidato>(`/estudos/${estudoId}/candidatos/${candidatoId}/inclusao`, entrada);
    return data;
  },
};

// <-------------------SERVIÇO EM USO------------------->
// O simulado é o padrão até o backend do recrutamento ficar pronto.
// Para usar o backend, definir VITE_CANDIDATOS_API=real no web/.env
export const servicoCandidatos: ServicoCandidatos =
  import.meta.env.VITE_CANDIDATOS_API === 'real' ? servicoCandidatosApi : servicoCandidatosSimulado;
