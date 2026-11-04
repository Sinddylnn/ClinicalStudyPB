package br.edu.uepb.clinicalstudypb.recrutamento.api;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
/** Mostra as condições atuais; a inclusão confere todas elas novamente na gravação. */
public record DadosInclusaoResposta(CandidatoResposta candidato, LocalDateTime avaliadoEm,
        Instant consentimentoEm, long incluidos, List<ContaParticipanteResposta> contas) { }
