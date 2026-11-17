package br.edu.uepb.clinicalstudypb.estudos.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
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
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.service.RetiradaParticipanteService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;

// <-------------------CONTRATO HTTP DA RETIRADA------------------->
/**
 * Testa permissões, CSRF, validações e resposta do endpoint de retirada.
 *
 * @author Georis
 * @version 1.0
 * @since 16/11/2026
 */
@WebMvcTest(RetiradaParticipanteController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class RetiradaParticipanteControllerTest {

    private static final String URL = "/estudos/10/participacoes/20/retirada";
    private static final String CORPO = "{\"motivo\":\"Participante desistiu\"}";

    @Autowired private MockMvc mvc;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private RetiradaParticipanteService retiradas;

    private Usuario coordenador;

    @BeforeEach
    void preparar() {
        coordenador = conta(1L, PerfilUsuario.COORDENADOR);
        when(usuarios.findById(1L)).thenReturn(Optional.of(coordenador));
    }

    @Test
    void coordenadorRegistraRetiradaERecebeResposta() throws Exception {
        Instant agora = Instant.parse("2026-11-16T16:00:00Z");
        when(retiradas.registrar(eq(10L), eq(20L), any(RetiradaEntrada.class),
                any(UsuarioAutenticado.class)))
                .thenReturn(new RetiradaResposta(20L, SituacaoParticipacao.RETIRADA,
                        agora, "Participante desistiu", 1L));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participacaoId").value(20))
                .andExpect(jsonPath("$.situacao").value("RETIRADA"))
                .andExpect(jsonPath("$.motivoRetirada").value("Participante desistiu"))
                .andExpect(jsonPath("$.retiradaPorId").value(1));

        verify(retiradas).registrar(eq(10L), eq(20L),
                any(RetiradaEntrada.class), any(UsuarioAutenticado.class));
    }

    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoRecebe403(PerfilUsuario perfil) throws Exception {
        Usuario usuario = conta(50L, perfil);
        when(usuarios.findById(50L)).thenReturn(Optional.of(usuario));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(usuario)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isForbidden());

        verify(retiradas, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void semLoginRecebe401() throws Exception {
        mvc.perform(post(URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isUnauthorized());

        verify(retiradas, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void semCsrfRecebe403() throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CORPO))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));

        verify(retiradas, never()).registrar(any(), any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"motivo\":null}", "{\"motivo\":\"   \"}"})
    void motivoAusenteOuEmBrancoRecebe400(String corpo) throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.motivo").exists());

        verify(retiradas, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void motivoAcimaDe500CaracteresRecebe400() throws Exception {
        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos.motivo").exists());

        verify(retiradas, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void motivoComUmCaractereEhAceito() throws Exception {
        when(retiradas.registrar(eq(10L), eq(20L), any(RetiradaEntrada.class),
                any(UsuarioAutenticado.class)))
                .thenReturn(new RetiradaResposta(20L, SituacaoParticipacao.RETIRADA,
                        Instant.parse("2026-11-16T16:00:00Z"), "x", 1L));

        mvc.perform(post(URL)
                        .with(user(new UsuarioAutenticado(coordenador)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"x\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.motivoRetirada").value("x"));

        verify(retiradas).registrar(eq(10L), eq(20L),
                any(RetiradaEntrada.class), any(UsuarioAutenticado.class));
    }

    private Usuario conta(Long id, PerfilUsuario perfil) {
        Usuario usuario = new Usuario("Usuario " + id, "usuario" + id + "@teste.com",
                "senha-ficticia", perfil);
        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
