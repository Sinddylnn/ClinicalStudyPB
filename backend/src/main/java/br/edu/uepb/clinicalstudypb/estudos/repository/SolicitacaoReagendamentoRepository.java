package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoReagendamento;
import java.util.List;
import java.util.Optional;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// <-------------------PEDIDOS DE REAGENDAMENTO------------------->
/**
 * Repositório responsável pelos pedidos de reagendamento de visitas.
 *
 * <p>As consultas por estudo, usadas na listagem do coordenador e na contagem do RF07,
 * são acrescentadas pelas tasks que as utilizam.</p>
 * @author Georis
 * @version 1.1
 * @since 26/11/2026
 */
public interface SolicitacaoReagendamentoRepository
        extends JpaRepository<SolicitacaoReagendamento, Long> {

    /**
     * Lista os pedidos das visitas informadas, do mais recente para o mais antigo.
     *
     * @param visitaIds identificadores das visitas
     * @return pedidos das visitas, com todos os estados encerrados
     * @since 1.0
     */
    List<SolicitacaoReagendamento> findByVisitaAgendadaIdInOrderBySolicitadaEmDescIdDesc(
            Collection<Long> visitaIds);

    /**
     * Confere se a visita já tem um pedido na situação informada (use PENDENTE).
     *
     * @param visitaAgendadaId identificador da visita
     * @param situacao situação procurada
     * @return se existe ao menos um pedido nessa situação
     */
    boolean existsByVisitaAgendadaIdAndSituacao(Long visitaAgendadaId, SituacaoSolicitacao situacao);

    /**
     * Busca o pedido pendente da visita; o índice único parcial garante no máximo um
     *
     * @param visitaAgendadaId identificador da visita
     * @return o pedido pendente, se existir
     * @since 1.1
     */
    @Query("""
            SELECT s FROM SolicitacaoReagendamento s
            WHERE s.visitaAgendada.id = :visitaAgendadaId
              AND s.situacao = br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao.PENDENTE
            """)
    Optional<SolicitacaoReagendamento> buscarPendentePorVisita(
            @Param("visitaAgendadaId") Long visitaAgendadaId);

    /**
     * Lista os pedidos de uma participação em uma situação, usado para cancelar os pendentes na retirada.
     *
     * @param participacaoId identificador da participação
     * @param situacao situação procurada
     * @return pedidos encontrados, do mais antigo para o mais recente
     */
    List<SolicitacaoReagendamento> findByVisitaAgendada_Participacao_IdAndSituacaoOrderByIdAsc(
            Long participacaoId, SituacaoSolicitacao situacao);
}
