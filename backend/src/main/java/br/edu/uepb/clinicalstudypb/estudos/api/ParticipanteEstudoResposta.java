package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import java.time.LocalDate;

// <-------------------ESTUDO VISTO PELO PARTICIPANTE------------------->
/**
 * Representa um estudo em que o participante está ou esteve incluído.
 *
 * <p>Não expõe responsável, limite de vagas nem dados de outros participantes.</p>
 *
 * @param estudoId identificador do estudo
 * @param titulo título do estudo
 * @param objetivo objetivo do estudo
 * @param estado estado atual do estudo
 * @param dataInicio data prevista de início
 * @param dataFim data prevista de término
 * @param situacaoParticipacao situação da participação no estudo
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
public record ParticipanteEstudoResposta(
        Long estudoId,
        String titulo,
        String objetivo,
        EstadoEstudo estado,
        LocalDate dataInicio,
        LocalDate dataFim,
        SituacaoParticipacao situacaoParticipacao
) {

    /**
     * Converte uma participação nos dados exibidos no aplicativo.
     *
     * @param participacao participação da conta autenticada
     * @return estudo com a situação da participação
     */
    public static ParticipanteEstudoResposta de(Participacao participacao) {
        return new ParticipanteEstudoResposta(
                participacao.getEstudo().getId(),
                participacao.getEstudo().getTitulo(),
                participacao.getEstudo().getObjetivo(),
                participacao.getEstudo().getEstado(),
                participacao.getEstudo().getDataInicio(),
                participacao.getEstudo().getDataFim(),
                participacao.getSituacao()
        );
    }
}
