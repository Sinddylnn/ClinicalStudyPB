package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Recebe os dados para cadastrar uma visita prevista no protocolo.
 *
 * @param nome nome da visita
 * @param descricao descrição opcional
 * @param ordem posição da visita no protocolo
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record VisitaPrevistaCadastroEntrada(

        @NotBlank(message = "Informe o nome da visita.")
        @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
        @Schema(example = "Visita inicial")
        String nome,

        @Size(max = 1000, message = "A descrição deve ter no máximo 1000 caracteres.")
        @Schema(example = "Avaliação inicial do participante.")
        String descricao,

        @NotNull(message = "Informe a ordem da visita.")
        @Positive(message = "A ordem da visita deve ser maior que zero.")
        @Schema(example = "1")
        Integer ordem
) {

    public VisitaPrevistaCadastroEntrada {
        if (nome != null) {
            nome = nome.strip();
        }

        if (descricao != null) {
            descricao = descricao.strip();

            if (descricao.isEmpty()) {
                descricao = null;
            }
        }
    }
}
