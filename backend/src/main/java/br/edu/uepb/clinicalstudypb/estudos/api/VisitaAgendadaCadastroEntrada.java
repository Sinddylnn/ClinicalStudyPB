package br.edu.uepb.clinicalstudypb.estudos.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;

// Dados para agendar uma visita
public record VisitaAgendadaCadastroEntrada(

        @NotNull(message = "Informe a visita prevista.")
        @Positive(message = "A visita prevista deve ser válida.")
        Long visitaPrevistaId,

        @NotNull(message = "Informe a data e hora da visita.")
        Instant dataHora
) {
}
