package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// <-------------------COMPLETUDE DAS VISITAS PREVISTAS------------------->
/**
 * Verifica modelos de visita sem confundi-los com visitas agendadas de participantes.
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
public interface VisitaPrevistaRepository extends JpaRepository<VisitaPrevista, Long> {
    /**
     * Confere se o protocolo já possui alguma visita prevista.
     *
     * @param protocoloId identificador do protocolo
     * @return se existe ao menos uma visita
     */
    boolean existsByProtocoloId(Long protocoloId);

    /**
     * Identifica visitas incompletas para orientar a mensagem devolvida à web.
     *
     * @param protocoloId identificador do protocolo
     * @return nomes das visitas sem atividade, na ordem de apresentação
     */
    @Query("select v.nome from VisitaPrevista v where v.protocolo.id = :protocoloId "
            + "and not exists (select a.id from AtividadePrevista a where a.visitaPrevista.id = v.id) "
            + "order by v.ordem")
    List<String> buscarNomesSemAtividades(@Param("protocoloId") Long protocoloId);
}
