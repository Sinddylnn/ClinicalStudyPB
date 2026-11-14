package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import java.time.Instant;

public record ParticipacaoResumoResposta(
        Long id,
        Long participanteId,
        String participanteNome,
        Instant dataInclusao,
        SituacaoParticipacao situacao,
        Instant dataRetirada
) {

    public static ParticipacaoResumoResposta de(Participacao participacao) {
        return new ParticipacaoResumoResposta(
                participacao.getId(),
                participacao.getParticipante().getId(),
                participacao.getParticipante().getNome(),
                participacao.getDataInclusao(),
                participacao.getSituacao(),
                participacao.getDataRetirada()
        );
    }
}
