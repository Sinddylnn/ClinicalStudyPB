package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import java.util.List;
import java.util.Optional;
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

    /**
     * Lista somente os estudos atribuídos ao coordenador informado.
     *
     * @param coordenadorId identificador do coordenador autenticado
     * @return estudos vinculados à conta, ou lista vazia
     * @since 1.0
     */
    List<Estudo> findByCoordenadorId(Long coordenadorId);

    /**
     * Localiza um estudo sem permitir acesso a outro pesquisador.
     *
     * @param id identificador do estudo
     * @param responsavelId identificador do pesquisador autenticado
     * @return estudo próprio, ou resultado vazio
     * @since 1.0
     */
    Optional<Estudo> findByIdAndResponsavelId(Long id, Long responsavelId);

    /**
     * Verifica vínculos que impedem retirar o perfil de pesquisador.
     *
     * @param responsavelId identificador da conta em edição
     * @return {@code true} quando a conta é responsável por algum estudo
     * @since 1.0
     */
    boolean existsByResponsavelId(Long responsavelId);

    /**
     * Verifica vínculos que impedem retirar o perfil de coordenador.
     *
     * @param coordenadorId identificador da conta em edição
     * @return {@code true} quando a conta coordena algum estudo
     * @since 1.0
     */
    boolean existsByCoordenadorId(Long coordenadorId);
}
