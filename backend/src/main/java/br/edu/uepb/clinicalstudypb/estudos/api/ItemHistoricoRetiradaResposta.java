package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import java.time.Instant;

/**
 * Representa a retirada de um participante no historico.
 *
 * @param tipo tipo do item, identificado como RETIRADA
 * @param dataRetirada data e hora da retirada
 * @param motivo motivo informado na retirada
 * @param retiradaPorId identificador do responsavel pela retirada
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
public record ItemHistoricoRetiradaResposta(
        String tipo,
        Instant dataRetirada,
        String motivo,
        Long retiradaPorId
) implements ItemHistoricoResposta {

    /**
     * Converte uma participacao retirada em um item do historico.
     *
     * @param participacao participacao com retirada registrada
     * @return item correspondente a retirada
     * @since 1.0
     */
    public static ItemHistoricoRetiradaResposta de(Participacao participacao) {
        return new ItemHistoricoRetiradaResposta(
                "RETIRADA",
                participacao.getDataRetirada(),
                participacao.getMotivoRetirada(),
                participacao.getRetiradaPor().getId()
        );
    }
}
