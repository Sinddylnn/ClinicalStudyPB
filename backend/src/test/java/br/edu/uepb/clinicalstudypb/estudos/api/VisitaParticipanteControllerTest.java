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

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaParticipanteService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

// <-------------------CONTRATO HTTP DAS VISITAS DO PARTICIPANTE------------------->
/**
 * Testa permissões, CSRF, validação e respostas das ações do participante.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
@WebMvcTest(VisitaParticipanteController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class VisitaParticipanteControllerTest {

    private static final String CONFIRMACAO = "/participante/visitas/40/confirmacao";
    private static final String REAGENDAMENTO = "/participante/visitas/40/reagendamentos";

    @Autowired private MockMvc mvc;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private VisitaParticipanteService visitas;

    private Usuario participante;

    @BeforeEach
    void preparar() {
        participante = conta(5L, PerfilUsuario.PARTICIPANTE);
        when(usuarios.findById(5L)).thenReturn(Optional.of(participante));
    }

    @Test
    void participanteConfirmaPresenca() throws Exception {
        Instant confirmada = Instant.parse("2026-11-28T13:30:00Z");
        when(visitas.confirmarPresenca(eq(40L), any(UsuarioAutenticado.class)))
                .thenReturn(new ConfirmacaoPresencaResposta(
                        40L, 10L, "Estudo", "Visita inicial",
                        Instant.parse("2026-11-29T13:30:00Z"),
                        SituacaoVisita.AGENDADA, confirmada));

        mvc.perform(post(CONFIRMACAO)
                        .with(user(new UsuarioAutenticado(participante)))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("AGENDADA"))
                .andExpect(jsonPath("$.presencaConfirmadaEm").value(
                        "2026-11-28T13:30:00Z"));

        verify(visitas).confirmarPresenca(eq(40L), any(UsuarioAutenticado.class));
    }

    @Test
    void participantePedeReagendamentoComOffsetMenosTres() throws Exception {
        Instant solicitada = Instant.parse("2026-11-28T13:30:00Z");
        when(visitas.pedirReagendamento(eq(40L), any(PedidoReagendamentoEntrada.class),
                any(UsuarioAutenticado.class)))
                .thenReturn(new SolicitacaoReagendamentoParticipanteResposta(
                        60L, SituacaoSolicitacao.PENDENTE,
                        Instant.parse("2026-11-29T17:00:00Z"),
                        Instant.parse("2026-12-03T17:00:00Z"),
                        "Consulta médica no mesmo horário",
                        solicitada, null, null, null));

        mvc.perform(post(REAGENDAMENTO)
                        .with(user(new UsuarioAutenticado(participante)))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dataHoraDesejada\":\"2026-12-03T14:00:00-03:00\","
                                + "\"motivo\":\"Consulta médica no mesmo horário\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.situacao").value("PENDENTE"))
                .andExpect(jsonPath("$.dataHoraDesejada").value("2026-12-03T17:00:00Z"))
                .andExpect(jsonPath("$.respondidaPor").doesNotExist())
                .andExpect(jsonPath("$.respondidaPorId").doesNotExist());
    }

    @Test
    void semSessaoRecebe401() throws Exception {
        mvc.perform(post(CONFIRMACAO).with(csrf()))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(REAGENDAMENTO).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dataHoraDesejada\":\"2026-12-03T14:00:00-03:00\"}"))
                .andExpect(status().isUnauthorized());
        verify(visitas, never()).confirmarPresenca(any(), any());
        verify(visitas, never()).pedirReagendamento(any(), any(), any());
    }

    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PESQUISADOR", "COORDENADOR"})
    void outrosPerfisRecebem403(PerfilUsuario perfil) throws Exception {
        Usuario outro = conta(50L, perfil);
        when(usuarios.findById(50L)).thenReturn(Optional.of(outro));

        mvc.perform(post(CONFIRMACAO)
                        .with(user(new UsuarioAutenticado(outro))).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(post(REAGENDAMENTO)
                        .with(user(new UsuarioAutenticado(outro))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dataHoraDesejada\":\"2026-12-03T14:00:00-03:00\"}"))
                .andExpect(status().isForbidden());

        verify(visitas, never()).confirmarPresenca(any(), any());
        verify(visitas, never()).pedirReagendamento(any(), any(), any());
    }

    @Test
    void semCsrfRecebe403() throws Exception {
        mvc.perform(post(CONFIRMACAO)
                        .with(user(new UsuarioAutenticado(participante))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));

        verify(visitas, never()).confirmarPresenca(any(), any());
    }

    @Test
    void dataAusenteRecebe400() throws Exception {
        mvc.perform(post(REAGENDAMENTO)
                        .with(user(new UsuarioAutenticado(participante))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motivo\":\"Consulta\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.dataHoraDesejada").exists());
    }

    @Test
    void motivoAcimaDe500Recebe400() throws Exception {
        mvc.perform(post(REAGENDAMENTO)
                        .with(user(new UsuarioAutenticado(participante))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dataHoraDesejada\":\"2026-12-03T14:00:00-03:00\","
                                + "\"motivo\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos.motivo").exists());
    }

    @Test
    void jsonMalformadoRecebe400() throws Exception {
        mvc.perform(post(REAGENDAMENTO)
                        .with(user(new UsuarioAutenticado(participante))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }

    @Test
    void visitaNaoNumericaRecebe400() throws Exception {
        mvc.perform(post("/participante/visitas/abc/confirmacao")
                        .with(user(new UsuarioAutenticado(participante))).with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void errosDoServicoMantemCodigos() throws Exception {
        when(visitas.confirmarPresenca(eq(40L), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Visita agendada não encontrada."));
        mvc.perform(post(CONFIRMACAO)
                        .with(user(new UsuarioAutenticado(participante))).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));

        when(visitas.pedirReagendamento(eq(40L),
                any(PedidoReagendamentoEntrada.class), any(UsuarioAutenticado.class)))
                .thenThrow(new ConflitoException(
                        "SOLICITACAO_JA_PENDENTE",
                        "Já existe um pedido de reagendamento pendente para esta visita."));
        mvc.perform(post(REAGENDAMENTO)
                        .with(user(new UsuarioAutenticado(participante))).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dataHoraDesejada\":\"2026-12-03T14:00:00-03:00\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("SOLICITACAO_JA_PENDENTE"));

        when(visitas.confirmarPresenca(eq(40L), any(UsuarioAutenticado.class)))
                .thenThrow(new RegraNegocioException(
                        "TRANSICAO_VISITA_INVALIDA",
                        "A visita precisa estar agendada e ser futura."));
        mvc.perform(post(CONFIRMACAO)
                        .with(user(new UsuarioAutenticado(participante))).with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("TRANSICAO_VISITA_INVALIDA"));
    }

    private Usuario conta(Long id, PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Usuario " + id, "usuario" + id + "@teste.com",
                "senha-ficticia", perfil);
        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
