package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

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

    @BeforeEach
    void prepararDados() {
        coordenador = criarUsuario(1L, PerfilUsuario.COORDENADOR);
        pesquisador = criarUsuario(2L, PerfilUsuario.PESQUISADOR);

        when(usuarios.findById(1L))
                .thenReturn(Optional.of(coordenador));
        when(usuarios.findById(2L))
                .thenReturn(Optional.of(pesquisador));
    }

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
