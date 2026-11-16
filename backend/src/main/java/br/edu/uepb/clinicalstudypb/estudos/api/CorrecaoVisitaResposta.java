package br.edu.uepb.clinicalstudypb.estudos.api;

import java.time.Instant;

import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;

/**
 * Representa os dados de uma correção de visita.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public record CorrecaoVisitaResposta(
        Long id,
        Long visitaAgendadaId,
        SituacaoVisita situacaoAnterior,
        SituacaoVisita situacaoNova,
        String justificativa,
        Long corrigidaPorId,
        Instant corrigidaEm
) {
    /**
     * Converte uma correção para o formato de resposta da API.
     *
     * @param correcao correção registrada
     * @return dados da correção
     * @since 1.0
     */
    public static CorrecaoVisitaResposta de(CorrecaoVisita correcao) {
        return new CorrecaoVisitaResposta(
                correcao.getId(),
                correcao.getVisitaAgendada().getId(),
                correcao.getSituacaoAnterior(),
                correcao.getSituacaoNova(),
                correcao.getJustificativa(),
                correcao.getCorrigidaPor().getId(),
                correcao.getCorrigidaEm()
        );
    }
}
