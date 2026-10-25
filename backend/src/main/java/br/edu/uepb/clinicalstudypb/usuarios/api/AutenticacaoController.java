package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// <-------------------ACESSO POR SESSÃO------------------->
/**
 * Recebe o login JSON e expõe os dados públicos da sessão e sua proteção CSRF.
 *
 * <p>O logout é atendido pelo filtro padrão do Spring Security em
 * {@code POST /auth/logout}, invalidando a sessão no servidor.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "Autenticação", description = "Sessão, credenciais e proteção das requisições de alteração.")
public class AutenticacaoController {

    private final AuthenticationManager autenticador;
    private final SessionAuthenticationStrategy estrategiaSessao;
    private final SecurityContextRepository contextos;

    /**
     * Recebe os componentes responsáveis por autenticar e guardar a sessão.
     *
     * @param autenticador conferência das credenciais
     * @param estrategiaSessao renovação da sessão e da proteção CSRF
     * @param contextos armazenamento da autenticação entre requisições
     */
    public AutenticacaoController(AuthenticationManager autenticador,
            SessionAuthenticationStrategy estrategiaSessao, SecurityContextRepository contextos) {
        this.autenticador = autenticador;
        this.estrategiaSessao = estrategiaSessao;
        this.contextos = contextos;
    }

    /**
     * Disponibiliza a proteção exigida no login, logout e demais alterações.
     *
     * @param token proteção disponibilizada pelo filtro CSRF
     * @return token e nome do cabeçalho a enviar na próxima alteração
     * @since 1.0
     */
    @GetMapping("/csrf")
    @Operation(summary = "Obter o token CSRF", description = "Disponível antes do login. "
            + "Mantenha o cookie recebido e envie o token no cabeçalho indicado por headerName. "
            + "Consulte novamente após autenticar, pois o token anterior é descartado.")
    @ApiResponse(responseCode = "200", description = "Token e nome do cabeçalho para a sessão atual.")
    public CsrfResposta csrf(@Parameter(hidden = true) CsrfToken token) {
        return new CsrfResposta(token.getToken(), token.getHeaderName());
    }

    /**
     * Autentica as credenciais e mantém a identidade na sessão HTTP.
     *
     * @param entrada e-mail e senha informados
     * @param request requisição com o cookie da sessão
     * @param response resposta que poderá renovar o cookie
     * @return dados públicos do usuário autenticado
     * @throws AuthenticationException se as credenciais ou a conta forem inválidas
     * @since 1.0
     */
    @PostMapping("/login")
    @Operation(summary = "Autenticar com e-mail e senha", description = "Usa uma conta ativa já cadastrada. "
            + "Renova a sessão e o token CSRF; não devolve senha, hash ou token Bearer. "
            + "A senha é preservada como digitada e deve ter no máximo 72 bytes em UTF-8.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login realizado; cookie administrado pelo navegador."),
        @ApiResponse(responseCode = "400", description = "JSON ou campos inválidos.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "401", description = "Credenciais inválidas ou conta desativada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "403", description = "CSRF ausente ou inválido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public SessaoResposta login(@Valid @RequestBody LoginEntrada entrada,
            HttpServletRequest request, HttpServletResponse response) {
        try {
            // BCrypt aceita no máximo 72 bytes, inclusive quando há caracteres acentuados
            if (entrada.senha().getBytes(StandardCharsets.UTF_8).length > 72) {
                throw new BadCredentialsException("Credenciais inválidas.");
            }
            Authentication autenticacao = autenticador.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(entrada.email(), entrada.senha()));
            estrategiaSessao.onAuthentication(autenticacao, request, response);
            SecurityContext contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(autenticacao);
            SecurityContextHolder.setContext(contexto);
            contextos.saveContext(contexto, request, response);
            return SessaoResposta.de((UsuarioAutenticado) autenticacao.getPrincipal());
        } catch (AuthenticationException exception) {
            // Uma tentativa recusada não mantém a identidade de um login anterior
            new SecurityContextLogoutHandler().logout(request, response,
                    SecurityContextHolder.getContext().getAuthentication());
            throw exception;
        }
    }

    /**
     * Permite que a interface restaure a identificação após recarregar a página.
     *
     * @param usuario identidade atualizada da sessão autenticada
     * @return dados públicos do usuário conectado
     * @since 1.0
     */
    @GetMapping("/sessao")
    @Operation(summary = "Consultar a sessão autenticada",
            description = "Recupera os dados públicos de quem está conectado, inclusive após recarregar a página.")
    @SecurityRequirement(name = "sessao")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Identificação e perfil atuais do usuário."),
        @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou conta desativada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public SessaoResposta sessao(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return SessaoResposta.de(usuario);
    }
}
