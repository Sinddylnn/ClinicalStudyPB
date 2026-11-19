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
 * @param registradoPorNome nome de quem registrou, quando disponível
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
        String registradoPorNome,
        Instant registradoEm,
        List<ResultadoHistoricoResposta> resultados,
        List<CorrecaoVisitaResposta> correcoes
) implements ItemHistoricoResposta {

    /**
     * Mantém compatibilidade com chamadas anteriores que informam apenas
     * o identificador do responsável pelo registro.
     *
     * @param tipo tipo do item
     * @param visitaAgendadaId identificador da visita
     * @param nomeVisita nome da visita prevista
     * @param dataHora data e hora agendadas
     * @param situacao situação atual da visita
     * @param motivo motivo da ausência ou cancelamento
     * @param registradoPorId identificador de quem registrou
     * @param registradoEm instante do registro
     * @param resultados resultados das atividades da visita
     * @param correcoes histórico de correções da visita
     * @since 1.0
     */
    public ItemHistoricoVisitaResposta(
            String tipo,
            Long visitaAgendadaId,
            String nomeVisita,
            Instant dataHora,
            SituacaoVisita situacao,
            String motivo,
            Long registradoPorId,
            Instant registradoEm,
            List<ResultadoHistoricoResposta> resultados,
            List<CorrecaoVisitaResposta> correcoes) {
        this(tipo, visitaAgendadaId, nomeVisita, dataHora, situacao, motivo,
                registradoPorId, null, registradoEm, resultados, correcoes);
    }
}
