package br.edu.uepb.clinicalstudypb.estudos.api;

import java.time.Instant;

import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;

/**
 * Representa os dados de uma correção de visita.
 *
 * @author Luiz
 * @version 1.0
 * @since 15/11/2026
 */
public record CorrecaoVisitaResposta(
        Long id,
        Long visitaAgendadaId,
        SituacaoVisita situacaoAnterior,
        SituacaoVisita situacaoNova,
        String justificativa,
        String motivoAnterior,
        String motivoNovo,
        Long corrigidaPorId,
        String corrigidaPorNome,
        Instant corrigidaEm
) {
    /**
     * Mantém o construtor original para chamadas que não informam os motivos nem o nome.
     *
     * @param id identificador da correção
     * @param visitaAgendadaId identificador da visita
     * @param situacaoAnterior situação anterior
     * @param situacaoNova situação corrigida
     * @param justificativa justificativa da correção
     * @param corrigidaPorId identificador de quem corrigiu
     * @param corrigidaEm instante da correção
     * @since 1.0
     */
    public CorrecaoVisitaResposta(
            Long id,
            Long visitaAgendadaId,
            SituacaoVisita situacaoAnterior,
            SituacaoVisita situacaoNova,
            String justificativa,
            Long corrigidaPorId,
            Instant corrigidaEm) {
        this(id, visitaAgendadaId, situacaoAnterior, situacaoNova, justificativa,
                null, null, corrigidaPorId, null, corrigidaEm);
    }

    /**
     * Mantém o construtor com os motivos, sem exigir o nome do responsável.
     *
     * @param id identificador da correção
     * @param visitaAgendadaId identificador da visita
     * @param situacaoAnterior situação anterior
     * @param situacaoNova situação corrigida
     * @param justificativa justificativa da correção
     * @param motivoAnterior motivo anterior à correção
     * @param motivoNovo motivo após a correção
     * @param corrigidaPorId identificador de quem corrigiu
     * @param corrigidaEm instante da correção
     * @since 1.0
     */
    public CorrecaoVisitaResposta(
            Long id,
            Long visitaAgendadaId,
            SituacaoVisita situacaoAnterior,
            SituacaoVisita situacaoNova,
            String justificativa,
            String motivoAnterior,
            String motivoNovo,
            Long corrigidaPorId,
            Instant corrigidaEm) {
        this(id, visitaAgendadaId, situacaoAnterior, situacaoNova, justificativa,
                motivoAnterior, motivoNovo, corrigidaPorId, null, corrigidaEm);
    }

    /**
     * Converte uma correção para o formato de resposta da API.
     *
     * @param correcao correção registrada
     * @return dados da correção
     * @since 1.0
     */
    public static CorrecaoVisitaResposta de(CorrecaoVisita correcao) {
        Usuario responsavel = correcao.getCorrigidaPor();
        return new CorrecaoVisitaResposta(
                correcao.getId(),
                correcao.getVisitaAgendada().getId(),
                correcao.getSituacaoAnterior(),
                correcao.getSituacaoNova(),
                correcao.getJustificativa(),
                correcao.getMotivoAnterior(),
                correcao.getMotivoNovo(),
                responsavel.getId(),
                responsavel.getNome(),
                correcao.getCorrigidaEm()
        );
    }
}
