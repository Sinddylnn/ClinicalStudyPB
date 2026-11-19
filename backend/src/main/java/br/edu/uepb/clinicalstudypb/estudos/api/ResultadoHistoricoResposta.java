package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;

/**
 * Representa o resultado de uma atividade no historico da visita.
 *
 * @param atividadePrevistaId identificador da atividade prevista
 * @param descricaoAtividade descricao da atividade
 * @param texto resultado ficticio registrado
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
public record ResultadoHistoricoResposta(
        Long atividadePrevistaId,
        String descricaoAtividade,
        String texto
) {

    /**
     * Converte um resultado para o historico da visita.
     *
     * @param resultado resultado registrado
     * @return dados do resultado para o historico
     * @since 1.0
     */
    public static ResultadoHistoricoResposta de(ResultadoAtividade resultado) {
        return new ResultadoHistoricoResposta(
                resultado.getAtividadePrevista().getId(),
                resultado.getAtividadePrevista().getDescricao(),
                resultado.getTexto()
        );
    }
}
