package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import org.springframework.data.jpa.repository.JpaRepository;

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
}
