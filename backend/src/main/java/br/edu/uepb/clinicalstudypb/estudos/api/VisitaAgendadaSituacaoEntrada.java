
package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Recebe os dados para registrar a situação de uma visita.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public record VisitaAgendadaSituacaoEntrada(

        @NotNull(message = "Informe a situação da visita.")
        SituacaoVisita situacao,

        @Size(max = 500, message = "O motivo deve ter no máximo 500 caracteres.")
        String motivo
) {
    public VisitaAgendadaSituacaoEntrada {
        if (motivo != null) {
            motivo = motivo.strip();
            if (motivo.isEmpty()) {
                motivo = null;
            }
        }
    }
}
