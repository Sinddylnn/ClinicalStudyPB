package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.api.IndicadoresPainelResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * Testa as contagens do painel e as permissões de consulta.
 *
 * @author Luiz
 * @version 1.0
 * @since 26/11/2026
 */
@ExtendWith(MockitoExtension.class)
class IndicadoresPainelServiceTest {

    @Mock private EstudoRepository estudos;
    @Mock private CandidatoRepository candidatos;
    @Mock private ParticipacaoRepository participacoes;
    @Mock private VisitaAgendadaRepository visitas;

    @InjectMocks private IndicadoresPainelService servico;

    private Usuario pesquisador;
    private Usuario coordenador;
    private Estudo estudo;

    /** Prepara os usuários e o estudo utilizado nos testes. */
    @BeforeEach
    void preparar() {
        pesquisador = usuario(1L, "Pesquisador", PerfilUsuario.PESQUISADOR);
        coordenador = usuario(2L, "Coordenador", PerfilUsuario.COORDENADOR);

        estudo = new Estudo("Estudo A", "Objetivo fictício", pesquisador,
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 12, 31), 10);

        estudo.atribuirCoordenador(coordenador);
        ReflectionTestUtils.setField(estudo, "id", 10L);
    }

    /** Confere todas as contagens retornadas ao pesquisador responsável. */
    @Test
    void pesquisadorConsultaIndicadores() {
        when(estudos.findByIdAndResponsavelId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        estudo.alterarEstado(EstadoEstudo.EXECUCAO, null);
        prepararContagens(4L);

        var resposta = servico.consultar(
                10L, new UsuarioAutenticado(pesquisador));

        assertThat(resposta).isEqualTo(
                new IndicadoresPainelResposta(10L, 8, 5, 3, 2, 7, 4));

        verify(estudos).findByIdAndResponsavelId(10L, 1L);
    }

    /** Permite a consulta pelo coordenador vinculado ao estudo. */
    @Test
    void coordenadorConsultaIndicadores() {
        when(estudos.findByIdAndCoordenadorId(10L, 2L))
                .thenReturn(Optional.of(estudo));

        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        estudo.alterarEstado(EstadoEstudo.EXECUCAO, null);
        prepararContagens(4L);

        var resposta = servico.consultar(
                10L, new UsuarioAutenticado(coordenador));

        assertThat(resposta).isEqualTo(
                new IndicadoresPainelResposta(10L, 8, 5, 3, 2, 7, 4));

        verify(estudos).findByIdAndCoordenadorId(10L, 2L);
    }

    /** Retorna zero para todos os indicadores de um estudo sem registros. */
    @Test
    void estudoSemRegistrosRetornaContagensZeradas() {
        when(estudos.findByIdAndResponsavelId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        var resposta = servico.consultar(
                10L, new UsuarioAutenticado(pesquisador));

        assertThat(resposta).isEqualTo(
                new IndicadoresPainelResposta(10L, 0, 0, 0, 0, 0, 0));

        verify(candidatos).countByEstudoId(10L);
        verify(participacoes).countByEstudoId(10L);
        verify(participacoes).countByEstudoIdAndSituacao(10L, SituacaoParticipacao.ATIVA);
        verify(participacoes).countByEstudoIdAndSituacao(10L, SituacaoParticipacao.RETIRADA);
        verify(visitas).countByParticipacao_Estudo_IdAndSituacao(10L, SituacaoVisita.REALIZADA);
        verify(visitas).countByParticipacao_Estudo_IdAndSituacao(10L, SituacaoVisita.AGENDADA);
    }

    /** Mantém disponíveis os indicadores de um estudo encerrado. */
    @Test
    void estudoEncerradoPermiteConsulta() {
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        estudo.alterarEstado(EstadoEstudo.EXECUCAO, null);
        estudo.alterarEstado(EstadoEstudo.ENCERRADO, null);

        when(estudos.findByIdAndResponsavelId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        prepararContagens(0L);

        var resposta = servico.consultar(
                10L, new UsuarioAutenticado(pesquisador));

        assertThat(resposta).isEqualTo(
                new IndicadoresPainelResposta(10L, 8, 5, 3, 2, 7, 0));
    }

    /** Impede que o pesquisador consulte indicadores de outro estudo. */
    @Test
    void pesquisadorSemVinculoRecebe404() {
        when(estudos.findByIdAndResponsavelId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.consultar(
                10L, new UsuarioAutenticado(pesquisador)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode())
                                .isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(candidatos, participacoes, visitas);
    }

    /** Impede a consulta por coordenador sem vínculo com o estudo. */
    @Test
    void coordenadorSemVinculoRecebe404() {
        when(estudos.findByIdAndCoordenadorId(10L, 2L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.consultar(
                10L, new UsuarioAutenticado(coordenador)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode())
                                .isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(candidatos, participacoes, visitas);
    }

    /** Rejeita a consulta de um estudo inexistente. */
    @Test
    void estudoInexistenteRecebe404() {
        when(estudos.findByIdAndResponsavelId(99L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.consultar(
                99L, new UsuarioAutenticado(pesquisador)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode())
                                .isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(candidatos, participacoes, visitas);
    }

    /** Rejeita os perfis que não possuem acesso ao painel. */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoRecebeAcessoNegado(PerfilUsuario perfil) {
        Usuario outro = usuario(3L, "Outro usuário", perfil);

        assertThatThrownBy(() -> servico.consultar(
                10L, new UsuarioAutenticado(outro)))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, candidatos, participacoes, visitas);
    }

    /** Rejeita a consulta sem identidade autenticada. */
    @Test
    void autenticacaoAusenteRecebeAcessoNegado() {
        assertThatThrownBy(() -> servico.consultar(10L, null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, candidatos, participacoes, visitas);
    }

    /**
     * Configura as contagens utilizadas nos cenários de sucesso.
     *
     * @param pendentes quantidade de visitas agendadas
     */
    private void prepararContagens(long pendentes) {
        when(candidatos.countByEstudoId(10L)).thenReturn(8L);
        when(participacoes.countByEstudoId(10L)).thenReturn(5L);

        when(participacoes.countByEstudoIdAndSituacao(
                10L, SituacaoParticipacao.ATIVA)).thenReturn(3L);

        when(participacoes.countByEstudoIdAndSituacao(
                10L, SituacaoParticipacao.RETIRADA)).thenReturn(2L);

        when(visitas.countByParticipacao_Estudo_IdAndSituacao(
                10L, SituacaoVisita.REALIZADA)).thenReturn(7L);

        when(visitas.countByParticipacao_Estudo_IdAndSituacao(
                10L, SituacaoVisita.AGENDADA)).thenReturn(pendentes);
    }

    /** Cria uma conta com identificador definido para os testes. */
    private Usuario usuario(Long id, String nome, PerfilUsuario perfil) {
        Usuario retorno = new Usuario(
                nome, "usuario" + id + "@teste.com", "senha", perfil);

        ReflectionTestUtils.setField(retorno, "id", id);
        return retorno;
    }
}
