package br.edu.uepb.clinicalstudypb.recrutamento.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
/** Identifica a conta de participante escolhida pelo coordenador. */
public record InclusaoEntrada(
        @NotNull(message = "Escolha uma conta de participante.")
        @Positive(message = "Informe um identificador válido.") Long contaId) { }
