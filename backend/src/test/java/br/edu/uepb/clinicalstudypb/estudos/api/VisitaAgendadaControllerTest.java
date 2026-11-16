package br.edu.uepb.clinicalstudypb.estudos.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;

/**
 * Testa os endpoints de agendamento, reagendamento, registro
 * e correção de situação das visitas, incluindo validações e permissões.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
@WebMvcTest(VisitaAgendadaController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class VisitaAgendadaControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private VisitaAgendadaService visitas;

    private Usuario coordenador;
    private Usuario pesquisador;

    // <-------PREPARACAO DOS TESTES------->
    /**
     * Prepara os dados necessários para executar os testes.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararDados() {
        coordenador = criarUsuario(1L, PerfilUsuario.COORDENADOR);
        pesquisador = criarUsuario(2L, PerfilUsuario.PESQUISADOR);

        when(usuarios.findById(1L))
                .thenReturn(Optional.of(coordenador));
        when(usuarios.findById(2L))
                .thenReturn(Optional.of(pesquisador));
    }

    /**
     * Verifica se coordenadores podem agendar visitas.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void coordenadorPodeAgendar() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "visitaPrevistaId": 30,
                                  "dataHora": "2026-12-01T14:00:00Z"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(visitas).agendar(
                eq(10L),
                eq(20L),
                any(VisitaAgendadaCadastroEntrada.class),
                any(UsuarioAutenticado.class));
    }

    /**
     * Verifica se pesquisadores não podem agendar visitas.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void pesquisadorNaoPodeAgendar() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas")
                        .with(user(new UsuarioAutenticado(pesquisador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "visitaPrevistaId": 30,
                                  "dataHora": "2026-12-01T14:00:00Z"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).agendar(
                any(), any(), any(), any());
    }

    /**
     * Verifica se o agendamento exige autenticação.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void agendamentoSemLoginEhBloqueado() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "visitaPrevistaId": 30,
                                  "dataHora": "2026-12-01T14:00:00Z"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    /**
     * Verifica se o agendamento exige um token CSRF válido.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void agendamentoSemCsrfEhBloqueado() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "visitaPrevistaId": 30,
                                  "dataHora": "2026-12-01T14:00:00Z"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    /**
     * Verifica se coordenadores podem reagendar visitas.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void coordenadorPodeReagendar() throws Exception {
        mvc.perform(put("/estudos/10/participacoes/20/visitas/40")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dataHora": "2026-12-02T14:00:00Z"
                                }
                                """))
                .andExpect(status().isOk());

        verify(visitas).reagendar(
                eq(10L),
                eq(20L),
                eq(40L),
                any(VisitaAgendadaReagendamentoEntrada.class),
                any(UsuarioAutenticado.class));
    }


    /**
     * Verifica se usuários sem permissão não podem reagendar visitas.
     *
     * @param perfil perfil do usuário utilizado no teste
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void usuarioSemPermissaoNaoPodeReagendar(PerfilUsuario perfil) throws Exception {
        Usuario usuario = criarUsuario(50L, perfil);

        when(usuarios.findById(50L))
                .thenReturn(Optional.of(usuario));

        mvc.perform(put("/estudos/10/participacoes/20/visitas/40")
                        .with(user(new UsuarioAutenticado(usuario)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dataHora": "2026-12-02T14:00:00Z"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).reagendar(
                any(), any(), any(), any(), any());
    }

    /**
     * Verifica se o reagendamento exige autenticação.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void reagendamentoSemLoginEhBloqueado() throws Exception {
        mvc.perform(put("/estudos/10/participacoes/20/visitas/40")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dataHora": "2026-12-02T14:00:00Z"
                                }
                                """))
                .andExpect(status().isUnauthorized());

        verify(visitas, never()).reagendar(
                any(), any(), any(), any(), any());
    }

    /**
     * Verifica se o reagendamento exige um token CSRF válido.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void reagendamentoSemCsrfEhBloqueado() throws Exception {
        mvc.perform(put("/estudos/10/participacoes/20/visitas/40")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dataHora": "2026-12-02T14:00:00Z"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).reagendar(
                any(), any(), any(), any(), any());
    }


    /**
     * Verifica se identificadores inválidos retornam HTTP 400.
     *
     * @param valor valor inválido utilizado no teste
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(strings = {"null", "0", "-1"})
    void agendamentoComVisitaPrevistaInvalidaRetorna400(String valor) throws Exception {
        String corpo = """
                {
                  "visitaPrevistaId": %s,
                  "dataHora": "2026-12-01T14:00:00Z"
                }
                """.formatted(valor);

        mvc.perform(post("/estudos/10/participacoes/20/visitas")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).agendar(
                any(), any(), any(), any());
    }

    /**
     * Verifica se uma data nula no agendamento retorna HTTP 400.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void agendamentoComDataHoraNulaRetorna400() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "visitaPrevistaId": 30,
                                  "dataHora": null
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).agendar(
                any(), any(), any(), any());
    }

    /**
     * Verifica se uma data nula no reagendamento retorna HTTP 400.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void reagendamentoComDataHoraNulaRetorna400() throws Exception {
        mvc.perform(put("/estudos/10/participacoes/20/visitas/40")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "dataHora": null
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).reagendar(
                any(), any(), any(), any(), any());
    }


    // <-------TESTES DE REGISTRO DE SITUACAO------->
    /**
     * Verifica se coordenadores podem registrar a situação de visitas.
     *
     * @throws Exception se ocorrer erro na execução da requisição de teste
     * @since 1.0
     */
    @Test
    void coordenadorPodeRegistrarSituacao() throws Exception {
        mvc.perform(patch("/estudos/10/participacoes/20/visitas/40/situacao")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "CANCELADA",
                                  "motivo": "Participante solicitou cancelamento"
                                }
                                """))
                .andExpect(status().isOk());

        verify(visitas).registrarSituacao(
                eq(10L),
                eq(20L),
                eq(40L),
                any(VisitaAgendadaSituacaoEntrada.class),
                any(UsuarioAutenticado.class));
    }


    /**
     * Impede o registro de visitas por usuários sem permissão.
     *
     * @param perfil perfil sem permissão
     * @throws Exception se ocorrer erro na requisição
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void usuarioSemPermissaoNaoPodeRegistrarSituacao(
            PerfilUsuario perfil) throws Exception {

        Usuario usuario = criarUsuario(50L, perfil);

        when(usuarios.findById(50L))
                .thenReturn(Optional.of(usuario));

        mvc.perform(patch("/estudos/10/participacoes/20/visitas/40/situacao")
                        .with(user(new UsuarioAutenticado(usuario)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "CANCELADA",
                                  "motivo": "Cancelamento solicitado"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).registrarSituacao(
                any(), any(), any(), any(), any());
    }


    /**
     * Impede o registro de situação sem token CSRF.
     *
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @Test
    void registroSituacaoSemCsrfEhBloqueado() throws Exception {
        mvc.perform(patch("/estudos/10/participacoes/20/visitas/40/situacao")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "CANCELADA",
                                  "motivo": "Cancelamento solicitado"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).registrarSituacao(
                any(), any(), any(), any(), any());
    }


    /**
     * Impede o registro de situação sem autenticação.
     *
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @Test
    void registroSituacaoSemLoginEhBloqueado() throws Exception {
        mvc.perform(patch("/estudos/10/participacoes/20/visitas/40/situacao")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "CANCELADA",
                                  "motivo": "Cancelamento solicitado"
                                }
                                """))
                .andExpect(status().isUnauthorized());

        verify(visitas, never()).registrarSituacao(
                any(), any(), any(), any(), any());
    }


    /**
     * Impede registrar uma visita sem informar a situação.
     *
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @Test
    void registroSituacaoNulaRetorna400() throws Exception {
        mvc.perform(patch("/estudos/10/participacoes/20/visitas/40/situacao")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": null,
                                  "motivo": "Cancelamento solicitado"
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).registrarSituacao(
                any(), any(), any(), any(), any());
    }


    /**
     * Rejeita um motivo com mais de 500 caracteres.
     *
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @Test
    void registroSituacaoComMotivoMuitoLongoRetorna400() throws Exception {
        String motivo = "a".repeat(501);

        String corpo = """
                {
                  "situacao": "CANCELADA",
                  "motivo": "%s"
                }
                """.formatted(motivo);

        mvc.perform(patch("/estudos/10/participacoes/20/visitas/40/situacao")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).registrarSituacao(
                any(), any(), any(), any(), any());
    }


    // <-------TESTES DE CORRECAO DE SITUACAO------->
    /**
     * Verifica se o coordenador pode corrigir uma visita.
     *
     * @throws Exception se ocorrer erro na requisição
     * @since 1.0
     */
    @Test
    void coordenadorPodeCorrigirSituacao() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas/40/correcoes")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "REALIZADA",
                                  "justificativa": "Registro anterior incorreto"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(visitas).corrigirSituacao(
                eq(10L), eq(20L), eq(40L),
                any(CorrecaoVisitaEntrada.class),
                any(UsuarioAutenticado.class));
    }

    /**
     * Impede correções por usuários sem permissão.
     *
     * @param perfil perfil sem permissão
     * @throws Exception se ocorrer erro na requisição
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void usuarioSemPermissaoNaoPodeCorrigirSituacao(
            PerfilUsuario perfil) throws Exception {

        Usuario usuario = criarUsuario(50L, perfil);

        when(usuarios.findById(50L))
                .thenReturn(Optional.of(usuario));

        mvc.perform(post("/estudos/10/participacoes/20/visitas/40/correcoes")
                        .with(user(new UsuarioAutenticado(usuario)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "REALIZADA",
                                  "justificativa": "Registro anterior incorreto"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).corrigirSituacao(
                any(), any(), any(), any(), any());
    }

    /**
     * Impede correções sem token CSRF.
     *
     * @throws Exception se ocorrer erro na requisição
     * @since 1.0
     */
    @Test
    void correcaoSemCsrfEhBloqueada() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas/40/correcoes")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "REALIZADA",
                                  "justificativa": "Registro anterior incorreto"
                                }
                                """))
                .andExpect(status().isForbidden());

        verify(visitas, never()).corrigirSituacao(
                any(), any(), any(), any(), any());
    }

    /**
     * Impede a correção de situação quando não há usuário autenticado.
     *
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @Test
    void correcaoSemLoginEhBloqueada() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas/40/correcoes")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": "REALIZADA",
                                  "justificativa": "Registro anterior incorreto"
                                }
                                """))
                .andExpect(status().isUnauthorized());

        verify(visitas, never()).corrigirSituacao(
                any(), any(), any(), any(), any());
    }

    /**
     * Rejeita a correção quando a justificativa é nula ou vazia.
     *
     * @param justificativa valor inválido enviado no JSON
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(strings = {"null", "\"\"", "\"   \""})
    void correcaoComJustificativaInvalidaRetorna400(String justificativa) throws Exception {
        String corpo = """
                {
                  "situacao": "REALIZADA",
                  "justificativa": %s
                }
                """.formatted(justificativa);

        mvc.perform(post("/estudos/10/participacoes/20/visitas/40/correcoes")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).corrigirSituacao(
                any(), any(), any(), any(), any());
    }

    /**
     * Rejeita a correção quando a situação de destino não é informada.
     *
     * @throws Exception se ocorrer erro na requisição de teste
     * @since 1.0
     */
    @Test
    void correcaoComSituacaoNulaRetorna400() throws Exception {
        mvc.perform(post("/estudos/10/participacoes/20/visitas/40/correcoes")
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "situacao": null,
                                  "justificativa": "Registro anterior incorreto"
                                }
                                """))
                .andExpect(status().isBadRequest());

        verify(visitas, never()).corrigirSituacao(
                any(), any(), any(), any(), any());
    }

    /**
     * Cria um usuário com o identificador e perfil informados.
     *
     * @param id identificador do usuário
     * @param perfil perfil do usuário
     * @return usuário criado para o teste
     * @since 1.0
     */
    private Usuario criarUsuario(Long id, PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Usuario " + id,
                "usuario" + id + "@teste.com",
                "senha-ficticia",
                perfil);

        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
