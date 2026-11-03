package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------PROTOCOLO DO ESTUDO------------------->
/**
 * Consulta a configuração persistida para as condições de abertura do recrutamento.
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
public interface ProtocoloRepository extends JpaRepository<Protocolo, Long> {
    /**
     * Localiza o único protocolo do estudo, que pode ainda não ter sido criado.
     *
     * @param estudoId identificador do estudo
     * @return protocolo existente ou resultado vazio
     */
    Optional<Protocolo> findByEstudoId(Long estudoId);
}
