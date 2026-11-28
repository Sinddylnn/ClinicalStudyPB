package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repositório responsável pelas consultas de visitas agendadas.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
public interface VisitaAgendadaRepository extends JpaRepository<VisitaAgendada, Long> {

    /**
     * Identifica o estudo da visita quando ela pertence à participação da conta.
     *
     * @param visitaId identificador da visita
     * @param participanteId identificador da conta participante
     * @return identificador do estudo, ou resultado vazio
     * @since 1.0
     */
    @Query("""
            SELECT p.estudo.id FROM VisitaAgendada v JOIN v.participacao p
            WHERE v.id = :visitaId AND p.participante.id = :participanteId
            """)
    Optional<Long> buscarEstudoIdDaVisitaDoParticipante(
            @Param("visitaId") Long visitaId,
            @Param("participanteId") Long participanteId);

    /**
    * Verifica se uma visita prevista já possui agendamento
    * em determinada situação para uma participação.
    *
    * @param participacaoId identificador da participação
    * @param visitaPrevistaId identificador da visita prevista
    * @param situacao situação da visita
    * @return true se existir agendamento correspondente
    * @since 1.0
    */
    boolean existsByParticipacaoIdAndVisitaPrevistaIdAndSituacao(
            Long participacaoId,
            Long visitaPrevistaId,
            SituacaoVisita situacao);

    /**
     * Lista as visitas de uma participação em determinada situação.
     *
     * @param participacaoId identificador da participação
     * @param situacao situação procurada
     * @return visitas encontradas, ou lista vazia
     * @since 1.1
     */
    List<VisitaAgendada> findByParticipacao_IdAndSituacao(
            Long participacaoId, SituacaoVisita situacao);

    /**
     * Lista as visitas de uma participação em ordem de data e hora,
     * carregando a visita prevista e o responsável pelo registro na mesma consulta.
     *
     * @param participacaoId identificador da participação
     * @return lista de visitas ordenadas por data, hora e ID
     * @since 1.0
     */
    @Query("""
            SELECT v FROM VisitaAgendada v
            JOIN FETCH v.visitaPrevista
            LEFT JOIN FETCH v.registradoPor
            WHERE v.participacao.id = :participacaoId
            ORDER BY v.dataHora ASC, v.id ASC
            """)
    List<VisitaAgendada> findByParticipacao_IdOrderByDataHoraAsc(
            @Param("participacaoId") Long participacaoId);

    /**
     * Conta as visitas de um estudo em determinada situação.
     *
     * @param estudoId identificador do estudo
     * @param situacao situação das visitas
     * @return quantidade de visitas encontradas
     * @since 1.0
     */
    long countByParticipacao_Estudo_IdAndSituacao(
            Long estudoId, SituacaoVisita situacao);

    /**
     * Lista os IDs dos participantes que possuem visitas em determinada situação no estudo.
     * A consulta não repete participantes com mais de uma visita pendente.
     *
     * @param estudoId identificador do estudo
     * @param situacao situação das visitas
     * @return IDs dos participantes encontrados, em ordem crescente
     * @since 1.0
     */
    @Query("""
            SELECT DISTINCT participante.id
            FROM VisitaAgendada visita
            JOIN visita.participacao participacao
            JOIN participacao.participante participante
            WHERE participacao.estudo.id = :estudoId
              AND visita.situacao = :situacao
            ORDER BY participante.id
            """)
    List<Long> findIdsParticipantesComVisitasNaSituacao(
            @Param("estudoId") Long estudoId,
            @Param("situacao") SituacaoVisita situacao);

    // <-------------------CONSULTAS DO PARTICIPANTE------------------->

    /**
     * Lista as visitas pendentes das participações a partir do instante informado.
     *
     * @param participacaoIds participações da conta autenticada
     * @param situacao situação procurada, normalmente AGENDADA
     * @param inicio instante inicial de consulta
     * @return visitas da mais próxima para a mais distante
     * @since 1.1
     */
    @Query("""
            SELECT v FROM VisitaAgendada v
            JOIN FETCH v.visitaPrevista
            JOIN FETCH v.participacao p
            JOIN FETCH p.estudo
            WHERE p.id IN :participacaoIds
              AND v.situacao = :situacao
              AND v.dataHora >= :inicio
            ORDER BY v.dataHora ASC, v.id ASC
            """)
    List<VisitaAgendada> buscarProximasDasParticipacoes(
            @Param("participacaoIds") Collection<Long> participacaoIds,
            @Param("situacao") SituacaoVisita situacao,
            @Param("inicio") Instant inicio);

    /**
     * Lista as visitas registradas nas situações incluídas no histórico.
     *
     * @param participacaoIds participações da conta autenticada
     * @param situacoes situações que fazem parte do histórico
     * @return visitas da mais recente para a mais antiga
     * @since 1.1
     */
    @Query("""
            SELECT v FROM VisitaAgendada v
            JOIN FETCH v.visitaPrevista
            JOIN FETCH v.participacao p
            JOIN FETCH p.estudo
            WHERE p.id IN :participacaoIds
              AND v.situacao IN :situacoes
            ORDER BY v.dataHora DESC, v.id DESC
            """)
    List<VisitaAgendada> buscarHistoricoDasParticipacoes(
            @Param("participacaoIds") Collection<Long> participacaoIds,
            @Param("situacoes") Collection<SituacaoVisita> situacoes);
}
