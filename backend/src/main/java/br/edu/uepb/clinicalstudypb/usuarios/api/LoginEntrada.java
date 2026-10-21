package br.edu.uepb.clinicalstudypb.usuarios.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// <-------------------DADOS RECEBIDOS NO LOGIN------------------->
/**
 * Recebe as credenciais sem expor a entidade de usuário no contrato HTTP.
 *
 * @author Georis
 * @version 1.0
 * @param email endereço de acesso da conta
 * @param senha senha informada, que nunca deve ser registrada em logs
 * @since 21/10/2026
 */
public record LoginEntrada(
        @NotBlank(message = "Informe o e-mail.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 255, message = "O e-mail deve ter até 255 caracteres.") String email,
        @NotBlank(message = "Informe a senha.") String senha) {

    /**
     * Retira espaços nas pontas do e-mail sem modificar a senha informada.
     *
     * @param email endereço recebido da interface
     * @param senha senha original, incluindo seus espaços
     */
    public LoginEntrada {
        email = email == null ? null : email.trim();
    }
}
