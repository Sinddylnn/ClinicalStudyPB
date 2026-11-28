package br.edu.uepb.clinicalstudypb.estudos.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Representa os indicadores do painel de um estudo.
 *
 * @param estudoId identificador do estudo
 * @param totalCandidatos quantidade de candidatos cadastrados
 * @param totalIncluidos total histórico de participantes incluídos
 * @param participantesAtivos quantidade de participantes ativos
 * @param participantesRetirados quantidade de participantes retirados
 * @param visitasRealizadas quantidade de visitas realizadas
 * @param visitasPendentes quantidade de visitas agendadas, inclusive com data passada
 * @author Luiz
 * @version 1.0
 * @since 26/11/2026
 */
@Schema(description = "Indicadores de recrutamento e acompanhamento de um estudo.")
public record IndicadoresPainelResposta(
        @Schema(description = "Identificador do estudo.", example = "10")
        Long estudoId,
        @Schema(description = "Total de candidatos cadastrados no estudo.", example = "8")
        long totalCandidatos,
        @Schema(description = "Total histórico de participantes incluídos, inclusive os retirados.", example = "5")
        long totalIncluidos,
        @Schema(description = "Quantidade de participações na situação ATIVA.", example = "3")
        long participantesAtivos,
        @Schema(description = "Quantidade de participações na situação RETIRADA.", example = "2")
        long participantesRetirados,
        @Schema(description = "Quantidade de visitas na situação REALIZADA.", example = "7")
        long visitasRealizadas,
        @Schema(description = "Quantidade de visitas na situação AGENDADA, inclusive com data passada.", example = "4")
        long visitasPendentes
) {
}
