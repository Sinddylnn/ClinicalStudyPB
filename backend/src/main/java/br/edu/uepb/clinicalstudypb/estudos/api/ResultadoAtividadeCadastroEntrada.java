package br.edu.uepb.clinicalstudypb.estudos.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Recebe os dados para registrar o resultado de uma atividade prevista.
 *
 * @param atividadePrevistaId identificador da atividade avaliada
 * @param texto resultado fictício informado
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
public record ResultadoAtividadeCadastroEntrada(

        @NotNull(message = "Informe a atividade prevista.")
        @Positive(message = "A atividade prevista deve ser válida.")
        Long atividadePrevistaId,

        @NotBlank(message = "Informe o resultado da atividade.")
        @Size(max = 1000, message = "O resultado deve ter no máximo 1000 caracteres.")
        String texto
) {

    /**
     * Remove espaços das pontas antes da validação.
     */
    public ResultadoAtividadeCadastroEntrada {
        if (texto != null) {
            texto = texto.strip();
        }
    }
}
