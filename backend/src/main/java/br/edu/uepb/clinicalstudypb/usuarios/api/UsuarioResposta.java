package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;

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
public record UsuarioResposta(
        Long id,
        String nome,
        String email,
        PerfilUsuario perfil,
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