package br.edu.uepb.clinicalstudypb.estudos.api;

import java.time.Instant;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;

// <-------------------RESULTADO DA RETIRADA------------------->
/**
 * Representa a participação após o registro da retirada.
 *
 * @param participacaoId identificador da participação
 * @param situacao situação atual da participação
 * @param dataRetirada instante registrado pelo backend
 * @param motivoRetirada motivo normalizado
 * @param retiradaPorId coordenador que registrou a retirada
 * @author Georis
 * @version 1.0
 * @since 16/11/2026
 */
public record RetiradaResposta(
        Long participacaoId,
        SituacaoParticipacao situacao,
        Instant dataRetirada,
        String motivoRetirada,
        Long retiradaPorId
) {

    /**
     * Converte a participação retirada para o formato devolvido pela API.
     *
     * @param participacao participação já marcada como retirada
     * @return dados da retirada
     */
    public static RetiradaResposta de(Participacao participacao) {
        return new RetiradaResposta(
                participacao.getId(),
                participacao.getSituacao(),
                participacao.getDataRetirada(),
                participacao.getMotivoRetirada(),
                participacao.getRetiradaPor().getId()
        );
    }
}
