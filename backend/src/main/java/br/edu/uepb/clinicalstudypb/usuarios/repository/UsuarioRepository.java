package br.edu.uepb.clinicalstudypb.usuarios.repository;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    /**
     * Bloqueia as contas ativas do perfil até o término da transação atual.
     *
     * <p>A ordem por identificador mantém a mesma ordem de aquisição dos bloqueios
     * nas operações de edição e desativação.</p>
     *
     * @param perfil perfil das contas que precisam ser protegidas
     * @return contas bloqueadas, com seu estado atual para a transação
     * @since 1.0
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.perfil = :perfil and u.ativo = true order by u.id")
    List<Usuario> bloquearAtivosPorPerfil(@Param("perfil") PerfilUsuario perfil);
}
