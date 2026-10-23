package br.edu.uepb.clinicalstudypb.usuarios.repository;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;

// <-------------------CONSULTA DE USUÁRIOS------------------->
/**
 * Centraliza o acesso aos usuários persistidos no PostgreSQL.
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /**
     * Busca a conta usando a mesma normalização do índice único de e-mail.
     *
     * @param email e-mail informado no acesso
     * @return usuário encontrado ou resultado vazio
     * @since 1.0
     */
    @Query(value = "SELECT * FROM usuarios WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))",
            nativeQuery = true)
    Optional<Usuario> buscarPorEmail(@Param("email") String email);

    /**
     * Conta quantos usuários ativos possuem determinado perfil.
     *
     * @param perfil perfil usado na contagem
     * @return quantidade de usuários ativos com o perfil informado
     * @since 1.0
     */
    long countByPerfilAndAtivoTrue(PerfilUsuario perfil);
}
