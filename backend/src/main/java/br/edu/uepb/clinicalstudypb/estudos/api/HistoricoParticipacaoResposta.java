package br.edu.uepb.clinicalstudypb.estudos.api;

import java.util.List;

/**
 * Representa o historico completo de uma participacao.
 *
 * @param participacaoId identificador da participacao
 * @param itens visitas e retirada em ordem cronologica
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
public record HistoricoParticipacaoResposta(
        Long participacaoId,
        List<ItemHistoricoResposta> itens
) {
}
