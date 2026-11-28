package br.edu.uepb.clinicalstudypb.recrutamento.repository;

import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------REPOSITÓRIO DE CANDIDATOS------------------->
/**
 * Acesso aos candidatos cadastrados nos estudos.
 *
 * @author Luiz
 * @version 1.0
 * @since 04/11/2026
 */
public interface CandidatoRepository extends JpaRepository<Candidato, Long> {

    // Lista os candidatos vinculados ao estudo.
    List<Candidato> findByEstudoIdOrderByIdAsc(Long estudoId);

    // Verifica se o e-mail já foi cadastrado no mesmo estudo.
    boolean existsByEstudoIdAndEmailIgnoreCase(Long estudoId, String email);

    /**
     * Conta os candidatos cadastrados em um estudo.
     *
     * @param estudoId identificador do estudo
     * @return quantidade de candidatos cadastrados
     * @since 1.1
     */
    long countByEstudoId(Long estudoId);
}
