package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Dados enviados pelo administrador para criar uma conta ativa.")
public record UsuarioCadastroEntrada(

        @Schema(description = "Nome do usuário, com até 255 caracteres.", example = "Ana Pesquisa")
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres.")
        String nome,

        @Schema(description = "E-mail único, com até 255 caracteres; espaços nas pontas e maiúsculas são normalizados.",
                example = "ana.pesquisa@example.test")
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "O e-mail informado é inválido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @Schema(description = "Senha inicial, com até 72 bytes em UTF-8. Acentos podem ocupar mais de um byte.",
                format = "password", accessMode = Schema.AccessMode.WRITE_ONLY)
        @NotBlank(message = "A senha é obrigatória.")
        String senha,

        @Schema(description = "Perfil atribuído pelo administrador.", example = "PESQUISADOR")
        @NotNull(message = "O perfil é obrigatório.")
        PerfilUsuario perfil
) {
}
