package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import java.time.Instant;

/**
 * Representa os dados de um resultado de atividade devolvidos pela API.
 *
 * @param id identificador do resultado
 * @param visitaAgendadaId identificador da visita realizada
 * @param atividadePrevistaId identificador da atividade avaliada
 * @param descricaoAtividade descrição da atividade prevista
 * @param texto resultado fictício registrado
 * @param registradoPorId identificador do responsável pelo registro
 * @param registradoEm instante do registro
 * @param atualizadoPorId identificador do responsável pela última edição
 * @param atualizadoEm instante da última edição
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
public record ResultadoAtividadeResposta(
        Long id,
        Long visitaAgendadaId,
        Long atividadePrevistaId,
        String descricaoAtividade,
        String texto,
        Long registradoPorId,
        Instant registradoEm,
        Long atualizadoPorId,
        Instant atualizadoEm
) {

    /**
     * Converte um resultado de atividade para a resposta da API.
     *
     * @param resultado resultado registrado
     * @return dados do resultado de atividade
     * @since 1.0
     */
    public static ResultadoAtividadeResposta de(ResultadoAtividade resultado) {
        return new ResultadoAtividadeResposta(
                resultado.getId(),
                resultado.getVisitaAgendada().getId(),
                resultado.getAtividadePrevista().getId(),
                resultado.getAtividadePrevista().getDescricao(),
                resultado.getTexto(),
                resultado.getRegistradoPor().getId(),
                resultado.getRegistradoEm(),
                resultado.getAtualizadoPor() == null
                        ? null : resultado.getAtualizadoPor().getId(),
                resultado.getAtualizadoEm()
        );
    }
}
