package br.edu.uepb.clinicalstudypb.recrutamento.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

// Dados enviados para salvar uma avaliação.
public record AvaliacaoElegibilidadeEntrada(

        @NotEmpty(message = "Informe os critérios da avaliação.")
        List<@NotNull @Valid RespostaCriterioEntrada> respostas

) {
}
