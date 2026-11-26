package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoRetirada;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------PEDIDOS DE RETIRADA VOLUNTÁRIA------------------->
/**
 * Repositório responsável pelos pedidos de retirada voluntária.
 *
 * <p>As consultas por estudo, usadas na listagem do coordenador e na contagem do RF07,
 * são acrescentadas pelas tasks que as utilizam.</p>
 * @author Georis
 * @version 1.0
 * @since 25/11/2026
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
     * Busca o pedido da participação na situação informada; há no máximo um PENDENTE.
     *
     * @param participacaoId identificador da participação
     * @param situacao situação procurada
     * @return o pedido, se existir
     */
    Optional<SolicitacaoRetirada> findByParticipacaoIdAndSituacao(
            Long participacaoId, SituacaoSolicitacao situacao);
}
