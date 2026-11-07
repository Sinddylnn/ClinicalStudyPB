package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.recrutamento.RespostaCriterio;
import jakarta.validation.constraints.NotNull;

// Resposta informada para um critério.
public record RespostaCriterioEntrada(
        @NotNull(message = "Informe o critério.")
        Long criterioId,

        RespostaCriterio resposta
) {
}
