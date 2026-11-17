package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * Lista as visitas de uma participação em determinada situação.
     *
     * @param participacaoId identificador da participação
     * @param situacao situação procurada
     * @return visitas encontradas, ou lista vazia
     * @since 1.1
     */
    List<VisitaAgendada> findByParticipacao_IdAndSituacao(
            Long participacaoId, SituacaoVisita situacao);

    /**
     * Lista as visitas de uma participação em ordem de data e hora.
     *
     * @param participacaoId identificador da participação
     * @return lista de visitas ordenadas por data e hora
     * @since 1.0
     */
    List<VisitaAgendada> findByParticipacao_IdOrderByDataHoraAsc(
            Long participacaoId);

    /**
     * Conta as visitas de um estudo em determinada situação.
     *
     * @param estudoId identificador do estudo
     * @param situacao situação das visitas
     * @return quantidade de visitas encontradas
     * @since 1.0
     */
    long countByParticipacao_Estudo_IdAndSituacao(
            Long estudoId, SituacaoVisita situacao);

    /**
     * Lista os IDs dos participantes que possuem visitas em determinada situação no estudo.
     * A consulta não repete participantes com mais de uma visita pendente.
     *
     * @param estudoId identificador do estudo
     * @param situacao situação das visitas
     * @return IDs dos participantes encontrados, em ordem crescente
     * @since 1.0
     */
    @Query("""
            SELECT DISTINCT participante.id
            FROM VisitaAgendada visita
            JOIN visita.participacao participacao
            JOIN participacao.participante participante
            WHERE participacao.estudo.id = :estudoId
              AND visita.situacao = :situacao
            ORDER BY participante.id
            """)
    List<Long> findIdsParticipantesComVisitasNaSituacao(
            @Param("estudoId") Long estudoId,
            @Param("situacao") SituacaoVisita situacao);
}
