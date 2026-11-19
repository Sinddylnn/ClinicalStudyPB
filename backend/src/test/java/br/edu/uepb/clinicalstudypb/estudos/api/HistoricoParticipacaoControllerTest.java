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
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.service.HistoricoParticipacaoService;
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

/**
 * Testa a segurança e o contrato HTTP do histórico completo da participação.
 *
 * @author Luiz
 * @version 1.0
 * @since 19/11/2026
 */
@WebMvcTest(HistoricoParticipacaoController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class HistoricoParticipacaoControllerTest {

    private static final String URL = "/estudos/10/participacoes/20/historico";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private HistoricoParticipacaoService historico;

    /**
     * Confere os campos de visitas, resultados, correções e retirada no JSON.
     *
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @Test
    void coordenadorConsultaHistoricoCompletoComTodosOsItens() throws Exception {
        Usuario coordenador = conta(1L, PerfilUsuario.COORDENADOR);
        when(usuarios.findById(1L)).thenReturn(Optional.of(coordenador));

        var visita = new ItemHistoricoVisitaResposta(
                "VISITA", 501L, "Visita inicial",
                Instant.parse("2026-11-15T13:30:00Z"),
                SituacaoVisita.REALIZADA, null, 1L,
                Instant.parse("2026-11-15T14:00:00Z"),
                List.of(new ResultadoHistoricoResposta(31L, "Avaliação inicial", "Resultado fictício")),
                List.of(new CorrecaoVisitaResposta(
                        901L, 501L, SituacaoVisita.AUSENTE, SituacaoVisita.REALIZADA,
                        "Registro anterior incorreto", 1L,
                        Instant.parse("2026-11-15T14:05:00Z")))
        );
        var retirada = new ItemHistoricoRetiradaResposta(
                "RETIRADA", Instant.parse("2026-11-20T14:00:00Z"),
                "Participante solicitou retirada", 1L);

        when(historico.consultar(eq(10L), eq(20L), any(UsuarioAutenticado.class)))
                .thenReturn(new HistoricoParticipacaoResposta(
                        20L, List.of(visita, retirada)));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participacaoId").value(20))
                .andExpect(jsonPath("$.itens.length()").value(2))
                .andExpect(jsonPath("$.itens[0].tipo").value("VISITA"))
                .andExpect(jsonPath("$.itens[0].visitaAgendadaId").value(501))
                .andExpect(jsonPath("$.itens[0].nomeVisita").value("Visita inicial"))
                .andExpect(jsonPath("$.itens[0].dataHora").value("2026-11-15T13:30:00Z"))
                .andExpect(jsonPath("$.itens[0].situacao").value("REALIZADA"))
                .andExpect(jsonPath("$.itens[0].registradoPorId").value(1))
                .andExpect(jsonPath("$.itens[0].resultados[0].atividadePrevistaId").value(31))
                .andExpect(jsonPath("$.itens[0].resultados[0].descricaoAtividade").value("Avaliação inicial"))
                .andExpect(jsonPath("$.itens[0].resultados[0].texto").value("Resultado fictício"))
                .andExpect(jsonPath("$.itens[0].correcoes[0].situacaoAnterior").value("AUSENTE"))
                .andExpect(jsonPath("$.itens[0].correcoes[0].situacaoNova").value("REALIZADA"))
                .andExpect(jsonPath("$.itens[0].correcoes[0].justificativa")
                        .value("Registro anterior incorreto"))
                .andExpect(jsonPath("$.itens[0].correcoes[0].corrigidaPorId").value(1))
                .andExpect(jsonPath("$.itens[1].tipo").value("RETIRADA"))
                .andExpect(jsonPath("$.itens[1].dataRetirada").value("2026-11-20T14:00:00Z"))
                .andExpect(jsonPath("$.itens[1].motivo").value("Participante solicitou retirada"))
                .andExpect(jsonPath("$.itens[1].retiradaPorId").value(1));

        verify(historico).consultar(eq(10L), eq(20L), any(UsuarioAutenticado.class));
    }

    /**
     * Confere se os perfis autorizados podem consultar uma participação sem eventos.
     *
     * @param perfil perfil autorizado para consulta
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class, names = {"PESQUISADOR", "COORDENADOR"})
    void perfisPermitidosConsultamHistoricoVazio(PerfilUsuario perfil) throws Exception {
        Usuario usuario = conta(2L, perfil);
        when(usuarios.findById(2L)).thenReturn(Optional.of(usuario));
        when(historico.consultar(eq(10L), eq(20L), any(UsuarioAutenticado.class)))
                .thenReturn(new HistoricoParticipacaoResposta(20L, List.of()));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participacaoId").value(20))
                .andExpect(jsonPath("$.itens.length()").value(0));

        verify(historico).consultar(eq(10L), eq(20L), any(UsuarioAutenticado.class));
    }

    /**
     * Confere que administrador e participante não acessam o histórico de gestão.
     *
     * @param perfil perfil sem autorização
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class, names = {"ADMINISTRADOR", "PARTICIPANTE"})
    void perfisSemPermissaoRecebem403(PerfilUsuario perfil) throws Exception {
        Usuario usuario = conta(50L, perfil);
        when(usuarios.findById(50L)).thenReturn(Optional.of(usuario));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isForbidden());

        verify(historico, never()).consultar(any(), any(), any());
    }

    /**
     * Confere o bloqueio de uma consulta sem sessão autenticada.
     *
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @Test
    void consultaSemLoginRecebe401() throws Exception {
        mvc.perform(get(URL))
                .andExpect(status().isUnauthorized());

        verify(historico, never()).consultar(any(), any(), any());
    }

    /**
     * Confere o retorno 404 quando o estudo não está no vínculo do usuário.
     *
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @Test
    void estudoForaDoVinculoRecebe404() throws Exception {
        Usuario pesquisador = conta(3L, PerfilUsuario.PESQUISADOR);
        when(usuarios.findById(3L)).thenReturn(Optional.of(pesquisador));
        when(historico.consultar(eq(10L), eq(20L), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(pesquisador))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));
    }

    /**
     * Confere o retorno 404 para uma participação fora do estudo informado.
     *
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @Test
    void participacaoForaDoEstudoRecebe404() throws Exception {
        Usuario coordenador = conta(1L, PerfilUsuario.COORDENADOR);
        when(usuarios.findById(1L)).thenReturn(Optional.of(coordenador));
        when(historico.consultar(eq(10L), eq(20L), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Participação não encontrada."));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(coordenador))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));
    }

    /**
     * Cria um usuário para simular uma sessão autenticada.
     *
     * @param id identificador atribuído ao usuário
     * @param perfil perfil atribuído ao usuário
     * @return usuário com o identificador informado
     * @since 1.0
     */
    private Usuario conta(Long id, PerfilUsuario perfil) {
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
