package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// <-------------------CRITÉRIOS POR PROTOCOLO------------------->
/**
 * Consulta os critérios utilizados na verificação de completude do protocolo.
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
public interface CriterioRepository extends JpaRepository<Criterio, Long> {
    /**
     * Verifica a existência de inclusão ou exclusão no protocolo informado.
     *
     * @param protocoloId identificador do protocolo
     * @param tipo        finalidade do critério
     * @return se existe pelo menos um critério desse tipo
     */
    boolean existsByProtocoloIdAndTipo(Long protocoloId, TipoCriterio tipo);

    /**
     * Lista os critérios cadastrados no protocolo pela ordem de criação.
     *
     * @param protocoloId identificador do protocolo
     * @return critérios vinculados ao protocolo
     */
    List<Criterio> findByProtocoloIdOrderByIdAsc(Long protocoloId);

    java.util.Optional<Criterio> findByIdAndProtocoloId(Long id, Long protocoloId);
}
