package br.edu.uepb.clinicalstudypb.compartilhado.documentacao;

import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// <-------------------CONTRATO GERADO E ACESSO À DOCUMENTAÇÃO------------------->
/**
 * Verifica a documentação produzida pelo springdoc com os filtros reais de segurança.
 *
 * <p>O repositório é simulado e a configuração de persistência fica desativada
 * somente neste teste. A execução normal continua exigindo PostgreSQL.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 23/10/2026
 */
@SpringBootTest(properties = "spring.autoconfigure.exclude="
        + "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,"
        + "org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,"
        + "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration")
@AutoConfigureMockMvc
class DocumentacaoApiTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @MockitoBean
    private UsuarioRepository usuarios;

    /**
     * Confere rotas, DTOs e mecanismos de acesso publicados no contrato real.
     *
     * @throws Exception se a requisição ou a leitura do contrato falhar
     * @since 1.0
     */
    @Test
    void publicaContratoDasOperacoesImplementadas() throws Exception {
        String corpo = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("ClinicalStudyPB API"))
                .andExpect(jsonPath("$.info.version").value("1.0"))
                .andReturn().getResponse().getContentAsString();

        JsonNode contrato = json.readTree(corpo);
        JsonNode rotas = contrato.path("paths");
        // Confere operações necessárias sem impedir que outras tasks acrescentem rotas
        assertThat(rotas.has("/auth/csrf")).isTrue();
        assertThat(rotas.has("/auth/login")).isTrue();
        assertThat(rotas.has("/auth/sessao")).isTrue();
        assertThat(rotas.has("/auth/logout")).isTrue();

        JsonNode login = rotas.path("/auth/login").path("post");
        assertThat(login.path("requestBody").path("content").path("application/json")
                .path("schema").path("$ref").asText()).endsWith("/LoginEntrada");
        assertThat(login.path("parameters").get(0).path("$ref").asText())
                .isEqualTo("#/components/parameters/TokenCsrf");
        for (String codigo : new String[]{"200", "400", "401", "403"}) {
            assertThat(login.path("responses").has(codigo)).isTrue();
        }

        JsonNode sessao = rotas.path("/auth/sessao").path("get");
        assertThat(sessao.path("security").get(0).has("sessao")).isTrue();
        assertThat(sessao.path("responses").path("200").path("content")
                .path("*/*").path("schema").path("$ref").asText()).endsWith("/SessaoResposta");

        JsonNode componentes = contrato.path("components");
        JsonNode seguranca = componentes.path("securitySchemes").path("sessao");
        assertThat(seguranca.path("type").asText()).isEqualTo("apiKey");
        assertThat(seguranca.path("in").asText()).isEqualTo("cookie");
        assertThat(seguranca.path("name").asText()).isEqualTo("JSESSIONID");
        assertThat(componentes.path("parameters").path("TokenCsrf").path("name").asText())
                .isEqualTo("X-CSRF-TOKEN");
        assertThat(componentes.path("schemas").path("LoginEntrada").path("properties")
                .path("senha").path("writeOnly").asBoolean()).isTrue();
        assertThat(componentes.path("schemas").path("SessaoResposta").path("properties").size())
                .isEqualTo(4);
        assertThat(componentes.path("schemas").has("ErroApi")).isTrue();

        // O logout é atendido pelo filtro de segurança e também precisa estar documentado
        JsonNode logout = rotas.path("/auth/logout").path("post");
        assertThat(logout.path("responses").has("204")).isTrue();
        assertThat(logout.path("responses").path("204").has("content")).isFalse();
        assertThat(logout.path("parameters").get(0).path("$ref").asText())
                .isEqualTo("#/components/parameters/TokenCsrf");
    }

    // <-------------------CONTRATO ADMINISTRATIVO DE USUÁRIOS------------------->
    /**
     * Confere permissões, CSRF, erros e DTOs das operações administrativas reais.
     *
     * @throws Exception se a requisição ou a leitura do contrato falhar
     * @since 1.0
     */
    @Test
    void documentaGestaoDeUsuariosSemExporCredenciais() throws Exception {
        String corpo = mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode contrato = json.readTree(corpo);
        JsonNode rotas = contrato.path("paths");

        String[][] operacoes = {
            {"/usuarios", "post", "201", "400", "409"},
            {"/usuarios", "get", "200"},
            {"/usuarios/{id}", "put", "200", "400", "404", "409"},
            {"/usuarios/{id}/desativar", "patch", "200", "400", "404"},
            {"/usuarios/{id}/reativar", "patch", "200", "400", "404"}
        };
        for (String[] item : operacoes) {
            JsonNode operacao = rotas.path(item[0]).path(item[1]);
            assertThat(operacao.isMissingNode()).as("%s %s", item[1], item[0]).isFalse();
            assertThat(operacao.path("security").path(0).has("sessao")).isTrue();
            assertThat(operacao.path("description").asText()).containsIgnoringCase("administrador");

            // Todas exigem sessão e perfil; alterações exigem também o cabeçalho CSRF
            boolean temCsrf = false;
            for (JsonNode parametro : operacao.path("parameters")) {
                temCsrf |= "#/components/parameters/TokenCsrf".equals(parametro.path("$ref").asText());
            }
            assertThat(temCsrf).isEqualTo(!"get".equals(item[1]));
            for (String codigo : new String[]{"401", "403"}) {
                assertThat(operacao.path("responses").path(codigo).path("content")
                        .path("*/*").path("schema").path("$ref").asText()).endsWith("/ErroApi");
            }
            for (int i = 2; i < item.length; i++) {
                assertThat(operacao.path("responses").has(item[i]))
                        .as("%s %s documenta %s", item[1], item[0], item[i]).isTrue();
            }

            JsonNode resposta = operacao.path("responses").path(item[2]).path("content")
                    .path("*/*").path("schema");
            if ("get".equals(item[1])) {
                assertThat(resposta.path("type").asText()).isEqualTo("array");
                resposta = resposta.path("items");
            }
            assertThat(resposta.path("$ref").asText()).endsWith("/UsuarioResposta");
        }

        assertThat(rotas.path("/usuarios").path("post").path("requestBody").path("content")
                .path("application/json").path("schema").path("$ref").asText())
                .endsWith("/UsuarioCadastroEntrada");
        assertThat(rotas.path("/usuarios/{id}").path("put").path("requestBody").path("content")
                .path("application/json").path("schema").path("$ref").asText())
                .endsWith("/UsuarioEdicaoEntrada");

        JsonNode schemas = contrato.path("components").path("schemas");
        JsonNode cadastro = schemas.path("UsuarioCadastroEntrada").path("properties");
        assertThat(cadastro.path("senha").path("writeOnly").asBoolean()).isTrue();
        assertThat(cadastro.path("senha").path("description").asText()).contains("72 bytes");
        for (String nome : new String[]{"UsuarioCadastroEntrada", "UsuarioEdicaoEntrada"}) {
            for (String campo : new String[]{"nome", "email"}) {
                assertThat(schemas.path(nome).path("properties").path(campo).path("maxLength").asInt())
                        .as("Limite de %s em %s", campo, nome).isEqualTo(255);
            }
        }
        JsonNode resposta = schemas.path("UsuarioResposta").path("properties");
        assertThat(resposta.size()).isEqualTo(5);
        for (String campo : new String[]{"id", "nome", "email", "perfil", "ativo"}) {
            assertThat(resposta.has(campo)).isTrue();
        }
        assertThat(resposta.has("senha")).isFalse();
        assertThat(resposta.has("senhaHash")).isFalse();
    }

    /**
     * Confere os recursos necessários para abrir a interface no navegador sem login.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void disponibilizaInterfaceConfiguracaoEContratoYaml() throws Exception {
        mvc.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection());
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"));
        mvc.perform(get("/swagger-ui/swagger-ui-bundle.js")).andExpect(status().isOk());
        mvc.perform(get("/v3/api-docs/swagger-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("/v3/api-docs"))
                .andExpect(jsonPath("$.withCredentials").value(true));
        mvc.perform(get("/v3/api-docs.yaml")).andExpect(status().isOk());
    }

    /**
     * Confirma que publicar a documentação não libera a sessão nem remove o CSRF.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void preservaProtecaoDasOperacoes() throws Exception {
        mvc.perform(get("/auth/sessao"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("AUTENTICACAO_NECESSARIA"));
        mvc.perform(post("/auth/login").contentType("application/json")
                        .content("{\"email\":\"pesquisador@example.test\",\"senha\":\"exemplo\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
        mvc.perform(post("/auth/logout"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
    }
}
