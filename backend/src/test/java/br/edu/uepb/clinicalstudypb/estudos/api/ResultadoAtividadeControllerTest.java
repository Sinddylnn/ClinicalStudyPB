package br.edu.uepb.clinicalstudypb.estudos.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.ResultadoAtividadeService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;

/**
 * Testa os endpoints HTTP de consulta, cadastro e edição de resultados fictícios,
 * incluindo contrato JSON, validações, autenticação, permissões e CSRF.
 *
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
@WebMvcTest(ResultadoAtividadeController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class ResultadoAtividadeControllerTest {

    private static final String URL = "/estudos/10/participacoes/20/visitas/40/resultados";
    private static final String URL_EDICAO = URL + "/60";
    private static final String CADASTRO_VALIDO = """
            {"atividadePrevistaId":50,"texto":"Pressão arterial normal."}
            """;
    private static final String EDICAO_VALIDA = """
            {"texto":"Resultado atualizado."}
            """;

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private ResultadoAtividadeService resultados;

    private Usuario coordenador;

    /**
     * Prepara uma conta ativa de coordenador para os testes autenticados.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararDados() {
        coordenador = criarUsuario(1L, PerfilUsuario.COORDENADOR);
        when(usuarios.findById(1L)).thenReturn(Optional.of(coordenador));
    }

    // <-------------------CONSULTA------------------->

    /**
     * Confere a listagem e o contrato JSON dos resultados da visita.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void coordenadorListaResultadosComResposta200() throws Exception {
        ResultadoAtividadeResposta primeiro = new ResultadoAtividadeResposta(
                60L, 40L, 50L, "Avaliação de pressão arterial",
                "Pressão arterial normal.", 1L,
                Instant.parse("2026-11-17T15:00:00Z"), null, null);
        ResultadoAtividadeResposta segundo = new ResultadoAtividadeResposta(
                61L, 40L, 51L, "Avaliação de frequência cardíaca",
                "Frequência cardíaca normal.", 1L,
                Instant.parse("2026-11-17T15:05:00Z"), null, null);

        when(resultados.listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class)))
                .thenReturn(List.of(primeiro, segundo));

        mvc.perform(get(URL)
                        .with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(60))
                .andExpect(jsonPath("$[0].visitaAgendadaId").value(40))
                .andExpect(jsonPath("$[0].atividadePrevistaId").value(50))
                .andExpect(jsonPath("$[0].descricaoAtividade")
                        .value("Avaliação de pressão arterial"))
                .andExpect(jsonPath("$[0].texto").value("Pressão arterial normal."))
                .andExpect(jsonPath("$[1].id").value(61))
                .andExpect(jsonPath("$[1].atividadePrevistaId").value(51))
                .andExpect(jsonPath("$[1].texto").value("Frequência cardíaca normal."));

        verify(resultados).listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class));
    }

    /**
     * Retorna uma lista vazia quando a visita não possui resultados.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void consultaSemResultadosRetornaListaVazia() throws Exception {
        when(resultados.listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class)))
                .thenReturn(List.of());

        mvc.perform(get(URL)
                        .with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(resultados).listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class));
    }

    /**
     * Recusa consultas sem autenticação.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void consultaSemLoginRecebe401() throws Exception {
        mvc.perform(get(URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("AUTENTICACAO_NECESSARIA"));

        verify(resultados, never()).listarResultados(any(), any(), any(), any());
    }

    /**
     * Recusa consultas por perfis sem permissão.
     *
     * @param perfil perfil não autorizado
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoConsultaResultados(PerfilUsuario perfil)
            throws Exception {
        Usuario usuario = criarUsuario(2L, perfil);
        when(usuarios.findById(2L)).thenReturn(Optional.of(usuario));

        mvc.perform(get(URL)
                        .with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));

        verify(resultados, never()).listarResultados(any(), any(), any(), any());
    }

    /**
     * Retorna HTTP 404 quando a visita não existe no vínculo informado.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void consultaDeVisitaForaDoVinculoRetorna404() throws Exception {
        when(resultados.listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Visita agendada não encontrada."));

        mvc.perform(get(URL)
                        .with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isNotFound());

        verify(resultados).listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class));
    }

    /**
     * Converte uma negação do serviço em HTTP 403.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void consultaNegadaPeloServicoRecebe403() throws Exception {
        when(resultados.listarResultados(eq(10L), eq(20L), eq(40L),
                any(UsuarioAutenticado.class)))
                .thenThrow(new AccessDeniedException("Sem permissão para este estudo."));

        mvc.perform(get(URL)
                        .with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
    }

    // <-------------------CADASTRO------------------->

    /**
     * Confere status, vínculos, conteúdo da resposta e auditoria inicial.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void coordenadorCadastraResultadoComResposta201() throws Exception {
        ResultadoAtividadeResposta resposta = new ResultadoAtividadeResposta(
                60L, 40L, 50L, "Avaliação de pressão arterial",
                "Pressão arterial normal.", 1L,
                Instant.parse("2026-11-17T15:00:00Z"), null, null);

        when(resultados.registrar(eq(10L), eq(20L), eq(40L),
                any(ResultadoAtividadeCadastroEntrada.class),
                any(UsuarioAutenticado.class)))
                .thenReturn(resposta);

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(60))
                .andExpect(jsonPath("$.visitaAgendadaId").value(40))
                .andExpect(jsonPath("$.atividadePrevistaId").value(50))
                .andExpect(jsonPath("$.descricaoAtividade")
                        .value("Avaliação de pressão arterial"))
                .andExpect(jsonPath("$.texto").value("Pressão arterial normal."))
                .andExpect(jsonPath("$.registradoPorId").value(1))
                .andExpect(jsonPath("$.registradoEm").value("2026-11-17T15:00:00Z"));

        verify(resultados).registrar(eq(10L), eq(20L), eq(40L),
                any(ResultadoAtividadeCadastroEntrada.class),
                any(UsuarioAutenticado.class));
    }

    /**
     * Confere que o texto é normalizado antes de chegar ao serviço.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroRemoveEspacosNasExtremidades() throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"atividadePrevistaId\":50,\"texto\":\"  Resultado válido  \"}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<ResultadoAtividadeCadastroEntrada> capturador =
                ArgumentCaptor.forClass(ResultadoAtividadeCadastroEntrada.class);
        verify(resultados).registrar(eq(10L), eq(20L), eq(40L),
                capturador.capture(), any(UsuarioAutenticado.class));
        assertThat(capturador.getValue().atividadePrevistaId()).isEqualTo(50L);
        assertThat(capturador.getValue().texto()).isEqualTo("Resultado válido");
    }

    /**
     * Aceita os limites de tamanho definidos no contrato de cadastro.
     *
     * @param tamanho quantidade de caracteres do resultado
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(ints = {1, 1000})
    void cadastroAceitaTextoNosLimites(int tamanho) throws Exception {
        String texto = "x".repeat(tamanho);
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"atividadePrevistaId\":50,\"texto\":\"" + texto + "\"}"))
                .andExpect(status().isCreated());

        ArgumentCaptor<ResultadoAtividadeCadastroEntrada> capturador =
                ArgumentCaptor.forClass(ResultadoAtividadeCadastroEntrada.class);
        verify(resultados).registrar(eq(10L), eq(20L), eq(40L),
                capturador.capture(), any(UsuarioAutenticado.class));
        assertThat(capturador.getValue().texto()).hasSize(tamanho);
    }

    /**
     * Recusa campos obrigatórios ausentes ou inválidos no cadastro.
     *
     * @param corpo JSON inválido para as regras do DTO
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(strings = {
        "{}",
        "{\"atividadePrevistaId\":null,\"texto\":\"Resultado\"}",
        "{\"atividadePrevistaId\":0,\"texto\":\"Resultado\"}",
        "{\"atividadePrevistaId\":-1,\"texto\":\"Resultado\"}",
        "{\"atividadePrevistaId\":50}",
        "{\"atividadePrevistaId\":50,\"texto\":null}",
        "{\"atividadePrevistaId\":50,\"texto\":\"\"}",
        "{\"atividadePrevistaId\":50,\"texto\":\"   \"}"
    })
    void cadastroInvalidoRetorna400(String corpo) throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"));

        verify(resultados, never()).registrar(any(), any(), any(), any(), any());
    }

    /**
     * Recusa texto maior que o máximo no cadastro.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroRejeitaTextoComMaisDeMilCaracteres() throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"atividadePrevistaId\":50,\"texto\":\""
                                + "x".repeat(1001) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.texto").exists());

        verify(resultados, never()).registrar(any(), any(), any(), any(), any());
    }

    /**
     * Converte uma regra de cadastro não atendida em erro HTTP 400.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroComRegraInvalidaRetorna400() throws Exception {
        when(resultados.registrar(eq(10L), eq(20L), eq(40L),
                any(ResultadoAtividadeCadastroEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new RegraNegocioException(
                        "RESULTADO_INVALIDO", "Apenas visitas realizadas podem receber resultados."));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("RESULTADO_INVALIDO"));
    }

    /**
     * Verifica o contrato de duplicidade com HTTP 409.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroDuplicadoRetorna409() throws Exception {
        when(resultados.registrar(eq(10L), eq(20L), eq(40L),
                any(ResultadoAtividadeCadastroEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new ConflitoException(
                        "RESULTADO_JA_REGISTRADO", "Já existe resultado para esta atividade."));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("RESULTADO_JA_REGISTRADO"));
    }

    /**
     * Confere erro HTTP 404 para estudo/visita sem vínculo no cadastro.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroComRecursoForaDoVinculoRetorna404() throws Exception {
        when(resultados.registrar(eq(10L), eq(20L), eq(40L),
                any(ResultadoAtividadeCadastroEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Visita agendada não encontrada."));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isNotFound());
    }

    // <-------------------EDIÇÃO------------------->

    /**
     * Confere status HTTP 200 e resposta de edição com campos de auditoria.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void coordenadorEditaResultadoComResposta200() throws Exception {
        ResultadoAtividadeResposta resposta = new ResultadoAtividadeResposta(
                60L, 40L, 50L, "Avaliação de pressão arterial",
                "Resultado atualizado.", 1L,
                Instant.parse("2026-11-17T15:00:00Z"), 1L,
                Instant.parse("2026-11-17T18:00:00Z"));

        when(resultados.editar(eq(10L), eq(20L), eq(40L), eq(60L),
                any(ResultadoAtividadeEdicaoEntrada.class), any(UsuarioAutenticado.class)))
                .thenReturn(resposta);

        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(60))
                .andExpect(jsonPath("$.visitaAgendadaId").value(40))
                .andExpect(jsonPath("$.atividadePrevistaId").value(50))
                .andExpect(jsonPath("$.texto").value("Resultado atualizado."))
                .andExpect(jsonPath("$.registradoPorId").value(1))
                .andExpect(jsonPath("$.registradoEm").value("2026-11-17T15:00:00Z"))
                .andExpect(jsonPath("$.atualizadoPorId").value(1))
                .andExpect(jsonPath("$.atualizadoEm").value("2026-11-17T18:00:00Z"));

        verify(resultados).editar(eq(10L), eq(20L), eq(40L), eq(60L),
                any(ResultadoAtividadeEdicaoEntrada.class), any(UsuarioAutenticado.class));
    }

    /**
     * Confere que a edição remove espaços das pontas do texto.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoRemoveEspacosNasExtremidades() throws Exception {
        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texto\":\"  Texto editado  \"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<ResultadoAtividadeEdicaoEntrada> capturador =
                ArgumentCaptor.forClass(ResultadoAtividadeEdicaoEntrada.class);
        verify(resultados).editar(eq(10L), eq(20L), eq(40L), eq(60L),
                capturador.capture(), any(UsuarioAutenticado.class));
        assertThat(capturador.getValue().texto()).isEqualTo("Texto editado");
    }

    /**
     * Aceita textos nos limites estabelecidos para edição.
     *
     * @param tamanho quantidade de caracteres do texto
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(ints = {1, 1000})
    void edicaoAceitaTextoNosLimites(int tamanho) throws Exception {
        String texto = "x".repeat(tamanho);
        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texto\":\"" + texto + "\"}"))
                .andExpect(status().isOk());

        ArgumentCaptor<ResultadoAtividadeEdicaoEntrada> capturador =
                ArgumentCaptor.forClass(ResultadoAtividadeEdicaoEntrada.class);
        verify(resultados).editar(eq(10L), eq(20L), eq(40L), eq(60L),
                capturador.capture(), any(UsuarioAutenticado.class));
        assertThat(capturador.getValue().texto()).hasSize(tamanho);
    }

    /**
     * Recusa ausência, nulidade ou texto vazio na edição.
     *
     * @param corpo corpo JSON inválido
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(strings = {
        "{}",
        "{\"texto\":null}",
        "{\"texto\":\"\"}",
        "{\"texto\":\"   \"}"
    })
    void edicaoSemTextoValidoRetorna400(String corpo) throws Exception {
        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.texto").exists());

        verify(resultados, never()).editar(any(), any(), any(), any(), any(), any());
    }

    /**
     * Recusa texto maior que o limite na edição.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoRejeitaTextoComMaisDeMilCaracteres() throws Exception {
        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texto\":\"" + "x".repeat(1001) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.texto").exists());

        verify(resultados, never()).editar(any(), any(), any(), any(), any(), any());
    }

    /**
     * Converte regras impeditivas de edição em HTTP 400.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoComRegraInvalidaRetorna400() throws Exception {
        when(resultados.editar(eq(10L), eq(20L), eq(40L), eq(60L),
                any(ResultadoAtividadeEdicaoEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new RegraNegocioException(
                        "ESTADO_ESTUDO_INVALIDO", "O estudo não permite editar resultados."));

        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ESTADO_ESTUDO_INVALIDO"));
    }

    /**
     * Converte resultado ausente ou fora do vínculo em HTTP 404.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoDeResultadoForaDoVinculoRetorna404() throws Exception {
        when(resultados.editar(eq(10L), eq(20L), eq(40L), eq(60L),
                any(ResultadoAtividadeEdicaoEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Resultado não encontrado."));

        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isNotFound());
    }

    // <-------------------SEGURANÇA------------------->

    /**
     * Bloqueia cadastro para perfis que não sejam coordenadores.
     *
     * @param perfil perfil sem permissão
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoCadastraResultado(PerfilUsuario perfil) throws Exception {
        Usuario usuario = criarUsuario(2L, perfil);
        when(usuarios.findById(2L)).thenReturn(Optional.of(usuario));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(usuario)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));

        verify(resultados, never()).registrar(any(), any(), any(), any(), any());
    }

    /**
     * Bloqueia edição para perfis que não sejam coordenadores.
     *
     * @param perfil perfil sem permissão
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoEditaResultado(PerfilUsuario perfil) throws Exception {
        Usuario usuario = criarUsuario(2L, perfil);
        when(usuarios.findById(2L)).thenReturn(Optional.of(usuario));

        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(usuario)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));

        verify(resultados, never()).editar(any(), any(), any(), any(), any(), any());
    }

    /**
     * Exige autenticação para o cadastro.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroSemLoginRecebe401() throws Exception {
        mvc.perform(post(URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("AUTENTICACAO_NECESSARIA"));

        verify(resultados, never()).registrar(any(), any(), any(), any(), any());
    }

    /**
     * Exige autenticação para a edição.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoSemLoginRecebe401() throws Exception {
        mvc.perform(put(URL_EDICAO)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("AUTENTICACAO_NECESSARIA"));

        verify(resultados, never()).editar(any(), any(), any(), any(), any(), any());
    }

    /**
     * Recusa cadastro sem token CSRF.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroSemCsrfRecebe403() throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));

        verify(resultados, never()).registrar(any(), any(), any(), any(), any());
    }

    /**
     * Recusa edição sem token CSRF.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoSemCsrfRecebe403() throws Exception {
        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));

        verify(resultados, never()).editar(any(), any(), any(), any(), any(), any());
    }

    /**
     * Recusa cadastro com token CSRF inválido.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void cadastroComCsrfInvalidoRecebe403() throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf().useInvalidToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));

        verify(resultados, never()).registrar(any(), any(), any(), any(), any());
    }

    /**
     * Recusa edição com token CSRF inválido.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void edicaoComCsrfInvalidoRecebe403() throws Exception {
        mvc.perform(put(URL_EDICAO)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf().useInvalidToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EDICAO_VALIDA))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));

        verify(resultados, never()).editar(any(), any(), any(), any(), any(), any());
    }

    /**
     * Converte negação de acesso do serviço em HTTP 403.
     *
     * @throws Exception se a requisição simulada não puder ser executada
     * @since 1.0
     */
    @Test
    void acessoNegadoPeloServicoRecebe403() throws Exception {
        when(resultados.registrar(eq(10L), eq(20L), eq(40L),
                any(ResultadoAtividadeCadastroEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new AccessDeniedException("Sem permissão para este estudo."));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CADASTRO_VALIDO))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));
    }

    /**
     * Cria uma conta de teste com perfil e identificador definidos.
     *
     * @param id identificador da conta
     * @param perfil perfil autorizado ou não autorizado
     * @return usuário configurado para autenticação no teste
     * @since 1.0
     */
    private Usuario criarUsuario(Long id, PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Usuario " + id, "usuario" + id + "@teste.com",
                "senha-ficticia", perfil);
        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
