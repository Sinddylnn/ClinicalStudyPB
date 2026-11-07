package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Recebe a declaração sobre a existência de critérios de exclusão no estudo.
 *
 * @param semCriteriosExclusao indica que o protocolo não possui critérios de exclusão
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record CriterioExclusaoConfiguracaoEntrada(

        @Schema(
                description = "Indica que o estudo não possui critérios de exclusão.",
                example = "true"
        )
        boolean semCriteriosExclusao
) {
}
