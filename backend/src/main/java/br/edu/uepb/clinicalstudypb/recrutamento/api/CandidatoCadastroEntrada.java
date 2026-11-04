package br.edu.uepb.clinicalstudypb.recrutamento.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// <-------------------CADASTRO DE CANDIDATO------------------->
public record CandidatoCadastroEntrada(

        @NotBlank(message = "Informe o nome do candidato.")
        @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
        String nome,

        @NotBlank(message = "Informe o e-mail do candidato.")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
        @Pattern(
                regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                message = "Informe um e-mail válido."
        )
        String email
) {

    public CandidatoCadastroEntrada {
        if (nome != null) {
            nome = nome.strip();
        }

        if (email != null) {
            email = email.strip();
        }
    }
}
