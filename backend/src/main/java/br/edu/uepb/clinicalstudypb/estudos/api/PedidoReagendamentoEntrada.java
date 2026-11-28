package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

// <-------------------PEDIDO DE REAGENDAMENTO------------------->
/**
 * Dados informados pelo participante para pedir reagendamento.
 *
 * @param dataHoraDesejada nova data e hora desejadas
 * @param motivo explicação opcional do pedido
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
public record PedidoReagendamentoEntrada(
        @NotNull(message = "Informe a nova data e hora desejadas.")
        @Schema(description = "Nova data e hora desejadas pelo participante.",
                example = "2026-12-03T14:00:00-03:00")
        Instant dataHoraDesejada,

        @Size(max = 500, message = "O motivo deve ter no máximo 500 caracteres.")
        @Schema(description = "Motivo opcional, de até 500 caracteres.",
                example = "Consulta médica no mesmo horário")
        String motivo
) {
    /**
     * Retira espaços das pontas do motivo opcional.
     */
    public PedidoReagendamentoEntrada {
        if (motivo != null) {
            motivo = motivo.strip();
        }
    }
}
