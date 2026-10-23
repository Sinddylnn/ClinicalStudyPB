package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Recebe os dados necessários para cadastrar um usuário.
 *
 * @param nome nome do usuário
 * @param email endereço de e-mail utilizado no acesso
 * @param senha senha inicial informada para a nova conta
 * @param perfil perfil de acesso atribuído ao usuário
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
public record UsuarioCadastroEntrada(

        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres.")
        String nome,

        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "O e-mail informado é inválido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @NotBlank(message = "A senha é obrigatória.")
        String senha,

        @NotNull(message = "O perfil é obrigatório.")
        PerfilUsuario perfil
) {
}
