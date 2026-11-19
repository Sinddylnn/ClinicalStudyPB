package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import java.time.Instant;
import java.util.List;

/**
 * Representa uma visita no histórico completo da participação.
 *
 * @param tipo tipo do item, identificado como VISITA
 * @param visitaAgendadaId identificador da visita
 * @param nomeVisita nome da visita prevista
 * @param dataHora data e hora agendadas
 * @param situacao situação atual da visita
 * @param motivo motivo da ausência ou cancelamento
 * @param registradoPorId identificador de quem registrou
 * @param registradoEm instante do registro
 * @param resultados resultados das atividades da visita
 * @param correcoes histórico de correções da visita
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
public record ItemHistoricoVisitaResposta(
        String tipo,
        Long visitaAgendadaId,
        String nomeVisita,
        Instant dataHora,
        SituacaoVisita situacao,
        String motivo,
        Long registradoPorId,
        Instant registradoEm,
        List<ResultadoHistoricoResposta> resultados,
        List<CorrecaoVisitaResposta> correcoes
) implements ItemHistoricoResposta {
}
