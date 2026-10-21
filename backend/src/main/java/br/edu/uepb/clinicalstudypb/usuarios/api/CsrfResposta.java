package br.edu.uepb.clinicalstudypb.usuarios.api;

// <-------------------PROTEÇÃO DAS REQUISIÇÕES DE ALTERAÇÃO------------------->
/**
 * Informa o token e o cabeçalho que a interface deve enviar nas alterações.
 *
 * @author Georis
 * @version 1.0
 * @param token valor de proteção CSRF associado à sessão
 * @param headerName nome do cabeçalho HTTP esperado pelo Spring Security
 * @since 21/10/2026
 */
public record CsrfResposta(String token, String headerName) {
}
