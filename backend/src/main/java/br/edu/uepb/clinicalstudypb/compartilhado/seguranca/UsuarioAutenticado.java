package br.edu.uepb.clinicalstudypb.compartilhado.seguranca;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.io.Serial;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

// <-------------------IDENTIDADE DA SESSÃO------------------->
/**
 * Adapta os dados da conta ao usuário reconhecido pelo Spring Security.
 *
 * <p>A entidade JPA não fica armazenada na sessão. O Spring apaga o hash
 * desta cópia após autenticar; o hash persistido no banco não é alterado.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
public class UsuarioAutenticado extends User {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String nome;
    private final PerfilUsuario perfil;

    /**
     * Prepara a identidade e a permissão correspondente ao perfil da conta.
     *
     * @param usuario conta recuperada do banco
     */
    public UsuarioAutenticado(Usuario usuario) {
        super(usuario.getEmail(), usuario.getSenhaHash(), usuario.isAtivo(), true, true, true,
                List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil().name())));
        this.id = usuario.getId();
        this.nome = usuario.getNome();
        this.perfil = usuario.getPerfil();
    }

    /**
     * Identifica a conta mesmo se seu e-mail for alterado.
     *
     * @return identificador persistido do usuário
     * @since 1.0
     */
    public Long getId() {
        return id;
    }

    /**
     * Disponibiliza o nome para a apresentação da sessão na interface.
     *
     * @return nome do usuário
     * @since 1.0
     */
    public String getNome() {
        return nome;
    }

    /**
     * Identifica o perfil usado nas decisões de acesso.
     *
     * @return perfil atual da conta
     * @since 1.0
     */
    public PerfilUsuario getPerfil() {
        return perfil;
    }
}
