package br.edu.uepb.clinicalstudypb.recrutamento.repository;

import br.edu.uepb.clinicalstudypb.recrutamento.RespostaElegibilidade;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------REPOSITÓRIO DE RESPOSTAS------------------->
public interface RespostaElegibilidadeRepository
        extends JpaRepository<RespostaElegibilidade, Long> {

    // Lista as respostas registradas em uma avaliação.
    List<RespostaElegibilidade> findByAvaliacaoId(Long avaliacaoId);

    // Busca a resposta de um critério específico.
    Optional<RespostaElegibilidade> findByAvaliacaoIdAndCriterioId(
            Long avaliacaoId,
            Long criterioId
    );
}
