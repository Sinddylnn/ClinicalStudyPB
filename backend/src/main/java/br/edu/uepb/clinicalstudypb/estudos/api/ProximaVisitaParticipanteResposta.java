package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.time.Instant;

// <-------------------PRÓXIMA VISITA NO APLICATIVO------------------->
/**
 * Representa uma visita agendada exibida ao participante.
 *
 * <p>Não inclui motivo, resultados nem quem registrou.</p>
 *
 * @param visitaAgendadaId identificador da visita agendada
 * @param estudoId identificador do estudo
 * @param tituloEstudo título do estudo
 * @param nomeVisita nome da visita prevista
 * @param dataHora data e hora agendadas
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
public record ProximaVisitaParticipanteResposta(
        Long visitaAgendadaId,
        Long estudoId,
        String tituloEstudo,
        String nomeVisita,
        Instant dataHora
) {

    /**
     * Converte uma visita agendada para o formato do aplicativo.
     *
     * @param visita visita da conta autenticada
     * @return dados da próxima visita
     */
    public static ProximaVisitaParticipanteResposta de(VisitaAgendada visita) {
        return new ProximaVisitaParticipanteResposta(
                visita.getId(),
                visita.getParticipacao().getEstudo().getId(),
                visita.getParticipacao().getEstudo().getTitulo(),
                visita.getVisitaPrevista().getNome(),
                visita.getDataHora()
        );
    }
}
