package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;

/**
 * Representa a retirada de um participante no histórico.
 *
 * @param tipo tipo do item, identificado como RETIRADA
 * @param dataRetirada data e hora da retirada
 * @param motivo motivo informado na retirada
 * @param retiradaPorId identificador do responsável pela retirada
 * @param retiradaPorNome nome do responsável pela retirada
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
public record ItemHistoricoRetiradaResposta(
        String tipo,
        Instant dataRetirada,
        String motivo,
        Long retiradaPorId,
        String retiradaPorNome
) implements ItemHistoricoResposta {

    /**
     * Mantém a compatibilidade com chamadas anteriores que informam apenas o ID.
     *
     * @param tipo tipo do item
     * @param dataRetirada data e hora da retirada
     * @param motivo motivo informado na retirada
     * @param retiradaPorId identificador do responsável pela retirada
     * @since 1.0
     */
    public ItemHistoricoRetiradaResposta(
            String tipo,
            Instant dataRetirada,
            String motivo,
            Long retiradaPorId) {
        this(tipo, dataRetirada, motivo, retiradaPorId, null);
    }

    /**
     * Converte uma participação retirada em um item do histórico.
     *
     * @param participacao participação com retirada registrada
     * @return item correspondente à retirada
     * @since 1.0
     */
    public static ItemHistoricoRetiradaResposta de(Participacao participacao) {
        Usuario responsavel = participacao.getRetiradaPor();
        return new ItemHistoricoRetiradaResposta(
                "RETIRADA",
                participacao.getDataRetirada(),
                participacao.getMotivoRetirada(),
                responsavel.getId(),
                responsavel.getNome()
        );
    }
}
