package br.edu.uepb.clinicalstudypb.compartilhado.seguranca;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.filter.OncePerRequestFilter;

// <-------------------SITUAÇÃO ATUAL DA CONTA------------------->
/**
 * Revalida a conta antes de autorizar requisições de uma sessão já aberta.
 *
 * <p>A consulta por identificador permite reconhecer mudanças de e-mail,
 * perfil e situação da conta sem exigir um novo login para atualizar permissões.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
public class FiltroUsuarioAtivo extends OncePerRequestFilter {

    private final UsuarioRepository usuarios;
    private final SecurityContextRepository contextos;
    private final RespostaErroSeguranca erros;

    /**
     * Recebe os recursos usados para conferir e atualizar a sessão.
     *
     * @param usuarios acesso ao estado persistido da conta
     * @param contextos persistência da autenticação na sessão
     * @param erros respostas JSON de segurança
     */
    public FiltroUsuarioAtivo(UsuarioRepository usuarios, SecurityContextRepository contextos,
            RespostaErroSeguranca erros) {
        this.usuarios = usuarios;
        this.contextos = contextos;
        this.erros = erros;
    }

    /**
     * Encerra sessões de contas desativadas e atualiza as permissões das demais.
     *
     * @param request requisição em processamento
     * @param response resposta HTTP
     * @param chain demais filtros e destino da requisição
     * @throws ServletException se ocorrer uma falha no processamento seguinte
     * @throws IOException se ocorrer uma falha na comunicação HTTP
     * @since 1.0
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao != null && autenticacao.getPrincipal() instanceof UsuarioAutenticado atual) {
            Usuario usuario = usuarios.findById(atual.getId()).orElse(null);
            if (usuario == null || !usuario.isAtivo()) {
                new SecurityContextLogoutHandler().logout(request, response, autenticacao);
                erros.commence(request, response,
                        new InsufficientAuthenticationException("A conta não está mais disponível."));
                return;
            }

            // Uma cópia sem hash atualiza a sessão antes da verificação de perfil
            UsuarioAutenticado identidade = new UsuarioAutenticado(usuario);
            identidade.eraseCredentials();
            Authentication atualizada = UsernamePasswordAuthenticationToken.authenticated(
                    identidade, null, identidade.getAuthorities());
            SecurityContext contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(atualizada);
            SecurityContextHolder.setContext(contexto);
            contextos.saveContext(contexto, request, response);
        }
        chain.doFilter(request, response);
    }
}
