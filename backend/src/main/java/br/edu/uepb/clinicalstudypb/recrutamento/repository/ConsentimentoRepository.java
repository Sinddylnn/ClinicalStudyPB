package br.edu.uepb.clinicalstudypb.recrutamento.repository;

import br.edu.uepb.clinicalstudypb.recrutamento.Consentimento;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------CONSULTA DO CONSENTIMENTO------------------->
/** Localiza a resposta atual e mantém as anteriores disponíveis para auditoria. */
public interface ConsentimentoRepository extends JpaRepository<Consentimento, Long> {
    Optional<Consentimento> findFirstByCandidatoIdOrderByIdDesc(Long candidatoId);
    List<Consentimento> findByCandidatoIdOrderByIdDesc(Long candidatoId);
}
