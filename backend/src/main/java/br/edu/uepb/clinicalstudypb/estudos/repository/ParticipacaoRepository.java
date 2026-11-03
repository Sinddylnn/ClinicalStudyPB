package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------HISTÓRICO DE INCLUSÕES------------------->
/**
 * Consulta inclusões históricas, sem depender da situação futura de retirada.
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
public interface ParticipacaoRepository extends JpaRepository<Participacao, Long> {
    /**
     * Confere se o estudo já recebeu uma inclusão em qualquer momento.
     *
     * @param estudoId identificador do estudo
     * @return se há ao menos uma participação registrada
     */
    boolean existsByEstudoId(Long estudoId);
}
