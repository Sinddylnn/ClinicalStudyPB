package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import java.util.List;

/**
 * Representa uma visita prevista e suas atividades devolvidas pela API.
 *
 * @param id identificador da visita
 * @param nome nome da visita
 * @param descricao descrição opcional
 * @param ordem posição da visita no protocolo
 * @param atividades atividades previstas para a visita
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record VisitaPrevistaResposta(
        Long id,
        String nome,
        String descricao,
        Integer ordem,
        List<AtividadePrevistaResposta> atividades
) {

    public static VisitaPrevistaResposta de(
            VisitaPrevista visita,
            List<AtividadePrevistaResposta> atividades) {

        return new VisitaPrevistaResposta(
                visita.getId(),
                visita.getNome(),
                visita.getDescricao(),
                visita.getOrdem(),
                atividades
        );
    }
}
