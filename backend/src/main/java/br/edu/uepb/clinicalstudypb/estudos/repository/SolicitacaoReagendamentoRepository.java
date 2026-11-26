package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoReagendamento;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

// <-------------------PEDIDOS DE REAGENDAMENTO------------------->
/**
 * Repositório responsável pelos pedidos de reagendamento de visitas.
 *
 * <p>As consultas por estudo, usadas na listagem do coordenador e na contagem do RF07,
 * são acrescentadas pelas tasks que as utilizam.</p>
 * @author Georis
 * @version 1.0
 * @since 25/11/2026
 */
public interface SolicitacaoReagendamentoRepository
        extends JpaRepository<SolicitacaoReagendamento, Long> {

    /**
     * Confere se a visita já tem um pedido na situação informada (use PENDENTE).
     *
     * @param visitaAgendadaId identificador da visita
     * @param situacao situação procurada
     * @return se existe ao menos um pedido nessa situação
     */
    boolean existsByVisitaAgendadaIdAndSituacao(Long visitaAgendadaId, SituacaoSolicitacao situacao);

    /**
     * Busca o pedido da visita na situação informada; há no máximo um PENDENTE por visita.
     *
     * @param visitaAgendadaId identificador da visita
     * @param situacao situação procurada
     * @return o pedido, se existir
     */
    Optional<SolicitacaoReagendamento> findByVisitaAgendadaIdAndSituacao(
            Long visitaAgendadaId, SituacaoSolicitacao situacao);

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
