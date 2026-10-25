package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Representa os dados de um usuário devolvidos pela API.
 *
 * <p>A resposta não expõe o hash da senha armazenado no banco.</p>
 *
 * @param id identificador do usuário
 * @param nome nome cadastrado
 * @param email endereço de e-mail cadastrado
 * @param perfil perfil de acesso do usuário
 * @param ativo situação atual da conta
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
@Schema(description = "Dados públicos da conta. Não contém senha nem hash BCrypt.")
public record UsuarioResposta(
        @Schema(description = "Identificador gerado pelo banco.", example = "2")
        Long id,
        @Schema(description = "Nome cadastrado.", example = "Ana Pesquisa")
        String nome,
        @Schema(description = "E-mail normalizado.", example = "ana.pesquisa@example.test")
        String email,
        @Schema(description = "Perfil de acesso.", example = "PESQUISADOR")
        PerfilUsuario perfil,
        @Schema(description = "Indica se a conta pode acessar o sistema.", example = "true")
        boolean ativo
) {

    /**
     * Converte uma entidade de usuário para o formato devolvido pela API.
     *
     * @param usuario usuário persistido
     * @return representação segura dos dados do usuário
     * @since 1.0
     */
    public static UsuarioResposta de(Usuario usuario) {
        return new UsuarioResposta(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getPerfil(),
                usuario.isAtivo()
        );
    }
}
