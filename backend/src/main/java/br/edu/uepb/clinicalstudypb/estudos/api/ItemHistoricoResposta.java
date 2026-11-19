package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Representa um item do histórico completo da participação.
 *
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
@Schema(oneOf = {
        ItemHistoricoVisitaResposta.class,
        ItemHistoricoRetiradaResposta.class
})
public sealed interface ItemHistoricoResposta
        permits ItemHistoricoVisitaResposta, ItemHistoricoRetiradaResposta {
}
