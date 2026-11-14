package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.time.Instant;

// Dados da visita devolvidos pela API
public record VisitaAgendadaResposta(
        Long id,
        Long participacaoId,
        Long visitaPrevistaId,
        String nomeVisita,
        Instant dataHora,
        SituacaoVisita situacao,
        String motivo,
        Long registradoPorId,
        Instant registradoEm
) {

    public static VisitaAgendadaResposta de(VisitaAgendada visita) {
        return new VisitaAgendadaResposta(
                visita.getId(),
                visita.getParticipacao().getId(),
                visita.getVisitaPrevista().getId(),
                visita.getVisitaPrevista().getNome(),
                visita.getDataHora(),
                visita.getSituacao(),
                visita.getMotivo(),
                visita.getRegistradoPor() == null
                        ? null : visita.getRegistradoPor().getId(),
                visita.getRegistradoEm()
        );
    }
}
