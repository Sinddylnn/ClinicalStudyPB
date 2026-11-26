package br.edu.uepb.clinicalstudypb.estudos.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.IndicadoresPainelService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
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
 * Testa o contrato HTTP e as permissões do painel de indicadores.
 *
 * @author Luiz
 * @version 1.0
 * @since 26/11/2026
 */
@WebMvcTest(IndicadoresPainelController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class
})
class IndicadoresPainelControllerTest {

    private static final String URL = "/estudos/10/indicadores";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private IndicadoresPainelService indicadores;

    /**
     * Confere o retorno dos indicadores para os perfis autorizados.
     *
     * @param perfil perfil autorizado
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "COORDENADOR"})
    void perfisPermitidosConsultamIndicadores(PerfilUsuario perfil)
            throws Exception {

        Usuario usuario = conta(1L, perfil);
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario));

        when(indicadores.consultar(eq(10L), any(UsuarioAutenticado.class)))
                .thenReturn(new IndicadoresPainelResposta(
                        10L, 8, 5, 3, 2, 7, 4));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estudoId").value(10))
                .andExpect(jsonPath("$.totalCandidatos").value(8))
                .andExpect(jsonPath("$.totalIncluidos").value(5))
                .andExpect(jsonPath("$.participantesAtivos").value(3))
                .andExpect(jsonPath("$.participantesRetirados").value(2))
                .andExpect(jsonPath("$.visitasRealizadas").value(7))
                .andExpect(jsonPath("$.visitasPendentes").value(4));

        verify(indicadores).consultar(
                eq(10L), any(UsuarioAutenticado.class));
    }

    /**
     * Confere a resposta de um estudo sem registros.
     *
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @Test
    void estudoSemRegistrosRetornaIndicadoresZerados() throws Exception {
        Usuario usuario = conta(1L, PerfilUsuario.COORDENADOR);
        when(usuarios.findById(1L)).thenReturn(Optional.of(usuario));

        when(indicadores.consultar(eq(10L), any(UsuarioAutenticado.class)))
                .thenReturn(new IndicadoresPainelResposta(
                        10L, 0, 0, 0, 0, 0, 0));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estudoId").value(10))
                .andExpect(jsonPath("$.totalCandidatos").value(0))
                .andExpect(jsonPath("$.totalIncluidos").value(0))
                .andExpect(jsonPath("$.participantesAtivos").value(0))
                .andExpect(jsonPath("$.participantesRetirados").value(0))
                .andExpect(jsonPath("$.visitasRealizadas").value(0))
                .andExpect(jsonPath("$.visitasPendentes").value(0));
    }

    /**
     * Confere o bloqueio dos perfis não autorizados.
     *
     * @param perfil perfil sem permissão
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PARTICIPANTE"})
    void perfisSemPermissaoRecebem403(PerfilUsuario perfil)
            throws Exception {

        Usuario usuario = conta(2L, perfil);
        when(usuarios.findById(2L)).thenReturn(Optional.of(usuario));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ACESSO_NEGADO"));

        verifyNoInteractions(indicadores);
    }

    /**
     * Confere o bloqueio de consultas sem autenticação.
     *
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @Test
    void consultaSemLoginRecebe401() throws Exception {
        mvc.perform(get(URL))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo")
                        .value("AUTENTICACAO_NECESSARIA"));

        verifyNoInteractions(indicadores);
    }

    /**
     * Confere o retorno de estudo fora do vínculo autorizado.
     *
     * @param perfil perfil utilizado na consulta
     * @throws Exception se a chamada HTTP simulada falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "COORDENADOR"})
    void estudoForaDoVinculoRecebe404(PerfilUsuario perfil)
            throws Exception {

        Usuario usuario = conta(3L, perfil);
        when(usuarios.findById(3L)).thenReturn(Optional.of(usuario));

        when(indicadores.consultar(eq(10L), any(UsuarioAutenticado.class)))
                .thenThrow(new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        mvc.perform(get(URL).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo")
                        .value("RECURSO_NAO_ENCONTRADO"));
    }

    /**
     * Cria um usuário para simular uma sessão autenticada.
     *
     * @param id identificador do usuário
     * @param perfil perfil do usuário
     * @return usuário utilizado no teste
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
