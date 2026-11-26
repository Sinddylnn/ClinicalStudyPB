package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoRetirada;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// <-------------------PEDIDOS DE RETIRADA VOLUNTÁRIA------------------->
/**
 * Repositório responsável pelos pedidos de retirada voluntária.
 *
 * <p>As consultas por estudo, usadas na listagem do coordenador e na contagem do RF07,
 * são acrescentadas pelas tasks que as utilizam.</p>
 * @author Georis
 * @version 1.1
 * @since 26/11/2026
 */
public interface SolicitacaoRetiradaRepository
        extends JpaRepository<SolicitacaoRetirada, Long> {

    /**
     * Confere se a participação já tem um pedido na situação informada (use PENDENTE).
     *
     * @param participacaoId identificador da participação
     * @param situacao situação procurada
     * @return se existe ao menos um pedido nessa situação
     */
    boolean existsByParticipacaoIdAndSituacao(Long participacaoId, SituacaoSolicitacao situacao);

    /**
     * Busca o pedido pendente da participação; o índice único parcial garante no máximo um
     *
     * @param participacaoId identificador da participação
     * @return o pedido pendente, se existir
     * @since 1.1
     */
    @Query("""
            SELECT s FROM SolicitacaoRetirada s
            WHERE s.participacao.id = :participacaoId
              AND s.situacao = br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao.PENDENTE
            """)
    Optional<SolicitacaoRetirada> buscarPendentePorParticipacao(
            @Param("participacaoId") Long participacaoId);
}
