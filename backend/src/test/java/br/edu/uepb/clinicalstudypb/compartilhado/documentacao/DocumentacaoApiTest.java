package br.edu.uepb.clinicalstudypb.compartilhado.documentacao;

import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.CriterioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import br.edu.uepb.clinicalstudypb.estudos.repository.AtividadePrevistaRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.AvaliacaoElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.RespostaElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.CorrecaoVisitaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.SolicitacaoReagendamentoRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;

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

    @MockitoBean
    private br.edu.uepb.clinicalstudypb.recrutamento.repository.ConsentimentoRepository consentimentoRepository;

    @MockitoBean private ProtocoloRepository protocoloRepository;
    @MockitoBean private CriterioRepository criterioRepository;
    @MockitoBean private VisitaPrevistaRepository visitaPrevistaRepository;
    @MockitoBean private ParticipacaoRepository participacaoRepository;
    @MockitoBean private AtividadePrevistaRepository atividadePrevistaRepository;

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @MockitoBean
    private UsuarioRepository usuarios;
    @MockitoBean
    private EstudoRepository estudos;
    @MockitoBean
    private CandidatoRepository candidatoRepository;
    @MockitoBean
    private AvaliacaoElegibilidadeRepository avaliacaoElegibilidadeRepository;
    @MockitoBean
    private RespostaElegibilidadeRepository respostaElegibilidadeRepository;
    @MockitoBean
    private VisitaAgendadaRepository visitaAgendadaRepository;
    @MockitoBean
    private CorrecaoVisitaRepository correcaoVisitaRepository;
    @MockitoBean
    private ResultadoAtividadeRepository resultadoAtividadeRepository;
    @MockitoBean
    private SolicitacaoReagendamentoRepository solicitacaoReagendamentoRepository;

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
        assertThat(cadastro.path("senha").path("minLength").asInt()).isEqualTo(8);
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

    // <-------------------CONTRATO DE ESTUDOS E COORDENADORES------------------->
    /**
     * Confere as operações de estudos e a diferença entre coordenador opcional e obrigatório.
     *
     * @throws Exception se a consulta ou leitura do contrato falhar
     * @since 1.0
     */
    @Test
    void documentaEstudosComVinculoDeCoordenador() throws Exception {
        String corpo = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode contrato = json.readTree(corpo);
        JsonNode rotas = contrato.path("paths");
        String[][] operacoes = {
            {"/estudos", "post", "201", "400", "404"},
            {"/estudos", "get", "200"},
            {"/estudos/coordenadores", "get", "200"},
            {"/estudos/{id}/coordenador", "put", "200", "400", "404"},
            {"/estudos/{id}/estado", "patch", "200", "400", "404"}
        };
        for (String[] item : operacoes) {
            JsonNode operacao = rotas.path(item[0]).path(item[1]);
            assertThat(operacao.isMissingNode()).as("%s %s", item[1], item[0]).isFalse();
            assertThat(operacao.path("security").path(0).has("sessao")).isTrue();
            boolean temCsrf = false;
            for (JsonNode parametro : operacao.path("parameters")) {
                temCsrf |= "#/components/parameters/TokenCsrf".equals(parametro.path("$ref").asText());
            }
            assertThat(temCsrf).isEqualTo(!"get".equals(item[1]));
            for (String codigo : new String[]{"401", "403"}) {
                assertThat(operacao.path("responses").has(codigo)).isTrue();
            }
            for (int i = 2; i < item.length; i++) {
                assertThat(operacao.path("responses").has(item[i])).isTrue();
            }
        }
        assertThat(rotas.path("/estudos").path("get").path("description").asText())
                .containsIgnoringCase("vinculados");
        JsonNode schemas = contrato.path("components").path("schemas");
        assertThat(schemas.path("EstudoResposta").path("properties").has("responsavelNome")).isTrue();
        assertThat(schemas.path("EstudoCadastroEntrada").path("properties").has("coordenadorId")).isTrue();
        for (JsonNode campo : schemas.path("EstudoCadastroEntrada").path("required")) {
            assertThat(campo.asText()).isNotEqualTo("coordenadorId");
        }
        assertThat(schemas.path("CoordenadorEntrada").path("required").toString()).contains("coordenadorId");
        assertThat(schemas.path("EstudoResposta").path("properties").has("coordenadorId")).isTrue();
        assertThat(schemas.path("EstudoResposta").path("properties").has("justificativaEncerramento")).isTrue();
        assertThat(schemas.path("AlteracaoEstadoEntrada").path("required").toString()).contains("estado");
        assertThat(schemas.path("AlteracaoEstadoEntrada").path("properties")
                .path("justificativaEncerramento").path("maxLength").asInt()).isEqualTo(500);
        JsonNode opcao = schemas.path("CoordenadorResposta").path("properties");
        assertThat(opcao.size()).isEqualTo(2);
        assertThat(opcao.has("id")).isTrue();
        assertThat(opcao.has("nome")).isTrue();
        assertThat(rotas.path("/usuarios/{id}").path("put").path("responses")
                .path("400").path("description").asText()).contains("PERFIL_COM_VINCULOS");
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

    /** Mantém o contrato das novas operações disponível para a integração da web. */
    @Test
    void documentaConfiguracaoCompletaDoProtocolo() throws Exception {
        JsonNode rotas = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("paths");
        assertThat(rotas.path("/estudos/{estudoId}/criterios/exclusao").has("get")).isTrue();
        for (String caminho : new String[]{
                "/estudos/{estudoId}/criterios/{criterioId}",
                "/estudos/{estudoId}/visitas/{visitaId}",
                "/estudos/{estudoId}/visitas/{visitaId}/atividades/{atividadeId}"}) {
            for (String metodo : new String[]{"put", "delete"}) {
                JsonNode operacao = rotas.path(caminho).path(metodo);
                assertThat(operacao.isMissingNode()).isFalse();
                for (String codigo : new String[]{"400", "401", "403", "404"}) {
                    assertThat(operacao.path("responses").has(codigo)).isTrue();
                }
                assertThat(operacao.path("parameters").toString()).contains("TokenCsrf");
            }
        }
    }

    /** Confere as operações e limites publicados para a integração da web. */
    @Test
    void documentaConsentimentoEInclusao() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode rotas = contrato.path("paths");
        String base = "/estudos/{estudoId}/candidatos/{candidatoId}";
        for (String[] item : new String[][]{
                {"/consentimento", "get"}, {"/consentimento", "put"},
                {"/consentimento/historico", "get"}, {"/inclusao", "get"}, {"/inclusao", "post"}}) {
            JsonNode operacao = rotas.path(base + item[0]).path(item[1]);
            assertThat(operacao.isMissingNode()).isFalse();
            assertThat(operacao.path("security").toString()).contains("sessao");
            assertThat(operacao.path("parameters").toString().contains("TokenCsrf")).isEqualTo(!item[1].equals("get"));
        }
        JsonNode campos = contrato.path("components").path("schemas").path("ConsentimentoEntrada").path("properties");
        assertThat(campos.path("observacao").path("maxLength").asInt()).isEqualTo(500);
        assertThat(campos.path("resposta").path("enum").toString()).contains("ACEITOU", "RECUSOU").doesNotContain("PENDENTE");
        assertThat(rotas.path(base + "/inclusao").path("post").path("responses").has("409")).isTrue();
    }

    /** Confere rotas, corpos, respostas, segurança e códigos documentados das visitas. */
    @Test
    void documentaOperacoesDeVisita() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode rotas = contrato.path("paths");
        String base = "/estudos/{estudoId}/participacoes/{participacaoId}/visitas";

        for (String[] item : new String[][]{
                {base, "post", "201", "VisitaAgendadaResposta", "400", "401", "403", "404", "409"},
                {base + "/{visitaAgendadaId}", "put", "200", "VisitaAgendadaResposta",
                    "400", "401", "403", "404"},
                {base + "/{visitaAgendadaId}/situacao", "patch", "200", "VisitaAgendadaResposta",
                    "400", "401", "403", "404"},
                {base + "/{visitaAgendadaId}/correcoes", "post", "201", "CorrecaoVisitaResposta",
                    "400", "401", "403", "404"}}) {
            JsonNode operacao = rotas.path(item[0]).path(item[1]);
            assertThat(operacao.isMissingNode()).as("%s %s", item[1], item[0]).isFalse();
            assertThat(operacao.path("security").toString()).contains("sessao");
            assertThat(operacao.path("parameters").toString()).contains("TokenCsrf");
            assertThat(operacao.path("responses").path(item[2]).path("content")
                    .path("*/*").path("schema").path("$ref").asText())
                    .endsWith("/" + item[3]);
            for (int i = 4; i < item.length; i++) {
                assertThat(operacao.path("responses").has(item[i]))
                        .as("%s %s documenta %s", item[1], item[0], item[i]).isTrue();
            }
            for (String codigo : new String[]{"400", "401", "403", "404"}) {
                assertThat(operacao.path("responses").path(codigo).path("content")
                        .path("*/*").path("schema").path("$ref").asText())
                        .as("%s %s descreve o erro %s", item[1], item[0], codigo)
                        .endsWith("/ErroApi");
            }
        }

        assertThat(rotas.path(base).path("post").path("requestBody").path("content")
                .path("application/json").path("schema").path("$ref").asText())
                .endsWith("/VisitaAgendadaCadastroEntrada");
        assertThat(rotas.path(base + "/{visitaAgendadaId}").path("put").path("requestBody")
                .path("content").path("application/json").path("schema").path("$ref").asText())
                .endsWith("/VisitaAgendadaReagendamentoEntrada");
        assertThat(rotas.path(base + "/{visitaAgendadaId}/situacao").path("patch")
                .path("requestBody").path("content").path("application/json")
                .path("schema").path("$ref").asText()).endsWith("/VisitaAgendadaSituacaoEntrada");
        assertThat(rotas.path(base + "/{visitaAgendadaId}/correcoes").path("post")
                .path("requestBody").path("content").path("application/json")
                .path("schema").path("$ref").asText()).endsWith("/CorrecaoVisitaEntrada");

        JsonNode schemas = contrato.path("components").path("schemas");
        for (String nome : new String[]{"VisitaAgendadaCadastroEntrada",
                "VisitaAgendadaReagendamentoEntrada", "VisitaAgendadaSituacaoEntrada",
                "CorrecaoVisitaEntrada"}) {
            assertThat(schemas.path(nome).path("properties").isEmpty())
                    .as("Campos publicados em %s", nome).isFalse();
        }
        assertThat(rotas.path(base).path("post").path("responses").path("409")
                .path("description").asText()).contains("VISITA_JA_AGENDADA");
        assertThat(rotas.path(base).path("post").path("responses").path("400")
                .path("description").asText())
                .contains("ESTADO_ESTUDO_INVALIDO", "PARTICIPACAO_INVALIDA",
                        "DATA_VISITA_INVALIDA", "VALIDACAO_INVALIDA");
        assertThat(rotas.path(base + "/{visitaAgendadaId}").path("put").path("responses")
                .path("400").path("description").asText())
                .contains("ESTADO_ESTUDO_INVALIDO", "TRANSICAO_VISITA_INVALIDA");
        assertThat(rotas.path(base + "/{visitaAgendadaId}/situacao").path("patch")
                .path("responses").path("400").path("description").asText())
                .contains("TRANSICAO_VISITA_INVALIDA", "VALIDACAO_INVALIDA");
        assertThat(rotas.path(base + "/{visitaAgendadaId}/correcoes").path("post")
                .path("responses").path("400").path("description").asText())
                .contains("CORRECAO_BLOQUEADA");
    }

    /** Confere rotas, schemas e erros publicados para cadastro e edição de resultados. */
    @Test
    void documentaOperacoesDeResultados() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode rotas = contrato.path("paths");
        String base = "/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados";

        for (String[] item : new String[][]{
                {base, "post", "201", "400", "401", "403", "404", "409"},
                {base + "/{resultadoId}", "put", "200", "400", "401", "403", "404"}}) {
            JsonNode operacao = rotas.path(item[0]).path(item[1]);
            assertThat(operacao.isMissingNode()).as("%s %s", item[1], item[0]).isFalse();
            assertThat(operacao.path("security").toString()).contains("sessao");
            assertThat(operacao.path("parameters").toString()).contains("TokenCsrf");
            for (int i = 2; i < item.length; i++) {
                assertThat(operacao.path("responses").has(item[i]))
                        .as("%s %s documenta %s", item[1], item[0], item[i]).isTrue();
            }
            for (String codigo : new String[]{"400", "401", "403", "404"}) {
                assertThat(operacao.path("responses").path(codigo).path("content")
                        .path("*/*").path("schema").path("$ref").asText())
                        .as("%s %s descreve o erro %s", item[1], item[0], codigo)
                        .endsWith("/ErroApi");
            }
            assertThat(operacao.path("responses").path(item[2]).path("content")
                    .path("*/*").path("schema").path("$ref").asText())
                    .endsWith("/ResultadoAtividadeResposta");
        }

        assertThat(rotas.path(base).path("post").path("requestBody").path("content")
                .path("application/json").path("schema").path("$ref").asText())
                .endsWith("/ResultadoAtividadeCadastroEntrada");
        assertThat(rotas.path(base + "/{resultadoId}").path("put").path("requestBody")
                .path("content").path("application/json").path("schema").path("$ref").asText())
                .endsWith("/ResultadoAtividadeEdicaoEntrada");

        JsonNode schemas = contrato.path("components").path("schemas");
        assertThat(schemas.path("ResultadoAtividadeCadastroEntrada").path("properties")
                .path("texto").path("maxLength").asInt()).isEqualTo(1000);
        assertThat(schemas.path("ResultadoAtividadeEdicaoEntrada").path("properties")
                .path("texto").path("maxLength").asInt()).isEqualTo(1000);
        assertThat(rotas.path(base).path("post").path("responses").path("400")
                .path("description").asText())
                .contains("RESULTADO_INVALIDO", "VALIDACAO_INVALIDA");
        assertThat(rotas.path(base).path("post").path("responses").path("404")
                .path("description").asText()).contains("RECURSO_NAO_ENCONTRADO");
        assertThat(rotas.path(base).path("post").path("responses").path("409")
                .path("description").asText()).contains("RESULTADO_JA_REGISTRADO");
        assertThat(rotas.path(base + "/{resultadoId}").path("put").path("responses")
                .path("400").path("description").asText())
                .contains("ESTADO_ESTUDO_INVALIDO", "RESULTADO_INVALIDO", "VALIDACAO_INVALIDA");
    }

    /** Confere a consulta das participações e o schema de seus dados. */
    @Test
    void documentaListagemDeParticipacoes() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode operacao = contrato.path("paths")
                .path("/estudos/{estudoId}/participacoes").path("get");

        assertThat(operacao.isMissingNode()).isFalse();
        assertThat(operacao.path("security").toString()).contains("sessao");
        assertThat(operacao.path("parameters").toString()).doesNotContain("TokenCsrf");
        for (String codigo : new String[]{"200", "401", "403", "404"}) {
            assertThat(operacao.path("responses").has(codigo)).isTrue();
        }
        for (String codigo : new String[]{"401", "403", "404"}) {
            assertThat(operacao.path("responses").path(codigo).path("content")
                    .path("*/*").path("schema").path("$ref").asText())
                    .endsWith("/ErroApi");
        }
        assertThat(operacao.path("responses").path("200").path("content")
                .path("*/*").path("schema").path("type").asText()).isEqualTo("array");
        assertThat(operacao.path("responses").path("200").path("content")
                .path("*/*").path("schema").path("items").path("$ref").asText())
                .endsWith("/ParticipacaoResumoResposta");
        assertThat(operacao.path("responses").path("404").path("description").asText())
                .contains("RECURSO_NAO_ENCONTRADO");

        JsonNode propriedades = contrato.path("components").path("schemas")
                .path("ParticipacaoResumoResposta").path("properties");
        for (String campo : new String[]{"id", "participanteId", "participanteNome",
                "dataInclusao", "situacao", "dataRetirada"}) {
            assertThat(propriedades.has(campo)).as("Campo da participação: %s", campo).isTrue();
        }
    }

    /** Confere que a retirada de participantes está publicada no contrato. */
    @Test
    void documentaRetiradaDeParticipantes() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode operacao = contrato.path("paths")
                .path("/estudos/{estudoId}/participacoes/{participacaoId}/retirada")
                .path("post");

        assertThat(operacao.isMissingNode()).isFalse();
        assertThat(operacao.path("security").toString()).contains("sessao");
        assertThat(operacao.path("parameters").toString()).contains("TokenCsrf");
        for (String codigo : new String[]{"200", "400", "401", "403", "404"}) {
            assertThat(operacao.path("responses").has(codigo)).isTrue();
        }

        JsonNode motivo = contrato.path("components").path("schemas")
                .path("RetiradaEntrada").path("properties").path("motivo");
        assertThat(motivo.path("maxLength").asInt()).isEqualTo(500);

        JsonNode resposta = contrato.path("components").path("schemas")
                .path("RetiradaResposta").path("properties");
        assertThat(resposta.has("participacaoId")).isTrue();
        assertThat(resposta.has("situacao")).isTrue();
        assertThat(resposta.has("dataRetirada")).isTrue();
        assertThat(resposta.has("motivoRetirada")).isTrue();
        assertThat(resposta.has("retiradaPorId")).isTrue();
    }

    /** Confere que as consultas do participante estão publicadas, sem exigir CSRF. */
    @Test
    void documentaConsultasDoParticipante() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode rotas = contrato.path("paths");

        for (String caminho : new String[]{
                "/participante/estudos",
                "/participante/visitas/proximas",
                "/participante/visitas/historico"}) {
            JsonNode operacao = rotas.path(caminho).path("get");
            assertThat(operacao.isMissingNode()).as(caminho).isFalse();
            assertThat(operacao.path("security").toString()).contains("sessao");
            assertThat(operacao.path("parameters").toString()).doesNotContain("TokenCsrf");
            for (String codigo : new String[]{"200", "401", "403"}) {
                assertThat(operacao.path("responses").has(codigo)).isTrue();
            }
        }

        for (String caminho : new String[]{
                "/participante/visitas/proximas",
                "/participante/visitas/historico"}) {
            JsonNode operacao = rotas.path(caminho).path("get");
            assertThat(operacao.path("parameters").toString()).contains("estudoId");
            assertThat(operacao.path("responses").has("400")).isTrue();
            assertThat(operacao.path("responses").has("404")).isTrue();
        }
    }

    /**
     * Confere os contratos GET da visita e de seus resultados para a web.
     *
     * @throws Exception se a consulta ou a leitura do contrato falhar
     * @since 1.0
     */
    @Test
    void documentaConsultasDaVisitaEDosResultados() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode rotas = contrato.path("paths");
        String caminhoVisita = "/estudos/{estudoId}/participacoes/{participacaoId}"
                + "/visitas/{visitaAgendadaId}";
        String caminhoResultados = caminhoVisita + "/resultados";

        for (String caminho : new String[]{caminhoVisita, caminhoResultados}) {
            JsonNode operacao = rotas.path(caminho).path("get");
            assertThat(operacao.isMissingNode()).as("GET %s", caminho).isFalse();
            assertThat(operacao.path("security").toString()).contains("sessao");
            assertThat(operacao.path("parameters").toString())
                    .contains("estudoId", "participacaoId", "visitaAgendadaId")
                    .doesNotContain("TokenCsrf");
            assertThat(operacao.has("requestBody")).isFalse();
            for (String codigo : new String[]{"200", "401", "403", "404"}) {
                assertThat(operacao.path("responses").has(codigo))
                        .as("GET %s documenta HTTP %s", caminho, codigo).isTrue();
            }
        }
        assertThat(rotas.path(caminhoResultados).path("get").path("responses")
                .path("403").path("description").asText())
                .contains("Perfil sem permissão")
                .doesNotContain("CSRF");

        for (String[] escrita : new String[][]{
                {caminhoResultados, "post"},
                {caminhoResultados + "/{resultadoId}", "put"}}) {
            assertThat(rotas.path(escrita[0]).path(escrita[1])
                    .path("parameters").toString()).contains("TokenCsrf");
        }

        JsonNode respostaVisita = rotas.path(caminhoVisita).path("get")
                .path("responses").path("200").path("content");
        assertThat(respostaVisita.toString()).contains("VisitaAgendadaResposta");

        JsonNode respostaResultados = rotas.path(caminhoResultados).path("get")
                .path("responses").path("200").path("content");
        assertThat(respostaResultados.toString())
                .contains("\"type\":\"array\"", "ResultadoAtividadeResposta");

        JsonNode schemas = contrato.path("components").path("schemas");
        JsonNode camposVisita = schemas.path("VisitaAgendadaResposta").path("properties");
        for (String campo : new String[]{"id", "participacaoId", "visitaPrevistaId",
                "nomeVisita", "dataHora", "situacao"}) {
            assertThat(camposVisita.has(campo)).as("Campo da visita: %s", campo).isTrue();
        }

        JsonNode camposResultado = schemas.path("ResultadoAtividadeResposta").path("properties");
        for (String campo : new String[]{"id", "visitaAgendadaId", "atividadePrevistaId",
                "descricaoAtividade", "texto", "registradoPorId", "registradoEm",
                "atualizadoPorId", "atualizadoEm"}) {
            assertThat(camposResultado.has(campo))
                    .as("Campo do resultado: %s", campo).isTrue();
        }
    }

    /**
     * Confere a publicação da consulta do histórico completo de gestão (RF15).
     *
     * @throws Exception se a consulta ou a leitura do contrato falhar
     * @since 1.0
     */
    @Test
    void documentaHistoricoCompletoDaParticipacao() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());

        JsonNode operacao = contrato.path("paths")
                .path("/estudos/{estudoId}/participacoes/{participacaoId}/historico")
                .path("get");
        assertThat(operacao.isMissingNode()).isFalse();
        assertThat(operacao.path("security").toString()).contains("sessao");
        assertThat(operacao.path("parameters").toString()).doesNotContain("TokenCsrf");
        assertThat(operacao.path("description").asText())
                .containsIgnoringCase("pesquisador")
                .containsIgnoringCase("coordenador");
        for (String codigo : new String[]{"200", "401", "403", "404"}) {
            assertThat(operacao.path("responses").has(codigo)).isTrue();
        }
        assertThat(operacao.path("responses").path("200").path("content").toString())
                .contains("HistoricoParticipacaoResposta");

        JsonNode schemas = contrato.path("components").path("schemas");
        JsonNode resposta = schemas.path("HistoricoParticipacaoResposta").path("properties");
        assertThat(resposta.has("participacaoId")).isTrue();
        assertThat(resposta.has("itens")).isTrue();

        // As duas variantes devem aparecer no OpenAPI, não apenas a interface vazia.
        JsonNode tipos = schemas.path("ItemHistoricoResposta");
        assertThat(tipos.path("oneOf").toString())
                .contains("ItemHistoricoVisitaResposta", "ItemHistoricoRetiradaResposta");

        // O discriminador permite identificar a variante pelo campo "tipo".
        JsonNode discriminador = tipos.path("discriminator");
        assertThat(discriminador.path("propertyName").asText()).isEqualTo("tipo");
        JsonNode mapeamento = discriminador.path("mapping");
        assertThat(mapeamento.size()).isEqualTo(2);
        assertThat(mapeamento.path("VISITA").asText())
                .isEqualTo("#/components/schemas/ItemHistoricoVisitaResposta");
        assertThat(mapeamento.path("RETIRADA").asText())
                .isEqualTo("#/components/schemas/ItemHistoricoRetiradaResposta");

        JsonNode visita = schemas.path("ItemHistoricoVisitaResposta").path("properties");
        for (String campo : new String[]{"tipo", "visitaAgendadaId", "nomeVisita", "dataHora",
                "situacao", "motivo", "registradoPorId", "registradoPorNome", "registradoEm",
                "resultados", "correcoes"}) {
            assertThat(visita.has(campo)).as("Campo da visita: %s", campo).isTrue();
        }

        JsonNode correcao = schemas.path("CorrecaoVisitaResposta").path("properties");
        for (String campo : new String[]{"motivoAnterior", "motivoNovo", "corrigidaPorId", "corrigidaPorNome"}) {
            assertThat(correcao.has(campo)).as("Campo da correção: %s", campo).isTrue();
        }

        JsonNode retirada = schemas.path("ItemHistoricoRetiradaResposta").path("properties");
        for (String campo : new String[]{"tipo", "dataRetirada", "motivo", "retiradaPorId", "retiradaPorNome"}) {
            assertThat(retirada.has(campo)).as("Campo da retirada: %s", campo).isTrue();
        }
    }

    /**
     * Confere a publicação do painel de indicadores (RF21).
     *
     * @throws Exception se a consulta ou a leitura do contrato falhar
     * @since 1.0
     */
    @Test
    void documentaPainelDeIndicadores() throws Exception {
        JsonNode contrato = json.readTree(mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        JsonNode operacao = contrato.path("paths")
                .path("/estudos/{estudoId}/indicadores")
                .path("get");

        assertThat(operacao.isMissingNode()).isFalse();

        assertThat(operacao.path("security").toString())
                .contains("sessao");

        assertThat(operacao.path("parameters").toString())
                .contains("estudoId")
                .doesNotContain("TokenCsrf");

        assertThat(operacao.has("requestBody")).isFalse();

        assertThat(operacao.path("description").asText())
                .containsIgnoringCase("pesquisador")
                .containsIgnoringCase("coordenador");

        for (String codigo : new String[]{"200", "400", "401", "403", "404"}) {
            assertThat(operacao.path("responses").has(codigo))
                    .as("Resposta HTTP %s", codigo).isTrue();
        }

        for (String codigo : new String[]{"400", "401", "403", "404"}) {
            assertThat(operacao.path("responses").path(codigo).path("content")
                    .path("*/*").path("schema").path("$ref").asText())
                    .as("Schema de erro HTTP %s", codigo)
                    .endsWith("/ErroApi");
        }

        assertThat(operacao.path("responses").path("200").path("content")
                .path("*/*").path("schema").path("$ref").asText())
                .endsWith("/IndicadoresPainelResposta");

        JsonNode resposta = contrato.path("components")
                .path("schemas")
                .path("IndicadoresPainelResposta")
                .path("properties");

        for (String campo : new String[]{
                "estudoId", "totalCandidatos", "totalIncluidos",
                "participantesAtivos", "participantesRetirados",
                "visitasRealizadas", "visitasPendentes"}) {

            assertThat(resposta.has(campo))
                    .as("Campo do painel: %s", campo).isTrue();

            assertThat(resposta.path(campo).path("type").asText())
                    .isEqualTo("integer");

            assertThat(resposta.path(campo).path("description").asText())
                    .as("Descrição do campo: %s", campo).isNotBlank();
        }

        assertThat(resposta.size()).isEqualTo(7);
        assertThat(resposta.path("visitasPendentes").path("description").asText())
                .contains("AGENDADA", "data passada");
    }
}
