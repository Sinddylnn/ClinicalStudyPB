package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Recebe os dados que podem ser alterados em um usuário existente.
 *
 * @param nome nome atualizado do usuário
 * @param email endereço de e-mail atualizado
 * @param perfil perfil de acesso atribuído ao usuário
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
public record UsuarioEdicaoEntrada(

        @NotBlank(message = "O nome é obrigatório.")
        String nome,

        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "O e-mail informado é inválido.")
        String email,

        @NotNull(message = "O perfil é obrigatório.")
        PerfilUsuario perfil
) {
}