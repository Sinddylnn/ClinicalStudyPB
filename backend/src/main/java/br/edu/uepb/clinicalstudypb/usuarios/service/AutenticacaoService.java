package br.edu.uepb.clinicalstudypb.usuarios.service;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// <-------------------DADOS PARA AUTENTICAÇÃO------------------->
/**
 * Fornece a conta ao Spring Security, que verifica a senha e a situação de acesso.
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
@Service
public class AutenticacaoService implements UserDetailsService {

    private final UsuarioRepository usuarios;

    /**
     * Recebe o acesso aos usuários do banco.
     *
     * @param usuarios repositório compartilhado com a gestão de usuários
     */
    public AutenticacaoService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    /**
     * Localiza a conta por e-mail sem divulgar sua existência na resposta de login.
     *
     * @param email e-mail apresentado ao mecanismo de autenticação
     * @return dados de acesso e permissões atuais da conta
     * @throws UsernameNotFoundException quando a conta não existe
     * @since 1.0
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return usuarios.buscarPorEmail(email)
                .map(UsuarioAutenticado::new)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciais inválidas."));
    }
}
