package br.edu.uepb.clinicalstudypb.recrutamento.api;

/** Expõe somente os dados necessários para escolher a conta correspondente ao candidato. */
public record ContaParticipanteResposta(Long id, String nome, String email) { }
