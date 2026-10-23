package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
@Schema(description = "Dados editáveis da conta; esta operação não recebe senha nem situação ativo.")
public record UsuarioEdicaoEntrada(

        @Schema(description = "Nome atualizado, com até 255 caracteres.", example = "Ana Pesquisa")
        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres.")
        String nome,

        @Schema(description = "E-mail único, com até 255 caracteres.", example = "ana.pesquisa@example.test")
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "O e-mail informado é inválido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @Schema(description = "Novo perfil; não pode remover o último administrador ativo.", example = "PESQUISADOR")
        @NotNull(message = "O perfil é obrigatório.")
        PerfilUsuario perfil
) {
}
