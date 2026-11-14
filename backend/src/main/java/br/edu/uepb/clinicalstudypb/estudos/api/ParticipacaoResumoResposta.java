package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import java.time.Instant;

// <-------RESUMO DE PARTICIPACOES------->
/**
 * Representa os dados de uma participação na listagem de um estudo.
 *
 * @param id identificador da participação
 * @param participanteId identificador do participante
 * @param participanteNome nome do participante
 * @param dataInclusao data em que o participante foi incluído
 * @param situacao situação atual da participação
 * @param dataRetirada data da retirada, quando houver
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
public record ParticipacaoResumoResposta(
        Long id,
        Long participanteId,
        String participanteNome,
        Instant dataInclusao,
        SituacaoParticipacao situacao,
        Instant dataRetirada
) {

    // <-------CONVERSAO PARA RESPOSTA------->
    /**
     * Converte uma participação nos dados utilizados pela listagem.
     *
     * @param participacao participação a ser convertida
     * @return resumo da participação
     * @since 1.0
     */
    public static ParticipacaoResumoResposta de(Participacao participacao) {
        return new ParticipacaoResumoResposta(
                participacao.getId(),
                participacao.getParticipante().getId(),
                participacao.getParticipante().getNome(),
                participacao.getDataInclusao(),
                participacao.getSituacao(),
                participacao.getDataRetirada()
        );
    }
}
