package br.edu.uepb.clinicalstudypb.estudos.api;

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
public record IndicadoresPainelResposta(
        Long estudoId,
        long totalCandidatos,
        long totalIncluidos,
        long participantesAtivos,
        long participantesRetirados,
        long visitasRealizadas,
        long visitasPendentes
) {
}