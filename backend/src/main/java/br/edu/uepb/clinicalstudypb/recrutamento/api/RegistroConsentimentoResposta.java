package br.edu.uepb.clinicalstudypb.recrutamento.api;

import java.time.Instant;
/** Apresenta o registro atual; autor e instante são nulos enquanto estiver pendente. */
public record RegistroConsentimentoResposta(CandidatoResposta candidato, String observacao,
        String registradoPor, Instant registradoEm) { }
