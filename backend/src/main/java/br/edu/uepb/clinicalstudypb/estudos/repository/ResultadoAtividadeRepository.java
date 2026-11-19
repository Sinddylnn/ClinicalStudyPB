package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repositório responsável pelos resultados das atividades.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public interface ResultadoAtividadeRepository
        extends JpaRepository<ResultadoAtividade, Long> {

    /**
     * Verifica se uma visita possui resultados registrados.
     *
     * @param visitaAgendadaId identificador da visita
     * @return true se existir algum resultado vinculado
     * @since 1.0
     */
    boolean existsByVisitaAgendada_Id(Long visitaAgendadaId);

    /**
     * Verifica se uma atividade já possui resultado na visita.
     *
     * @param visitaAgendadaId identificador da visita
     * @param atividadePrevistaId identificador da atividade prevista
     * @return true se já existir resultado para a atividade na visita
     * @since 1.0
     */
    boolean existsByVisitaAgendada_IdAndAtividadePrevista_Id(
            Long visitaAgendadaId, Long atividadePrevistaId);

    /**
     * Busca um resultado vinculado à visita informada.
     *
     * @param id identificador do resultado
     * @param visitaAgendadaId identificador da visita
     * @return resultado encontrado, quando pertencer à visita
     * @since 1.0
     */
    Optional<ResultadoAtividade> findByIdAndVisitaAgendada_Id(
            Long id, Long visitaAgendadaId);

    /**
     * Lista os resultados das visitas de uma participação.
     *
     * @param participacaoId identificador da participação
     * @return resultados ordenados por visita e atividade
     * @since 1.0
     */
    @Query("""
            SELECT r FROM ResultadoAtividade r
            JOIN FETCH r.visitaAgendada v
            JOIN FETCH r.atividadePrevista a
            WHERE v.participacao.id = :participacaoId
            ORDER BY v.id ASC, a.id ASC, r.id ASC
            """)
    List<ResultadoAtividade> buscarResultadosDaParticipacao(
            @Param("participacaoId") Long participacaoId);
}
