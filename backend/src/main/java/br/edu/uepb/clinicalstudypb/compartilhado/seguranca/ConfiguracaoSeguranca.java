package br.edu.uepb.clinicalstudypb.compartilhado.seguranca;

import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import jakarta.servlet.DispatcherType;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

// <-------------------POLÍTICA DE ACESSO DA API------------------->
/**
 * Configura autenticação por sessão, proteção de alterações e permissões da Sprint 1.
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
@Configuration
@EnableMethodSecurity
public class ConfiguracaoSeguranca {

    // <-------------------SENHAS E AUTENTICAÇÃO------------------->
    /**
     * Define o mesmo algoritmo para cadastrar senhas e conferir o login.
     *
     * @return codificador BCrypt
     * @since 1.0
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Delega a conferência de senha e conta ativa ao Spring Security.
     *
     * @param usuarios serviço que localiza a conta pelo e-mail
     * @param senhas algoritmo usado para verificar o hash
     * @return gerenciador da autenticação
     * @since 1.0
     */
    @Bean
    public AuthenticationManager authenticationManager(UserDetailsService usuarios, PasswordEncoder senhas) {
        DaoAuthenticationProvider provedor = new DaoAuthenticationProvider(usuarios);
        provedor.setPasswordEncoder(senhas);
        return new ProviderManager(List.of(provedor));
    }

    // <-------------------SESSÃO E CSRF------------------->
    /**
     * Guarda a autenticação na sessão e a disponibiliza durante a requisição.
     *
     * @return repositório dos contextos de segurança
     * @since 1.0
     */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(
                new RequestAttributeSecurityContextRepository(), new HttpSessionSecurityContextRepository());
    }

    /**
     * Associa a proteção CSRF à sessão mantida no servidor.
     *
     * @return armazenamento dos tokens CSRF
     * @since 1.0
     */
    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        return new HttpSessionCsrfTokenRepository();
    }

    /**
     * Renova o identificador da sessão e remove o token CSRF anterior após o login.
     *
     * @param tokens armazenamento da proteção CSRF
     * @return ações executadas após autenticar as credenciais
     * @since 1.0
     */
    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository tokens) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(), new CsrfAuthenticationStrategy(tokens)));
    }

    // <-------------------ORIGENS WEB PERMITIDAS------------------->
    /**
     * Permite o envio de cookies apenas pelas origens web configuradas.
     *
     * @param origens endereços completos permitidos para a aplicação web
     * @return configuração CORS aplicada antes da autorização
     * @since 1.0
     */
    @Bean
    public UrlBasedCorsConfigurationSource corsConfigurationSource(
            @Value("${app.seguranca.origens-permitidas}") List<String> origens) {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(origens);
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Content-Type", "Accept", "X-CSRF-TOKEN"));
        cors.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    // <-------------------ROTAS E PERMISSÕES------------------->
    /**
     * Protege a API sem páginas de login, autenticação Basic ou permissões implícitas.
     *
     * @param http configuração da cadeia de filtros
     * @param erros respostas JSON de segurança
     * @param contextos armazenamento da autenticação
     * @param tokens armazenamento dos tokens CSRF
     * @param cors origens permitidas para a web
     * @param usuarios acesso ao estado atual da conta
     * @return cadeia que protege as requisições HTTP
     * @throws Exception se não for possível construir a configuração de segurança
     * @since 1.0
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, RespostaErroSeguranca erros,
            SecurityContextRepository contextos, CsrfTokenRepository tokens,
            UrlBasedCorsConfigurationSource cors, UsuarioRepository usuarios) throws Exception {
        http
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .requestCache(AbstractHttpConfigurer::disable)
                .cors(config -> config.configurationSource(cors))
                .csrf(config -> config.csrfTokenRepository(tokens))
                .securityContext(config -> config.securityContextRepository(contextos).requireExplicitSave(true))
                .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(config -> config.authenticationEntryPoint(erros).accessDeniedHandler(erros))
                .authorizeHttpRequests(config -> config
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        // A consulta da documentação é pública; as operações mantêm suas proteções
                        .requestMatchers(HttpMethod.GET, "/v3/api-docs", "/v3/api-docs.yaml",
                                "/v3/api-docs/**", "/swagger-ui.html", "/swagger-ui/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth/sessao").authenticated()
                        .requestMatchers("/usuarios", "/usuarios/**").hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.POST, "/estudos").hasRole("PESQUISADOR")
                        .requestMatchers(HttpMethod.PUT, "/estudos/*/coordenador").hasRole("PESQUISADOR")
                        .requestMatchers(HttpMethod.GET, "/estudos/coordenadores").hasRole("PESQUISADOR")
                        .requestMatchers(HttpMethod.GET, "/estudos", "/estudos/*")
                                .hasAnyRole("PESQUISADOR", "COORDENADOR")
                        .anyRequest().denyAll())
                .logout(config -> config.logoutUrl("/auth/logout")
                        .invalidateHttpSession(true).clearAuthentication(true).deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, autenticacao) -> response.setStatus(204)))
                // Registro somente nesta cadeia evita executar o filtro duas vezes
                .addFilterBefore(new FiltroUsuarioAtivo(usuarios, contextos, erros), AuthorizationFilter.class);
        return http.build();
    }
}
