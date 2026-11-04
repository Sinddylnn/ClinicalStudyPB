package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoElegibilidade;
import java.time.LocalDateTime;
import java.util.List;

// Resultado completo da avaliação do candidato.
public record AvaliacaoElegibilidadeResposta(
        CandidatoResposta candidato,
        SituacaoElegibilidade situacao,
        List<ItemAvaliacaoResposta> itens,
        String avaliadoPor,
        LocalDateTime avaliadoEm
) {
}
