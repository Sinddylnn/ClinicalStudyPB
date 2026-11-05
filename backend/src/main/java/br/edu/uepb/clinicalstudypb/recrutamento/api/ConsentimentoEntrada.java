package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.recrutamento.RespostaConsentimento;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
/** Recebe uma resposta explícita e uma observação opcional. */
public record ConsentimentoEntrada(
        @NotNull(message = "Informe ACEITOU ou RECUSOU.") RespostaConsentimento resposta,
        @Size(max = 500, message = "A observação deve ter no máximo 500 caracteres.") String observacao) {
    public ConsentimentoEntrada {
        if (observacao != null) {
            observacao = observacao.strip();
            if (observacao.isEmpty()) observacao = null;
        }
    }
}
