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
        @NotBlank(message = "Informe o nome completo.")
        @Size(max = 255, message = "O nome deve ter no máximo 255 caracteres.")
        String nome,

        @Schema(description = "E-mail único, com até 255 caracteres.", example = "ana.pesquisa@example.test")
        @NotBlank(message = "Informe um e-mail válido, como nome@exemplo.com.")
        @Email(message = "Informe um e-mail válido, como nome@exemplo.com.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @Schema(description = "Novo perfil; não pode remover o último administrador ativo "
                + "nem tornar incompatíveis os vínculos como responsável ou coordenador de estudos.",
                example = "PESQUISADOR")
        @NotNull(message = "Selecione um perfil.")
        PerfilUsuario perfil
) {

    /**
     * Remove espaços das extremidades antes da validação dos campos textuais.
     */
    public UsuarioEdicaoEntrada {
        if (nome != null) {
            nome = nome.trim();
        }

        if (email != null) {
            email = email.trim();
        }
    }
}
