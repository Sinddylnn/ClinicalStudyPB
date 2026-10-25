package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;

// <-------------------OPÇÕES DE COORDENADORES------------------->
/**
 * Expõe somente os dados necessários para escolher um coordenador ativo.
 *
 * @param id identificador da conta
 * @param nome nome exibido na seleção
 * @author Georis
 * @version 1.0
 * @since 25/10/2026
 */
public record CoordenadorResposta(
        @Schema(example = "3") Long id,
        @Schema(example = "Ana Coordenadora") String nome) {
}
