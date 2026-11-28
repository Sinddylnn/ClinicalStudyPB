package br.edu.uepb.clinicalstudypb.estudos.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.service.ParticipanteConsultaService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
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

// <-------------------CONTRATO HTTP DAS CONSULTAS DO PARTICIPANTE------------------->
/**
 * Testa permissões por perfil, sessão e o formato das respostas das rotas do aplicativo.
 *
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
@WebMvcTest(ParticipanteConsultaController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class ParticipanteConsultaControllerTest {

    private static final String[] ROTAS = {
        "/participante/estudos",
        "/participante/visitas/proximas",
        "/participante/visitas/historico"
    };

    @Autowired private MockMvc mvc;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private ParticipanteConsultaService consultas;

    private Usuario participante;

    @BeforeEach
    void preparar() {
        participante = conta(5L, PerfilUsuario.PARTICIPANTE);
        when(usuarios.findById(5L)).thenReturn(Optional.of(participante));
    }

    @Test
    void participanteConsultaEstudosSemExporCamposDeGestao() throws Exception {
        when(consultas.listarEstudos(any(UsuarioAutenticado.class)))
                .thenReturn(List.of(new ParticipanteEstudoResposta(30L, "Estudo", "Objetivo",
                        EstadoEstudo.EXECUCAO, LocalDate.parse("2026-11-01"),
                        LocalDate.parse("2026-12-01"), SituacaoParticipacao.RETIRADA)));

        mvc.perform(get("/participante/estudos").with(user(new UsuarioAutenticado(participante))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].estudoId").value(30))
                .andExpect(jsonPath("$[0].situacaoParticipacao").value("RETIRADA"))
                .andExpect(jsonPath("$[0].limiteParticipantes").doesNotExist())
                .andExpect(jsonPath("$[0].responsavel").doesNotExist());
    }

    @Test
    void participanteConsultaProximasVisitasSemExporMotivo() throws Exception {
        Instant confirmada = Instant.parse("2026-11-20T12:30:00Z");
        SolicitacaoReagendamentoParticipanteResposta pedido =
                new SolicitacaoReagendamentoParticipanteResposta(
                        601L, SituacaoSolicitacao.PENDENTE,
                        Instant.parse("2026-11-20T13:30:00Z"),
                        Instant.parse("2026-11-22T13:30:00Z"),
                        "Consulta", Instant.parse("2026-11-20T12:30:00Z"),
                        null, null, null);
        when(consultas.listarProximasVisitas(eq(null), any(UsuarioAutenticado.class)))
                .thenReturn(List.of(new ProximaVisitaParticipanteResposta(
                        501L, 30L, "Estudo", "Visita inicial",
                        Instant.parse("2026-11-20T13:30:00Z"),
                        confirmada, List.of(pedido))));

        mvc.perform(get("/participante/visitas/proximas")
                        .with(user(new UsuarioAutenticado(participante))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].visitaAgendadaId").value(501))
                .andExpect(jsonPath("$[0].nomeVisita").value("Visita inicial"))
                .andExpect(jsonPath("$[0].dataHora").value("2026-11-20T13:30:00Z"))
                .andExpect(jsonPath("$[0].motivo").doesNotExist())
                .andExpect(jsonPath("$[0].resultados").doesNotExist())
                .andExpect(jsonPath("$[0].presencaConfirmadaEm").value(
                        "2026-11-20T12:30:00Z"))
                .andExpect(jsonPath("$[0].solicitacoesReagendamento[0].situacao")
                        .value("PENDENTE"))
                .andExpect(jsonPath("$[0].solicitacoesReagendamento[0].respondidaPor")
                        .doesNotExist())
                .andExpect(jsonPath("$[0].solicitacoesReagendamento[0].respondidaPorId")
                        .doesNotExist());
    }

    @Test
    void participanteConsultaHistoricoFiltrandoPorEstudoSemExporDadosInternos() throws Exception {
        when(consultas.listarHistorico(eq(30L), any(UsuarioAutenticado.class)))
                .thenReturn(List.of(new HistoricoVisitaParticipanteResposta(
                        499L, 30L, "Estudo", "Visita anterior",
                        Instant.parse("2026-11-10T13:30:00Z"),
                        SituacaoVisita.AUSENTE, null, List.of())));

        mvc.perform(get("/participante/visitas/historico").param("estudoId", "30")
                        .with(user(new UsuarioAutenticado(participante))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].situacao").value("AUSENTE"))
                .andExpect(jsonPath("$[0].resultados").doesNotExist())
                .andExpect(jsonPath("$[0].motivo").doesNotExist())
                .andExpect(jsonPath("$[0].registradoPor").doesNotExist());

        verify(consultas).listarHistorico(eq(30L), any(UsuarioAutenticado.class));
    }

    @Test
    void estudoSemVinculoRecebe404() throws Exception {
        when(consultas.listarProximasVisitas(eq(99L), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        mvc.perform(get("/participante/visitas/proximas").param("estudoId", "99")
                        .with(user(new UsuarioAutenticado(participante))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));
    }

    @Test
    void estudoIdNaoNumericoRecebe400() throws Exception {
        mvc.perform(get("/participante/visitas/historico").param("estudoId", "abc")
                        .with(user(new UsuarioAutenticado(participante))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }

    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PESQUISADOR", "COORDENADOR"})
    void outrosPerfisRecebem403(PerfilUsuario perfil) throws Exception {
        Usuario outro = conta(50L, perfil);
        when(usuarios.findById(50L)).thenReturn(Optional.of(outro));

        for (String rota : ROTAS) {
            mvc.perform(get(rota).with(user(new UsuarioAutenticado(outro))))
                    .andExpect(status().isForbidden());
        }

        verify(consultas, never()).listarEstudos(any());
    }

    @Test
    void semLoginRecebe401() throws Exception {
        for (String rota : ROTAS) {
            mvc.perform(get(rota)).andExpect(status().isUnauthorized());
        }
    }

    private Usuario conta(Long id, PerfilUsuario perfil) {
        Usuario usuario = new Usuario("Usuario " + id, "usuario" + id + "@teste.com",
                "senha-ficticia", perfil);
        ReflectionTestUtils.setField(usuario, "id", id);
        return usuario;
    }
}
