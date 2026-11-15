package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositório responsável pelas consultas de visitas agendadas.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
public interface VisitaAgendadaRepository extends JpaRepository<VisitaAgendada, Long> {

    /**
    * Verifica se uma visita prevista já possui agendamento
    * em determinada situação para uma participação.
    *
    * @param participacaoId identificador da participação
    * @param visitaPrevistaId identificador da visita prevista
    * @param situacao situação da visita
    * @return true se existir agendamento correspondente
    * @since 1.0
    */
    boolean existsByParticipacaoIdAndVisitaPrevistaIdAndSituacao(
            Long participacaoId,
            Long visitaPrevistaId,
            SituacaoVisita situacao);

    /**
     * Lista as visitas de uma participação em ordem de data e hora.
     *
     * @param participacaoId identificador da participação
     * @return lista de visitas ordenadas por data e hora
     * @since 1.0
     */
    List<VisitaAgendada> findByParticipacao_IdOrderByDataHoraAsc(
            Long participacaoId);
}
