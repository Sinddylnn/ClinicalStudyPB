package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.time.Instant;

// <-------------------CONFIRMAÇÃO DE PRESENÇA------------------->
/**
 * Dados devolvidos depois da confirmação de presença.
 *
 * @param visitaAgendadaId identificador da visita
 * @param estudoId identificador do estudo
 * @param tituloEstudo título do estudo
 * @param nomeVisita nome da visita
 * @param dataHora data e hora agendadas
 * @param situacao situação da visita
 * @param presencaConfirmadaEm instante da confirmação
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
public record ConfirmacaoPresencaResposta(
        Long visitaAgendadaId,
        Long estudoId,
        String tituloEstudo,
        String nomeVisita,
        Instant dataHora,
        SituacaoVisita situacao,
        Instant presencaConfirmadaEm
) {
    /**
     * Converte uma visita agendada confirmada para a resposta da API.
     *
     * @param visita visita confirmada
     * @return dados públicos da confirmação
     */
    public static ConfirmacaoPresencaResposta de(VisitaAgendada visita) {
        return new ConfirmacaoPresencaResposta(
                visita.getId(),
                visita.getParticipacao().getEstudo().getId(),
                visita.getParticipacao().getEstudo().getTitulo(),
                visita.getVisitaPrevista().getNome(),
                visita.getDataHora(),
                visita.getSituacao(),
                visita.getPresencaConfirmadaEm());
    }
}
