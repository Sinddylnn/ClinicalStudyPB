package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoReagendamento;
import java.time.Instant;

// <-------------------PEDIDO DE REAGENDAMENTO NO APLICATIVO------------------->
/**
 * Dados públicos de um pedido de reagendamento exibido ao participante.
 *
 * @param id identificador do pedido
 * @param situacao situação atual do pedido
 * @param dataHoraOriginal data da visita no momento do pedido
 * @param dataHoraDesejada nova data desejada pelo participante
 * @param motivo motivo opcional informado
 * @param solicitadaEm instante da solicitação
 * @param dataHoraAprovada data aprovada pelo coordenador
 * @param justificativaRecusa justificativa da recusa
 * @param encerradaEm instante de encerramento do pedido
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
public record SolicitacaoReagendamentoParticipanteResposta(
        Long id,
        SituacaoSolicitacao situacao,
        Instant dataHoraOriginal,
        Instant dataHoraDesejada,
        String motivo,
        Instant solicitadaEm,
        Instant dataHoraAprovada,
        String justificativaRecusa,
        Instant encerradaEm
) {
    /**
     * Converte um pedido sem expor o usuário que respondeu.
     *
     * @param pedido pedido persistido
     * @return dados públicos do pedido
     */
    public static SolicitacaoReagendamentoParticipanteResposta de(
            SolicitacaoReagendamento pedido) {
        return new SolicitacaoReagendamentoParticipanteResposta(
                pedido.getId(),
                pedido.getSituacao(),
                pedido.getDataHoraOriginal(),
                pedido.getDataHoraDesejada(),
                pedido.getMotivo(),
                pedido.getSolicitadaEm(),
                pedido.getDataHoraAprovada(),
                pedido.getJustificativaRecusa(),
                pedido.getEncerradaEm());
    }
}
