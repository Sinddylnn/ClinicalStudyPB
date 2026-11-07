package br.edu.uepb.clinicalstudypb.recrutamento.repository;

import br.edu.uepb.clinicalstudypb.recrutamento.AvaliacaoElegibilidade;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------REPOSITÓRIO DE AVALIAÇÕES------------------->
public interface AvaliacaoElegibilidadeRepository
        extends JpaRepository<AvaliacaoElegibilidade, Long> {

    // Busca a avaliação vinculada ao candidato.
    Optional<AvaliacaoElegibilidade> findByCandidatoId(Long candidatoId);
}
