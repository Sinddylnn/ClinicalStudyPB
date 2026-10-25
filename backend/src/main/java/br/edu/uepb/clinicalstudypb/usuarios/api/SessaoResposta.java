package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import io.swagger.v3.oas.annotations.media.Schema;

// <-------------------DADOS PÚBLICOS DA SESSÃO------------------->
/**
 * Devolve apenas os dados necessários para identificar quem está conectado.
 *
 * @author Georis
 * @version 1.0
 * @param id identificador do usuário
 * @param nome nome para apresentação na interface
 * @param email e-mail cadastrado
 * @param perfil perfil da conta autenticada
 * @since 21/10/2026
 */
public record SessaoResposta(
        @Schema(description = "Identificador da conta.", example = "1") Long id,
        @Schema(description = "Nome de apresentação.", example = "Pessoa fictícia") String nome,
        @Schema(description = "E-mail cadastrado.", example = "pesquisador@example.test") String email,
        @Schema(description = "Perfil atual, conferido pelo backend.") PerfilUsuario perfil) {

    /**
     * Monta a resposta sem incluir senha, hash ou identificador do cookie de sessão.
     *
     * @param usuario identidade autenticada pelo Spring Security
     * @return dados públicos da sessão
     * @since 1.0
     */
    public static SessaoResposta de(UsuarioAutenticado usuario) {
        return new SessaoResposta(usuario.getId(), usuario.getNome(),
                usuario.getUsername(), usuario.getPerfil());
    }
}
