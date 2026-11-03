package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;

/**
 * Representa os dados de um critério devolvidos pela API.
 *
 * @param id identificador do critério
 * @param tipo tipo do critério
 * @param descricao descrição do critério
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record CriterioResposta(
        Long id,
        TipoCriterio tipo,
        String descricao
) {

    /**
     * Converte uma entidade de critério para o formato devolvido pela API.
     *
     * @param criterio critério persistido
     * @return representação dos dados do critério
     */
    public static CriterioResposta de(Criterio criterio) {
        return new CriterioResposta(
                criterio.getId(),
                criterio.getTipo(),
                criterio.getDescricao()
        );
    }
}
