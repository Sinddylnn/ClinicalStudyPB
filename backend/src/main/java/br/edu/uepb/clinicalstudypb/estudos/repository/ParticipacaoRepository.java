package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;

// <-------------------HISTÓRICO DE INCLUSÕES------------------->
/**
 * Consulta inclusões históricas, sem depender da situação futura de retirada.
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
public interface ParticipacaoRepository extends JpaRepository<Participacao, Long> {
    /**
     * Confere se o estudo já recebeu uma inclusão em qualquer momento.
     *
     * @param estudoId identificador do estudo
     * @return se há ao menos uma participação registrada
     */
    boolean existsByEstudoId(Long estudoId);

    /** Verifica a inclusão histórica do candidato, mesmo após uma futura retirada. */
    boolean existsByCandidatoId(Long candidatoId);

    /** Conta inclusões históricas; uma retirada não libera a vaga. */
    long countByEstudoId(Long estudoId);

    /**
     * Conta as participações de um estudo em determinada situação.
     *
     * @param estudoId identificador do estudo
     * @param situacao situação da participação
     * @return quantidade de participações encontradas
     * @since 1.1
     */
    long countByEstudoIdAndSituacao(Long estudoId, SituacaoParticipacao situacao);

    boolean existsByEstudoIdAndParticipanteId(Long estudoId, Long participanteId);

    boolean existsByParticipanteId(Long participanteId);

    /** Lista as participações de um estudo, incluindo as retiradas. */
    List<Participacao> findByEstudoIdOrderByIdAsc(Long estudoId);

    // <-------------------CONSULTAS DO PARTICIPANTE------------------->

    /**
     * Lista as participações da conta, incluindo as retiradas, com o estudo já carregado.
     *
     * @param participanteId identificador da conta de participante
     * @return participações em ordem crescente de identificador
     * @since 1.1
     */
    @EntityGraph(attributePaths = "estudo")
    List<Participacao> findByParticipanteIdOrderByIdAsc(Long participanteId);
}
