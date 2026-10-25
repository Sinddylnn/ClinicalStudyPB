package br.edu.uepb.clinicalstudypb.estudos.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Recebe os dados necessários para cadastrar um estudo.
 *
 * @param titulo título que identifica o estudo
 * @param objetivo descrição do objetivo do estudo
 * @param dataInicio data prevista de início
 * @param dataFim data prevista de término
 * @param limiteParticipantes quantidade máxima de participantes
 * @param coordenadorId coordenador ativo escolhido, ou {@code null} para atribuir depois
 * @author Luiz
 * @version 1.0
 * @since 25/10/2026
 */
public record EstudoCadastroEntrada(

        @NotBlank(message = "O título é obrigatório.")
        @Size(max = 150, message = "O título deve ter no máximo 150 caracteres.")
        String titulo,

        @NotBlank(message = "O objetivo é obrigatório.")
        @Size(max = 2000, message = "O objetivo deve ter no máximo 2000 caracteres.")
        String objetivo,

        @NotNull(message = "A data de início é obrigatória.")
        LocalDate dataInicio,

        @NotNull(message = "A data de término é obrigatória.")
        LocalDate dataFim,

        @NotNull(message = "O limite de participantes é obrigatório.")
        @Positive(message = "O limite de participantes deve ser maior que zero.")
        Integer limiteParticipantes,

        @Positive(message = "O identificador do coordenador deve ser maior que zero.")
        @Schema(description = "ID de um coordenador ativo. Opcional no cadastro; pode ser omitido ou nulo.",
                example = "3", requiredMode = Schema.RequiredMode.NOT_REQUIRED)
        Long coordenadorId
) {
}
