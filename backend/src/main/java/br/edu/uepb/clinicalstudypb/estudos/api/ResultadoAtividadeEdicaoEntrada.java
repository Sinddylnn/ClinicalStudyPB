package br.edu.uepb.clinicalstudypb.estudos.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Recebe o texto atualizado de um resultado de atividade.
 *
 * @param texto resultado fictício atualizado
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
public record ResultadoAtividadeEdicaoEntrada(

        @NotBlank(message = "Informe o resultado da atividade.")
        @Size(max = 1000, message = "O resultado deve ter no máximo 1000 caracteres.")
        String texto
) {

    /**
     * Remove espaços das pontas antes da validação.
     */
    public ResultadoAtividadeEdicaoEntrada {
        if (texto != null) {
            texto = texto.strip();
        }
    }
}
