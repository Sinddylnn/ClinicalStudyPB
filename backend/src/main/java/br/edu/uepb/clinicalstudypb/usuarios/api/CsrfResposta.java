package br.edu.uepb.clinicalstudypb.usuarios.api;

import io.swagger.v3.oas.annotations.media.Schema;

// <-------------------PROTEÇÃO DAS REQUISIÇÕES DE ALTERAÇÃO------------------->
/**
 * Um record (gera construtor e métodos de acesso aos componentes, sem setters)
 * que informa o token e o cabeçalho que a interface deve enviar nas alterações.
 *
 * @author Georis
 * @version 1.0
 * @param token valor de proteção CSRF associado à sessão
 * @param headerName nome do cabeçalho HTTP esperado pelo Spring Security
 * @since 21/10/2026
 */
public record CsrfResposta(
        @Schema(description = "Token temporário da sessão. Use o valor real retornado por este endpoint.") String token,
        @Schema(description = "Nome do cabeçalho que recebe o token.", example = "X-CSRF-TOKEN") String headerName) {
}
