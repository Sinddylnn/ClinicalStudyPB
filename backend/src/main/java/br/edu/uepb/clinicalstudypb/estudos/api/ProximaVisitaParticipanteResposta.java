package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.time.Instant;
import java.util.List;

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
 * @param presencaConfirmadaEm instante da confirmação de presença
 * @param solicitacoesReagendamento pedidos da visita
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
public record ProximaVisitaParticipanteResposta(
        Long visitaAgendadaId,
        Long estudoId,
        String tituloEstudo,
        String nomeVisita,
        Instant dataHora,
        Instant presencaConfirmadaEm,
        List<SolicitacaoReagendamentoParticipanteResposta> solicitacoesReagendamento
) {

    /**
     * Converte uma visita agendada para o formato do aplicativo.
     *
     * @param visita visita da conta autenticada
     * @param solicitacoesReagendamento pedidos da visita
     * @return dados da próxima visita
     */
    public static ProximaVisitaParticipanteResposta de(
            VisitaAgendada visita,
            List<SolicitacaoReagendamentoParticipanteResposta> solicitacoesReagendamento) {
        return new ProximaVisitaParticipanteResposta(
                visita.getId(),
                visita.getParticipacao().getEstudo().getId(),
                visita.getParticipacao().getEstudo().getTitulo(),
                visita.getVisitaPrevista().getNome(),
                visita.getDataHora(),
                visita.getPresencaConfirmadaEm(),
                solicitacoesReagendamento
        );
    }
}
