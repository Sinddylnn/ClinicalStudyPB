package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaCriterio;

// Representa um critério e sua resposta.
public record ItemAvaliacaoResposta(
        Long criterioId,
        TipoCriterio tipo,
        String descricao,
        RespostaCriterio resposta
) {
}
