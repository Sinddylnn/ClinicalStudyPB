package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repositório responsável pelas correções de situação das visitas.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public interface CorrecaoVisitaRepository
        extends JpaRepository<CorrecaoVisita, Long> {

    /**
     * Lista as correções das visitas de uma participação.
     *
     * @param participacaoId identificador da participação
     * @return correções ordenadas da mais antiga para a mais recente
     * @since 1.0
     */
    @Query("""
            SELECT c FROM CorrecaoVisita c
            JOIN FETCH c.visitaAgendada v
            JOIN FETCH c.corrigidaPor
            WHERE v.participacao.id = :participacaoId
            ORDER BY c.corrigidaEm ASC, c.id ASC
            """)
    List<CorrecaoVisita> buscarCorrecoesDaParticipacao(
            @Param("participacaoId") Long participacaoId);
}
