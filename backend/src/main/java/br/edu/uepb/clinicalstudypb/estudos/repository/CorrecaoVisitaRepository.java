package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositório responsável pelas correções de situação das visitas.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public interface CorrecaoVisitaRepository
        extends JpaRepository<CorrecaoVisita, Long> {
}
