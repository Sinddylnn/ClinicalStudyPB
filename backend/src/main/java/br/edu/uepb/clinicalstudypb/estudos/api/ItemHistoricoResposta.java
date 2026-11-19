package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Representa um item do histórico completo da participação.
 *
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
@Schema(
        oneOf = {
                ItemHistoricoVisitaResposta.class,
                ItemHistoricoRetiradaResposta.class
        },
        discriminatorProperty = "tipo",
        discriminatorMapping = {
                @DiscriminatorMapping(value = "VISITA", schema = ItemHistoricoVisitaResposta.class),
                @DiscriminatorMapping(value = "RETIRADA", schema = ItemHistoricoRetiradaResposta.class)
        }
)
public sealed interface ItemHistoricoResposta
        permits ItemHistoricoVisitaResposta, ItemHistoricoRetiradaResposta {
}
