package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Recebe os dados para corrigir a situação de uma visita.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public record CorrecaoVisitaEntrada(

        @NotNull(message = "Informe a nova situação.")
        SituacaoVisita situacao,

        @NotBlank(message = "Informe a justificativa da correção.")
        @Size(max = 500, message = "A justificativa deve ter no máximo 500 caracteres.")
        String justificativa,

        @Size(max = 500, message = "O motivo deve ter no máximo 500 caracteres.")
        String motivo
) {
    public CorrecaoVisitaEntrada {
        if (justificativa != null) {
            justificativa = justificativa.strip();
        }

        if (motivo != null) {
            motivo = motivo.strip();
            if (motivo.isEmpty()) {
                motivo = null;
            }
        }
    }
}
