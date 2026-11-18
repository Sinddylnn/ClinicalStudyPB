package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// <-------------------DADOS DA RETIRADA------------------->
/**
 * Recebe o motivo da retirada de um participante.
 *
 * @param motivo motivo informado, de 1 a 500 caracteres após retirar espaços das pontas
 * @author Georis
 * @version 1.0
 * @since 16/11/2026
 */
public record RetiradaEntrada(

        @NotBlank(message = "Informe o motivo da retirada.")
        @Size(max = 500, message = "O motivo deve ter no máximo 500 caracteres.")
        @Schema(description = "Motivo da retirada, de 1 a 500 caracteres.",
                example = "Participante solicitou a retirada do estudo")
        String motivo
) {

    /**
     * Retira espaços das pontas antes da validação do campo.
     */
    public RetiradaEntrada {
        if (motivo != null) {
            motivo = motivo.strip();
        }
    }
}
