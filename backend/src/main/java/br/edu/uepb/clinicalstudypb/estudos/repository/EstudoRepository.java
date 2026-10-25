package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Centraliza o acesso aos estudos persistidos no PostgreSQL.
 *
 * @author Luiz
 * @version 1.0
 * @since 25/10/2026
 */
public interface EstudoRepository extends JpaRepository<Estudo, Long> {

    /**
     * Lista os estudos vinculados a determinado pesquisador responsável.
     *
     * @param responsavelId identificador do pesquisador responsável
     * @return estudos associados ao pesquisador informado
     * @since 1.0
     */
    List<Estudo> findByResponsavelId(Long responsavelId);
}