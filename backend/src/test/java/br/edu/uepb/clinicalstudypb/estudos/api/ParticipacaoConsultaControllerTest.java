package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ParticipacaoConsultaController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class ParticipacaoConsultaControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private VisitaAgendadaService visitas;

    @Test
    void coordenadorPodeListarParticipacoes() throws Exception {
        Usuario coordenador = criarUsuario(1L, PerfilUsuario.COORDENADOR);

        when(usuarios.findById(1L))
                .thenReturn(Optional.of(coordenador));

        ParticipacaoResumoResposta resposta = new ParticipacaoResumoResposta(
                120L,
                45L,
                "Ana Participante",
                Instant.parse("2026-11-10T12:00:00Z"),
                SituacaoParticipacao.ATIVA,
                null
        );

        when(visitas.listarParticipacoes(
                eq(10L), any(UsuarioAutenticado.class)))
                .thenReturn(List.of(resposta));

        mvc.perform(get("/estudos/10/participacoes")
                        .with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(120))
                .andExpect(jsonPath("$[0].participanteId").value(45))
                .andExpect(jsonPath("$[0].participanteNome").value("Ana Participante"))
                .andExpect(jsonPath("$[0].situacao").value("ATIVA"));

        verify(visitas).listarParticipacoes(
                eq(10L), any(UsuarioAutenticado.class));
    }

    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoPodeListar(PerfilUsuario perfil) throws Exception {
        Usuario usuario = criarUsuario(50L, perfil);

        when(usuarios.findById(50L))
                .thenReturn(Optional.of(usuario));

        mvc.perform(get("/estudos/10/participacoes")
                        .with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isForbidden());

        verify(visitas, never()).listarParticipacoes(any(), any());
    }

    @Test
    void listagemSemLoginEhBloqueada() throws Exception {
        mvc.perform(get("/estudos/10/participacoes"))
                .andExpect(status().isUnauthorized());

        verify(visitas, never()).listarParticipacoes(any(), any());
    }

    @Test
    void estudoNaoEncontradoRetorna404() throws Exception {
        Usuario coordenador = criarUsuario(1L, PerfilUsuario.COORDENADOR);

        when(usuarios.findById(1L))
                .thenReturn(Optional.of(coordenador));

        when(visitas.listarParticipacoes(
                eq(10L), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        mvc.perform(get("/estudos/10/participacoes")
                        .with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isNotFound());
    }

    private Usuario criarUsuario(Long id, PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Usuario " + id,
                "usuario" + id + "@teste.com",
                "senha-ficticia",
                perfil
        );

        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
