package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Recebe os dados para cadastrar uma atividade em uma visita prevista.
 *
 * @param descricao descrição da atividade
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record AtividadePrevistaCadastroEntrada(

        @NotBlank(message = "Informe a descrição da atividade.")
        @Size(max = 1000, message = "A descrição deve ter no máximo 1000 caracteres.")
        @Schema(example = "Realizar aferição da pressão arterial.")
        String descricao
) {

    public AtividadePrevistaCadastroEntrada {
        if (descricao != null) {
            descricao = descricao.strip();
        }
    }
}
