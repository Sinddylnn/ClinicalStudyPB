package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;

/**
 * Representa uma atividade prevista devolvida pela API.
 *
 * @param id identificador da atividade
 * @param descricao descrição da atividade
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record AtividadePrevistaResposta(
        Long id,
        String descricao
) {

    public static AtividadePrevistaResposta de(AtividadePrevista atividade) {
        return new AtividadePrevistaResposta(
                atividade.getId(),
                atividade.getDescricao()
        );
    }
}
