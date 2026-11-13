package br.edu.uepb.clinicalstudypb.estudos.api;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

// Nova data e hora da visita
public record VisitaAgendadaReagendamentoEntrada(

        @NotNull(message = "Informe a nova data e hora.")
        Instant dataHora
) {
}
