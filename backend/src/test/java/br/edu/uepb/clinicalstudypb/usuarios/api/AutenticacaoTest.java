package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// <-------------------FLUXO HTTP REAL DE SEGURANÇA COM BANCO SIMULADO------------------->
/**
 * Verifica login, sessão, logout, CSRF, CORS e perfis usando os filtros reais.
 *
 * <p>Somente o repositório é simulado. Estes testes não substituem a execução
 * das migrações e da consulta SQL em PostgreSQL.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
@WebMvcTest(controllers = {AutenticacaoController.class, AutenticacaoTest.RotasProtegidas.class})
@Import({ConfiguracaoSeguranca.class, AutenticacaoService.class, RespostaErroSeguranca.class,
        AutenticacaoTest.RotasProtegidas.class})
class AutenticacaoTest {

    private static final String SENHA_FICTICIA = "Senha-ficticia-123";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @Autowired
    private PasswordEncoder senhas;
    @MockitoBean
    private UsuarioRepository usuarios;

    private final Map<Long, Usuario> contas = new HashMap<>();

    /**
     * Prepara uma conta fictícia por perfil com o mesmo algoritmo da aplicação.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararContas() {
        String hash = senhas.encode(SENHA_FICTICIA);
        for (PerfilUsuario perfil : PerfilUsuario.values()) {
            Usuario usuario = new Usuario("Pessoa fictícia", email(perfil), hash, perfil);
            ReflectionTestUtils.setField(usuario, "id", (long) perfil.ordinal() + 1);
            contas.put(usuario.getId(), usuario);
        }
        when(usuarios.buscarPorEmail(anyString())).thenAnswer(invocacao -> {
            String email = invocacao.getArgument(0);
            return contas.values().stream().filter(u -> u.getEmail().trim().equalsIgnoreCase(email.trim()))
                    .findFirst();
        });
        when(usuarios.findById(anyLong())).thenAnswer(invocacao ->
                Optional.ofNullable(contas.get(invocacao.<Long>getArgument(0))));
    }

    // <-------------------LOGIN E PERSISTÊNCIA DA SESSÃO------------------->
    /**
     * Exige uma sessão autenticada para consultar a identidade atual.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void recusaConsultaSemLogin() throws Exception {
        mvc.perform(get("/auth/sessao")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("AUTENTICACAO_NECESSARIA"));
    }

    /**
     * Bloqueia login sem CSRF antes de consultar as credenciais.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void exigeCsrfTambemNoLogin() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(credenciais(email(PerfilUsuario.PESQUISADOR), SENHA_FICTICIA)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
        verifyNoInteractions(usuarios);
    }

    /**
     * Cria uma sessão para cada perfil sem expor nem conservar o hash nas credenciais.
     *
     * @param perfil perfil da conta usada no login
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(PerfilUsuario.class)
    void autenticaPerfisERestauraSessao(PerfilUsuario perfil) throws Exception {
        MockHttpSession sessao = entrar(perfil);
        mvc.perform(get("/auth/sessao").session(sessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value(perfil.name()))
                .andExpect(jsonPath("$.email").value(email(perfil)))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
        SecurityContext contexto = (SecurityContext) sessao.getAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        UsuarioAutenticado identidade = (UsuarioAutenticado) contexto.getAuthentication().getPrincipal();
        assertThat(identidade.getPassword()).isNull();
        assertThat(contexto.getAuthentication().getCredentials()).isNull();
    }

    /**
     * Renova o identificador de sessão e o token CSRF ao aceitar o login.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void renovaSessaoECsrfDepoisDoLogin() throws Exception {
        MvcResult inicio = mvc.perform(get("/auth/csrf")).andExpect(status().isOk()).andReturn();
        MockHttpSession sessao = (MockHttpSession) inicio.getRequest().getSession(false);
        String idAnterior = sessao.getId();
        JsonNode protecao = json.readTree(inicio.getResponse().getContentAsString());
        String tokenAnterior = protecao.get("token").asText();
        mvc.perform(post("/auth/login").session(sessao).header("X-CSRF-TOKEN", tokenAnterior)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credenciais("  PESQUISADOR@example.test  ", SENHA_FICTICIA)))
                .andExpect(status().isOk());
        assertThat(sessao.getId()).isNotEqualTo(idAnterior);
        mvc.perform(post("/estudos").session(sessao).header("X-CSRF-TOKEN", tokenAnterior))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
        mvc.perform(comCsrf(post("/estudos"), sessao)).andExpect(status().isCreated());
    }

    /**
     * Usa a mesma resposta para senha errada, conta ausente e conta desativada.
     *
     * @param email endereço enviado no login
     * @param senha senha enviada no login
     * @param desativar indica se a conta pesquisadora deve estar desativada
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @MethodSource("credenciaisRecusadas")
    void naoRevelaMotivoDaRecusa(String email, String senha, boolean desativar) throws Exception {
        if (desativar) {
            ReflectionTestUtils.setField(contas.get(2L), "ativo", false);
        }
        MockHttpSession sessao = new MockHttpSession();
        mvc.perform(comCsrf(post("/auth/login"), sessao).contentType(MediaType.APPLICATION_JSON)
                        .content(credenciais(email, senha)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("CREDENCIAIS_INVALIDAS"))
                .andExpect(jsonPath("$.mensagem").value("E-mail ou senha inválidos."));
        assertThat(sessao.isInvalid()).isTrue();
    }

    /**
     * Fornece recusas de credenciais, incluindo o limite de bytes do BCrypt.
     *
     * @return entradas que devem receber uma recusa genérica
     * @since 1.0
     */
    private static Stream<Arguments> credenciaisRecusadas() {
        return Stream.of(
                Arguments.of("pesquisador@example.test", "incorreta", false),
                Arguments.of("ausente@example.test", SENHA_FICTICIA, false),
                Arguments.of("pesquisador@example.test", SENHA_FICTICIA, true),
                Arguments.of("pesquisador@example.test", "á".repeat(37), false));
    }

    /**
     * Preserva o contrato de erros de campos quando o formulário é inválido.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void validaCamposDoLogin() throws Exception {
        mvc.perform(comCsrf(post("/auth/login"), new MockHttpSession())
                        .contentType(MediaType.APPLICATION_JSON).content(credenciais("invalido", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos.email").exists())
                .andExpect(jsonPath("$.errosCampos.senha").exists());
    }

    // <-------------------PERFIS E ALTERAÇÕES DE CONTA------------------->
    /**
     * Confere as permissões da Sprint 1 para todos os perfis existentes.
     *
     * @param perfil perfil usado na sessão
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(PerfilUsuario.class)
    void aplicaMatrizDePermissoes(PerfilUsuario perfil) throws Exception {
        MockHttpSession sessao = entrar(perfil);
        mvc.perform(get("/usuarios").session(sessao))
                .andExpect(status().is(perfil == PerfilUsuario.ADMINISTRADOR ? 200 : 403));
        mvc.perform(get("/estudos").session(sessao)).andExpect(status().is(
                perfil == PerfilUsuario.PESQUISADOR || perfil == PerfilUsuario.COORDENADOR ? 200 : 403));
        mvc.perform(comCsrf(post("/estudos"), sessao))
                .andExpect(status().is(perfil == PerfilUsuario.PESQUISADOR ? 201 : 403));
    }

    /**
     * Bloqueia imediatamente uma conta desativada depois de abrir a sessão.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void encerraSessaoDeUsuarioDesativado() throws Exception {
        MockHttpSession sessao = entrar(PerfilUsuario.ADMINISTRADOR);
        ReflectionTestUtils.setField(contas.get(1L), "ativo", false);
        mvc.perform(get("/usuarios").session(sessao)).andExpect(status().isUnauthorized());
        assertThat(sessao.isInvalid()).isTrue();
    }

    /**
     * Remove permissões antigas quando o administrador muda de perfil.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void atualizaPerfilDaSessaoAberta() throws Exception {
        MockHttpSession sessao = entrar(PerfilUsuario.ADMINISTRADOR);
        ReflectionTestUtils.setField(contas.get(1L), "perfil", PerfilUsuario.PARTICIPANTE);
        mvc.perform(get("/usuarios").session(sessao)).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
        mvc.perform(get("/auth/sessao").session(sessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("PARTICIPANTE"));
    }

    /**
     * Mantém acesso negado em JSON quando a restrição é aplicada no método Java.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void preservaErroDeAutorizacaoDoMetodo() throws Exception {
        mvc.perform(get("/estudos/__metodo").session(entrar(PerfilUsuario.COORDENADOR)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
    }

    // <-------------------LOGOUT E ORIGENS WEB------------------->
    /**
     * Invalida a sessão no servidor e recusa seu uso posterior.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void encerraSessaoNoLogout() throws Exception {
        MockHttpSession sessao = entrar(PerfilUsuario.PESQUISADOR);
        mvc.perform(comCsrf(post("/auth/logout"), sessao)).andExpect(status().isNoContent());
        assertThat(sessao.isInvalid()).isTrue();
        mvc.perform(get("/auth/sessao")).andExpect(status().isUnauthorized());
    }

    /**
     * Impede que logout por GET ou sem CSRF encerre a sessão.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void protegeLogoutContraRequisicoesIndevidas() throws Exception {
        MockHttpSession sessao = entrar(PerfilUsuario.PESQUISADOR);
        mvc.perform(get("/auth/logout").session(sessao)).andExpect(status().isForbidden());
        mvc.perform(post("/auth/logout").session(sessao)).andExpect(status().isForbidden());
        mvc.perform(get("/auth/sessao").session(sessao)).andExpect(status().isOk());
    }

    /**
     * Aceita o preflight da web configurada sem exigir login antecipado.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void permiteOrigemWebConfigurada() throws Exception {
        mvc.perform(options("/auth/login").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "Content-Type,X-CSRF-TOKEN"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    /**
     * Recusa uma origem diferente sem divulgar permissão CORS.
     *
     * @throws Exception se a requisição simulada falhar
     * @since 1.0
     */
    @Test
    void recusaOrigemWebNaoConfigurada() throws Exception {
        mvc.perform(options("/auth/login").header("Origin", "https://outra-origem.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    // <-------------------APOIO AOS CENÁRIOS------------------->
    /**
     * Executa o login real com CSRF e preserva a sessão entre requisições simuladas.
     *
     * @param perfil perfil da conta fictícia
     * @return sessão autenticada
     * @throws Exception se o login ou a preparação de CSRF falhar
     * @since 1.0
     */
    private MockHttpSession entrar(PerfilUsuario perfil) throws Exception {
        MockHttpSession sessao = new MockHttpSession();
        mvc.perform(comCsrf(post("/auth/login"), sessao).contentType(MediaType.APPLICATION_JSON)
                        .content(credenciais(email(perfil), SENHA_FICTICIA)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.perfil").value(perfil.name()));
        return sessao;
    }

    /**
     * Obtém o token pelo endpoint público, sem simular ou desativar o filtro CSRF.
     *
     * @param requisicao requisição de alteração a proteger
     * @param sessao sessão que receberá o token
     * @return requisição com sessão e cabeçalho CSRF
     * @throws Exception se a consulta de CSRF falhar
     * @since 1.0
     */
    private MockHttpServletRequestBuilder comCsrf(MockHttpServletRequestBuilder requisicao,
            MockHttpSession sessao) throws Exception {
        MvcResult resultado = mvc.perform(get("/auth/csrf").session(sessao))
                .andExpect(status().isOk()).andReturn();
        JsonNode protecao = json.readTree(resultado.getResponse().getContentAsString());
        return requisicao.session(sessao).header(protecao.get("headerName").asText(),
                protecao.get("token").asText());
    }

    /**
     * Serializa dados fictícios com o mesmo conversor utilizado pela API.
     *
     * @param email endereço usado no cenário
     * @param senha senha usada no cenário
     * @return corpo JSON do login
     * @since 1.0
     */
    private String credenciais(String email, String senha) {
        return json.writeValueAsString(Map.of("email", email, "senha", senha));
    }

    /**
     * Gera um endereço reservado para os dados fictícios de cada perfil.
     *
     * @param perfil perfil da conta
     * @return e-mail exclusivo do cenário
     * @since 1.0
     */
    private static String email(PerfilUsuario perfil) {
        return perfil.name().toLowerCase(Locale.ROOT) + "@example.test";
    }

    /**
     * Simula apenas os destinos protegidos, sem implementar o cadastro de outras tasks.
     *
     * @author Georis
     * @version 1.0
     * @since 21/10/2026
     */
    @RestController
    static class RotasProtegidas {

        /**
         * Representa uma consulta administrativa protegida.
         *
         * @return marcador de acesso permitido
         * @since 1.0
         */
        @GetMapping("/usuarios")
        String usuarios() {
            return "permitido";
        }

        /**
         * Representa a consulta de estudos após autorização por perfil.
         *
         * @return marcador de acesso permitido
         * @since 1.0
         */
        @GetMapping("/estudos")
        String estudos() {
            return "permitido";
        }

        /**
         * Representa o destino do cadastro sem executar regras da task de estudos.
         *
         * @return marcador de acesso permitido
         * @since 1.0
         */
        @PostMapping("/estudos")
        @ResponseStatus(HttpStatus.CREATED)
        String criarEstudo() {
            return "permitido";
        }

        /**
         * Exercita o tratamento de uma autorização negada dentro do método.
         *
         * @return marcador de acesso permitido
         * @since 1.0
         */
        @GetMapping("/estudos/__metodo")
        @PreAuthorize("hasRole('PESQUISADOR')")
        String metodoProtegido() {
            return "permitido";
        }
    }
}
