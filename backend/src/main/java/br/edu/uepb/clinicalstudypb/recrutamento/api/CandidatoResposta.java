package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoConsentimento;
import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoElegibilidade;
import java.time.LocalDate;

// <-------------------RESPOSTA DO CANDIDATO------------------->
public record CandidatoResposta(
        Long id,
        Long estudoId,
        String nome,
        String email,
        SituacaoElegibilidade elegibilidade,
        SituacaoConsentimento consentimento,
        LocalDate dataInclusao
) {

    public static CandidatoResposta de(Candidato candidato) {
        return new CandidatoResposta(
                candidato.getId(),
                candidato.getEstudo().getId(),
                candidato.getNome(),
                candidato.getEmail(),
                candidato.getElegibilidade(),
                candidato.getConsentimento(),
                null
        );
    }
}
