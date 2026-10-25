package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// <-------------------ATRIBUIÇÃO DO COORDENADOR------------------->
/**
 * Recebe a escolha do coordenador de um estudo já cadastrado.
 *
 * @param coordenadorId identificador de uma conta ativa com perfil de coordenador
 * @author Georis
 * @version 1.0
 * @since 25/10/2026
 */
public record CoordenadorEntrada(
        @NotNull(message = "O coordenador é obrigatório para esta atribuição.")
        @Positive(message = "O identificador do coordenador deve ser maior que zero.")
        @Schema(description = "ID obtido em GET /estudos/coordenadores.", example = "3")
        Long coordenadorId) {
}
