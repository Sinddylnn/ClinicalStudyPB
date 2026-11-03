package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// <-------------------SOLICITAÇÃO DE MUDANÇA DE ESTADO------------------->
/**
 * Recebe o estado desejado e o motivo de um eventual encerramento.
 *
 * @param estado próximo estado, sujeito às regras da transição
 * @param justificativaEncerramento motivo obrigatório no encerramento antecipado
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
public record AlteracaoEstadoEntrada(
        @NotNull(message = "O estado é obrigatório.")
        @Schema(description = "Estado desejado; não são permitidos retornos, saltos ou repetição do estado atual.",
                example = "ENCERRADO")
        EstadoEstudo estado,
        @Size(max = 500, message = "A justificativa deve ter no máximo 500 caracteres.")
        @Schema(description = "Obrigatória para encerrar em planejamento ou recrutamento. Máximo de 500 caracteres.",
                example = "Estudo cancelado antes da inclusão de participantes.")
        String justificativaEncerramento) {

    /**
     * Normaliza o texto antes da validação, tratando espaços isolados como ausência.
     */
    public AlteracaoEstadoEntrada {
        if (justificativaEncerramento != null) {
            justificativaEncerramento = justificativaEncerramento.strip();
            if (justificativaEncerramento.isEmpty()) {
                justificativaEncerramento = null;
            }
        }
    }
}
