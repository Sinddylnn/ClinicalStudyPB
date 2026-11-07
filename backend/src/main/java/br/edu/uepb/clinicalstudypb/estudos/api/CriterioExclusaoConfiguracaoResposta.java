package br.edu.uepb.clinicalstudypb.estudos.api;

/**
 * Representa a configuração dos critérios de exclusão do protocolo.
 *
 * @param semCriteriosExclusao indica que o protocolo não possui critérios de exclusão
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record CriterioExclusaoConfiguracaoResposta(
        boolean semCriteriosExclusao
) {
}
