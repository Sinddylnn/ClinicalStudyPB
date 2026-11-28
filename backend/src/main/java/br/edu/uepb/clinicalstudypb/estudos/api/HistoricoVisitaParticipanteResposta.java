package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.time.Instant;
import java.util.List;

// <-------------------HISTÓRICO DE COMPARECIMENTO------------------->
/**
 * Representa uma visita já registrada, exibida no histórico do participante.
 *
 * <p>Não inclui motivo, justificativa, correções, resultados nem quem registrou.</p>
 *
 * @param visitaAgendadaId identificador da visita agendada
 * @param estudoId identificador do estudo
 * @param tituloEstudo título do estudo
 * @param nomeVisita nome da visita prevista
 * @param dataHora data e hora agendadas
 * @param situacao situação registrada da visita
 * @param presencaConfirmadaEm instante da confirmação de presença
 * @param solicitacoesReagendamento pedidos da visita
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
public record HistoricoVisitaParticipanteResposta(
        Long visitaAgendadaId,
        Long estudoId,
        String tituloEstudo,
        String nomeVisita,
        Instant dataHora,
        SituacaoVisita situacao,
        Instant presencaConfirmadaEm,
        List<SolicitacaoReagendamentoParticipanteResposta> solicitacoesReagendamento
) {

    /**
     * Converte uma visita registrada para o formato do aplicativo.
     *
     * @param visita visita da conta autenticada
     * @param solicitacoesReagendamento pedidos da visita
     * @return dados do histórico de comparecimento
     */
    public static HistoricoVisitaParticipanteResposta de(
            VisitaAgendada visita,
            List<SolicitacaoReagendamentoParticipanteResposta> solicitacoesReagendamento) {
        return new HistoricoVisitaParticipanteResposta(
                visita.getId(),
                visita.getParticipacao().getEstudo().getId(),
                visita.getParticipacao().getEstudo().getTitulo(),
                visita.getVisitaPrevista().getNome(),
                visita.getDataHora(),
                visita.getSituacao(),
                visita.getPresencaConfirmadaEm(),
                solicitacoesReagendamento
        );
    }
}
