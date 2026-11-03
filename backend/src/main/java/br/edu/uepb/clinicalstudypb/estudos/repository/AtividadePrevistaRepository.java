package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------ATIVIDADES PREVISTAS------------------->
/**
 * Acessa as atividades vinculadas às visitas previstas do protocolo.
 *
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public interface AtividadePrevistaRepository
        extends JpaRepository<AtividadePrevista, Long> {

    List<AtividadePrevista> findByVisitaPrevistaIdOrderByIdAsc(Long visitaPrevistaId);
}
