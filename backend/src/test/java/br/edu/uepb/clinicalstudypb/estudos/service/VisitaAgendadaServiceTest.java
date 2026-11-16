package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.ArgumentCaptor;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaSituacaoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.CorrecaoVisitaEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.CorrecaoVisitaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.CorrecaoVisitaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;

/**
 * Testa as regras de agendamento, reagendamento, registro
 * e correção de situação das visitas dos participantes.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
@ExtendWith(MockitoExtension.class)
class VisitaAgendadaServiceTest {

    @Mock
    private EstudoRepository estudos;

    @Mock
    private ParticipacaoRepository participacoes;

    @Mock
    private VisitaPrevistaRepository visitasPrevistas;

    @Mock
    private VisitaAgendadaRepository visitasAgendadas;

    @Mock
    private CorrecaoVisitaRepository correcoes;

    @Mock
    private ResultadoAtividadeRepository resultados;

    @InjectMocks
    private VisitaAgendadaService servico;

    private Estudo estudo;
    private Participacao participacao;
    private VisitaPrevista visitaPrevista;
    private UsuarioAutenticado coordenador;
    private Instant dataVisita;

    // <-------PREPARACAO DOS TESTES------->
    /**
     * Prepara os dados necessários para executar os testes.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararDados() {
        LocalDate hoje = LocalDate.now(ZoneId.of("America/Recife"));

        Usuario pesquisador = new Usuario(
                "Pesquisador", "pesquisador@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);

        Usuario usuarioCoordenador = new Usuario(
                "Coordenador", "coordenador@teste.com",
                "senha", PerfilUsuario.COORDENADOR);
        ReflectionTestUtils.setField(usuarioCoordenador, "id", 1L);

        Usuario participante = new Usuario(
                "Participante", "participante@teste.com",
                "senha", PerfilUsuario.PARTICIPANTE);

        coordenador = new UsuarioAutenticado(usuarioCoordenador);

        estudo = new Estudo(
                "Estudo de teste", "Objetivo de teste",
                pesquisador, hoje.minusDays(10),
                hoje.plusDays(90), 20);
        ReflectionTestUtils.setField(estudo, "id", 10L);
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);

        estudo.atribuirCoordenador(usuarioCoordenador);

        participacao = new Participacao(
                estudo, participante, Instant.now());
        ReflectionTestUtils.setField(participacao, "id", 20L);

        Protocolo protocolo = new Protocolo(estudo, false);

        visitaPrevista = new VisitaPrevista(
                protocolo, "Visita inicial", null, 1);
        ReflectionTestUtils.setField(visitaPrevista, "id", 30L);

        dataVisita = Instant.now().plus(2, ChronoUnit.DAYS);
    }

    // <-------TESTES DE REGISTRO DE SITUACAO------->
    /**
     * Verifica o cancelamento de uma visita futura com motivo.
     *
     * @since 1.0
     */
    @Test
    void cancelaVisitaFuturaComMotivo() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA,
                        "Participante solicitou cancelamento");

        VisitaAgendadaResposta resposta = servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador);

        assertThat(resposta.situacao())
                .isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(resposta.motivo())
                .isEqualTo("Participante solicitou cancelamento");
        assertThat(resposta.registradoPorId()).isEqualTo(1L);
        assertThat(resposta.registradoEm()).isNotNull();

        verify(visitasAgendadas).save(visita);
    }


    /**
     * Impede o cancelamento de uma visita sem motivo.
     *
     * @since 1.0
     */
    @Test
    void impedeCancelamentoSemMotivo() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA, null);

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("VALIDACAO_INVALIDA");
                            assertThat(erro)
                                    .hasMessageContaining("Informe o motivo");
                        });

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica o registro de uma visita realizada
     * após a data agendada.
     *
     * @since 1.0
     */
    @Test
    void registraVisitaRealizadaAposDataAgendada() {
        Instant ontem = Instant.now().minus(1, ChronoUnit.DAYS);

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, ontem);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.REALIZADA, null);

        VisitaAgendadaResposta resposta = servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador);

        assertThat(resposta.situacao())
                .isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(resposta.motivo()).isNull();
        assertThat(resposta.registradoPorId()).isEqualTo(1L);
        assertThat(resposta.registradoEm()).isNotNull();

        verify(visitasAgendadas).save(visita);
    }


    /**
     * Impede registrar uma visita futura como realizada.
     *
     * @since 1.0
     */
    @Test
    void impedeRegistrarVisitaFuturaComoRealizada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.REALIZADA, null);

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("TRANSICAO_VISITA_INVALIDA");
                            assertThat(erro)
                                    .hasMessageContaining(
                                            "ainda não pode ser registrada");
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.AGENDADA);

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica o registro de ausência sem motivo.
     *
     * @since 1.0
     */
    @Test
    void registraAusenciaSemMotivo() {
        Instant ontem = Instant.now().minus(1, ChronoUnit.DAYS);

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, ontem);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.AUSENTE, null);

        VisitaAgendadaResposta resposta = servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador);

        assertThat(resposta.situacao())
                .isEqualTo(SituacaoVisita.AUSENTE);
        assertThat(resposta.motivo()).isNull();
        assertThat(resposta.registradoPorId()).isEqualTo(1L);
        assertThat(resposta.registradoEm()).isNotNull();

        verify(visitasAgendadas).save(visita);
    }


    /**
     * Impede registrar ausência antes do dia agendado.
     *
     * @since 1.0
     */
    @Test
    void impedeRegistrarAusenciaAntesDaDataAgendada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.AUSENTE, null);

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("TRANSICAO_VISITA_INVALIDA");
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.AGENDADA);

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Impede registrar novamente uma visita finalizada.
     *
     * @since 1.0
     */
    @Test
    void impedeRegistrarSituacaoDeVisitaFinalizada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        visita.registrarSituacao(
                SituacaoVisita.CANCELADA,
                "Cancelamento solicitado",
                estudo.getCoordenador(),
                Instant.now());

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.REALIZADA, null);

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("TRANSICAO_VISITA_INVALIDA");
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.CANCELADA);

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Impede o registro de visitas por usuários sem permissão.
     *
     * @param perfil perfil sem permissão de registro
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PESQUISADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoPodeRegistrarSituacao(
            PerfilUsuario perfil) {

        Usuario usuario = new Usuario(
                "Sem permissao", "sem.permissao@teste.com",
                "senha", perfil);

        UsuarioAutenticado autenticado = new UsuarioAutenticado(usuario);

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA,
                        "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, autenticado))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, visitasAgendadas);
    }


    /**
     * Impede registrar visitas de estudos de outro coordenador.
     *
     * @since 1.0
     */
    @Test
    void coordenadorDeOutroEstudoNaoPodeRegistrarSituacao() {
        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA,
                        "Cancelamento solicitado");

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class, erro -> {
                            assertThat(erro.getStatusCode().value())
                                    .isEqualTo(404);
                        });

        verify(estudos).bloquearPorIdECoordenadorId(10L, 1L);
        verifyNoInteractions(visitasAgendadas);
    }


    /**
     * Impede registrar uma visita de outra participação.
     *
     * @since 1.0
     */
    @Test
    void impedeRegistrarVisitaDeOutraParticipacao() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA,
                        "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 99L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class, erro -> {
                            assertThat(erro.getStatusCode().value())
                                    .isEqualTo(404);
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.AGENDADA);

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class,
            names = {"PLANEJAMENTO", "ENCERRADO"})
    void impedeRegistroEmEstadoInvalido(EstadoEstudo estado) {
        ReflectionTestUtils.setField(estudo, "estado", estado);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA, "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro ->
                                assertThat(erro.getCodigo())
                                        .isEqualTo("ESTADO_ESTUDO_INVALIDO"));

        verifyNoInteractions(visitasAgendadas);
    }

    @Test
    void impedeRegistrarRealizadaComMotivo() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista,
                Instant.now().minus(1, ChronoUnit.DAYS));
        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.REALIZADA, "Motivo indevido");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro ->
                                assertThat(erro.getCodigo())
                                        .isEqualTo("VALIDACAO_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.AGENDADA);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    @Test
    void impedeRegistrarAgendadaComoSituacaoFinal() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);
        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.AGENDADA, null);

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro ->
                                assertThat(erro.getCodigo())
                                        .isEqualTo("TRANSICAO_VISITA_INVALIDA"));

        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    @Test
    void permiteRegistrarRealizadaNoDiaDaVisita() {
        ZoneId zona = ZoneId.of("America/Recife");
        Instant hoje = LocalDate.now(zona)
                .atTime(12, 0).atZone(zona).toInstant();

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, hoje);
        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.REALIZADA, null);

        VisitaAgendadaResposta resposta = servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador);

        assertThat(resposta.situacao()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(resposta.motivo()).isNull();
        verify(visitasAgendadas).save(visita);
    }


    @Test
    void impedeRegistroDeVisitaDeParticipanteRetirado() {
        participacao.registrarRetirada(
                "Retirada do estudo",
                Instant.now(),
                new Usuario("Responsavel", "responsavel@teste.com",
                        "senha", PerfilUsuario.COORDENADOR));

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);
        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA, "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("PARTICIPACAO_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.AGENDADA);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    @Test
    void impedeRegistroDeVisitaDeOutroEstudo() {
        VisitaAgendada visita = mock(VisitaAgendada.class);
        Participacao participacaoVisita = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
        when(visita.getParticipacao())
                .thenReturn(participacaoVisita);
        when(participacaoVisita.getId()).thenReturn(20L);
        when(participacaoVisita.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA, "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }


    /**
     * Impede registrar uma visita prevista de outro estudo.
     */
    @Test
    void impedeRegistroComVisitaPrevistaDeOutroEstudo() {
        VisitaAgendada visita = mock(VisitaAgendada.class);
        VisitaPrevista previstaOutroEstudo = mock(VisitaPrevista.class);
        Protocolo protocoloOutroEstudo = mock(Protocolo.class);
        Estudo outroEstudo = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
        when(visita.getParticipacao()).thenReturn(participacao);
        when(visita.getVisitaPrevista()).thenReturn(previstaOutroEstudo);
        when(previstaOutroEstudo.getProtocolo()).thenReturn(protocoloOutroEstudo);
        when(protocoloOutroEstudo.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        VisitaAgendadaSituacaoEntrada entrada =
                new VisitaAgendadaSituacaoEntrada(
                        SituacaoVisita.CANCELADA, "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.registrarSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }


    // <-------TESTES DE CORRECAO DE SITUACAO------->

    /**
     * Verifica a correção de ausência para realização,
     * preservando os dados anteriores no histórico.
     *
     * @since 1.0
     */
    @Test
    void corrigeAusenciaParaRealizada() {
        Instant ontem = Instant.now().minus(1, ChronoUnit.DAYS);

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, ontem);

        ReflectionTestUtils.setField(visita, "id", 40L);

        visita.registrarSituacao(
                SituacaoVisita.AUSENTE,
                "Participante não compareceu",
                estudo.getCoordenador(),
                ontem);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(correcoes.save(any(CorrecaoVisita.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA,
                "A visita ocorreu, mas foi registrada incorretamente",
                null);

        CorrecaoVisitaResposta resposta = servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador);

        assertThat(resposta.situacaoAnterior())
                .isEqualTo(SituacaoVisita.AUSENTE);
        assertThat(resposta.situacaoNova())
                .isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(resposta.corrigidaPorId()).isEqualTo(1L);
        assertThat(resposta.corrigidaEm()).isNotNull();

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(visita.getMotivo()).isNull();

        ArgumentCaptor<CorrecaoVisita> capturador =
                ArgumentCaptor.forClass(CorrecaoVisita.class);

        verify(correcoes).save(capturador.capture());

        CorrecaoVisita historico = capturador.getValue();

        assertThat(historico.getSituacaoAnterior())
                .isEqualTo(SituacaoVisita.AUSENTE);
        assertThat(historico.getMotivoAnterior())
                .isEqualTo("Participante não compareceu");
        assertThat(historico.getMotivoNovo()).isNull();
        assertThat(historico.getJustificativa())
                .isEqualTo(entrada.justificativa());

        verify(resultados).existsByVisitaAgendada_Id(40L);
        verify(visitasAgendadas).save(visita);
    }


    /**
     * Impede corrigir uma visita que possui resultados registrados.
     *
     * @since 1.0
     */
    @Test
    void impedeCorrecaoDeVisitaComResultados() {
        Instant ontem = Instant.now().minus(1, ChronoUnit.DAYS);

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, ontem);

        ReflectionTestUtils.setField(visita, "id", 40L);

        visita.registrarSituacao(
                SituacaoVisita.AUSENTE,
                "Participante não compareceu",
                estudo.getCoordenador(),
                ontem);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(resultados.existsByVisitaAgendada_Id(40L))
                .thenReturn(true);

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA,
                "Registro anterior incorreto",
                null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("CORRECAO_BLOQUEADA");
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.AUSENTE);

        assertThat(visita.getMotivo())
                .isEqualTo("Participante não compareceu");

        verify(resultados).existsByVisitaAgendada_Id(40L);

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));

        verify(correcoes, never())
                .save(any(CorrecaoVisita.class));
    }


    /**
     * Impede que uma correção retorne a visita para AGENDADA.
     *
     * @since 1.0
     */
    @Test
    void impedeCorrecaoParaAgendada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        visita.registrarSituacao(
                SituacaoVisita.CANCELADA,
                "Cancelamento solicitado",
                estudo.getCoordenador(),
                Instant.now());

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.AGENDADA,
                "Tentativa de reabrir o agendamento",
                null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("TRANSICAO_VISITA_INVALIDA");
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.CANCELADA);

        assertThat(visita.getMotivo())
                .isEqualTo("Cancelamento solicitado");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));

        verify(correcoes, never())
                .save(any(CorrecaoVisita.class));
    }


    /**
     * Impede corrigir uma visita para a mesma situação.
     *
     * @since 1.0
     */
    @Test
    void impedeCorrecaoParaMesmaSituacao() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        visita.registrarSituacao(
                SituacaoVisita.CANCELADA,
                "Cancelamento solicitado",
                estudo.getCoordenador(),
                Instant.now());

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.CANCELADA,
                "Tentativa de corrigir sem alterar a situação",
                "Novo motivo de cancelamento");

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(
                        RegraNegocioException.class, erro -> {
                            assertThat(erro.getCodigo())
                                    .isEqualTo("TRANSICAO_VISITA_INVALIDA");
                        });

        assertThat(visita.getSituacao())
                .isEqualTo(SituacaoVisita.CANCELADA);

        assertThat(visita.getMotivo())
                .isEqualTo("Cancelamento solicitado");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));

        verify(correcoes, never())
                .save(any(CorrecaoVisita.class));
    }


    /**
     * Prepara uma visita com situação final e os vínculos necessários.
     *
     * @param situacao situação anterior à correção
     * @param dataHora data agendada
     * @param motivo motivo registrado anteriormente
     * @return visita pronta para os testes de correção
     */
    private VisitaAgendada prepararVisitaFinalizada(
            SituacaoVisita situacao, Instant dataHora, String motivo) {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataHora);
        ReflectionTestUtils.setField(visita, "id", 40L);
        visita.registrarSituacao(
                situacao, motivo, estudo.getCoordenador(), Instant.now());

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        return visita;
    }

    /**
     * Impede correções quando o estudo está encerrado.
     */
    @Test
    void impedeCorrecaoEmEstudoEncerrado() {
        ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.ENCERRADO);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("ESTADO_ESTUDO_INVALIDO"));

        verifyNoInteractions(visitasAgendadas, correcoes, resultados);
    }

    /**
     * Impede correções para participantes retirados do estudo.
     */
    @Test
    void impedeCorrecaoDeParticipanteRetirado() {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.CANCELADA, dataVisita, "Cancelamento anterior");
        participacao.registrarRetirada(
                "Retirada solicitada", Instant.now(), estudo.getCoordenador());

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("PARTICIPACAO_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(visita.getMotivo()).isEqualTo("Cancelamento anterior");
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Exige uma justificativa preenchida para corrigir a visita.
     *
     * @param justificativa texto inválido
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void impedeCorrecaoSemJustificativa(String justificativa) {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.CANCELADA, dataVisita, "Cancelamento anterior");

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.AUSENTE, justificativa, null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("VALIDACAO_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(visita.getMotivo()).isEqualTo("Cancelamento anterior");
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Exige motivo ao corrigir uma visita para CANCELADA.
     */
    @Test
    void impedeCorrecaoParaCanceladaSemMotivo() {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.REALIZADA,
                Instant.now().minus(1, ChronoUnit.DAYS), null);

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.CANCELADA, "A visita foi cancelada", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("VALIDACAO_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(visita.getMotivo()).isNull();
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Rejeita motivo na correção para REALIZADA.
     */
    @Test
    void impedeCorrecaoParaRealizadaComMotivo() {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.CANCELADA,
                Instant.now().minus(1, ChronoUnit.DAYS), "Cancelamento anterior");

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto",
                "Motivo indevido");

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("VALIDACAO_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(visita.getMotivo()).isEqualTo("Cancelamento anterior");
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Uma visita ainda AGENDADA deve ser registrada antes de ser corrigida.
     */
    @Test
    void impedeCorrecaoDeVisitaAindaAgendada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);
        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.CANCELADA,
                "Correção antes do registro", "Cancelamento solicitado");

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("TRANSICAO_VISITA_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.AGENDADA);
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Não permite converter visita futura em REALIZADA ou AUSENTE.
     *
     * @param novaSituacao situação final solicitada
     */
    @ParameterizedTest
    @EnumSource(value = SituacaoVisita.class,
            names = {"REALIZADA", "AUSENTE"})
    void impedeCorrecaoDeVisitaFuturaParaRealizadaOuAusente(
            SituacaoVisita novaSituacao) {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.CANCELADA, dataVisita, "Cancelamento anterior");

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                novaSituacao, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("TRANSICAO_VISITA_INVALIDA"));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(visita.getMotivo()).isEqualTo("Cancelamento anterior");
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Coordenadores não podem corrigir visitas de estudos não vinculados.
     */
    @Test
    void coordenadorDeOutroEstudoNaoPodeCorrigirSituacao() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.empty());

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        verifyNoInteractions(visitasAgendadas, correcoes, resultados);
    }

    /**
     * Impede que a URL de outra participação acesse uma visita.
     */
    @Test
    void impedeCorrecaoDeVisitaDeOutraParticipacao() {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.CANCELADA, dataVisita, "Cancelamento anterior");
        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.AUSENTE, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 99L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.CANCELADA);
        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Impede corrigir uma visita cuja participação pertence a outro estudo.
     */
    @Test
    void impedeCorrecaoDeVisitaDeOutroEstudo() {
        VisitaAgendada visita = mock(VisitaAgendada.class);
        Participacao participacaoVisita = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
        when(visita.getParticipacao()).thenReturn(participacaoVisita);
        when(participacaoVisita.getId()).thenReturn(20L);
        when(participacaoVisita.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Impede corrigir uma visita prevista ligada ao protocolo de outro estudo.
     */
    @Test
    void impedeCorrecaoComVisitaPrevistaDeOutroEstudo() {
        VisitaAgendada visita = mock(VisitaAgendada.class);
        VisitaPrevista previstaOutroEstudo = mock(VisitaPrevista.class);
        Protocolo protocoloOutroEstudo = mock(Protocolo.class);
        Estudo outroEstudo = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
        when(visita.getParticipacao()).thenReturn(participacao);
        when(visita.getVisitaPrevista()).thenReturn(previstaOutroEstudo);
        when(previstaOutroEstudo.getProtocolo()).thenReturn(protocoloOutroEstudo);
        when(protocoloOutroEstudo.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        verifyNoInteractions(correcoes, resultados);
        verify(visitasAgendadas, never()).save(any(VisitaAgendada.class));
    }

    /**
     * Impede correções por perfis que não são COORDENADOR.
     *
     * @param perfil perfil sem autorização
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoPodeCorrigirSituacao(PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Sem permissao", "sem.permissao@teste.com", "senha", perfil);
        UsuarioAutenticado autenticado = new UsuarioAutenticado(usuario);
        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA, "Registro anterior incorreto", null);

        assertThatThrownBy(() -> servico.corrigirSituacao(
                10L, 20L, 40L, entrada, autenticado))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, visitasAgendadas, correcoes, resultados);
    }

    /**
     * Confirma que CANCELADA para REALIZADA limpa o motivo da visita,
     * mas conserva o motivo anterior no histórico da correção.
     */
    @Test
    void corrigeCanceladaParaRealizadaPreservandoMotivoAnterior() {
        VisitaAgendada visita = prepararVisitaFinalizada(
                SituacaoVisita.CANCELADA,
                Instant.now().minus(1, ChronoUnit.DAYS), "Cancelamento anterior");
        when(correcoes.save(any(CorrecaoVisita.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        CorrecaoVisitaEntrada entrada = new CorrecaoVisitaEntrada(
                SituacaoVisita.REALIZADA,
                "A visita foi realizada, mas estava como cancelada", null);

        CorrecaoVisitaResposta resposta = servico.corrigirSituacao(
                10L, 20L, 40L, entrada, coordenador);

        assertThat(resposta.situacaoAnterior()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(resposta.situacaoNova()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(resposta.corrigidaPorId()).isEqualTo(1L);
        assertThat(resposta.corrigidaEm()).isNotNull();
        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(visita.getMotivo()).isNull();

        ArgumentCaptor<CorrecaoVisita> capturador =
                ArgumentCaptor.forClass(CorrecaoVisita.class);
        verify(correcoes).save(capturador.capture());
        CorrecaoVisita historico = capturador.getValue();
        assertThat(historico.getSituacaoAnterior()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(historico.getSituacaoNova()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(historico.getMotivoAnterior()).isEqualTo("Cancelamento anterior");
        assertThat(historico.getMotivoNovo()).isNull();
        assertThat(historico.getJustificativa()).isEqualTo(entrada.justificativa());

        verify(resultados).existsByVisitaAgendada_Id(40L);
        verify(visitasAgendadas).save(visita);
    }

    /**
     * Prepara os dados usados nos testes de consulta.
     *
     * @since 1.0
     */
    private void prepararConsulta() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findById(20L))
                .thenReturn(Optional.of(participacao));

        when(visitasPrevistas.findById(30L))
                .thenReturn(Optional.of(visitaPrevista));
    }

    /**
     * Verifica o agendamento de uma visita para participante ativo.
     *
     * @since 1.0
     */
    @Test
    void agendaVisitaParaParticipanteAtivo() {
        prepararConsulta();

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaResposta resposta = servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador);

        assertThat(resposta.participacaoId()).isEqualTo(20L);
        assertThat(resposta.visitaPrevistaId()).isEqualTo(30L);
        assertThat(resposta.situacao()).isEqualTo(SituacaoVisita.AGENDADA);
        assertThat(resposta.dataHora()).isEqualTo(dataVisita);

        verify(visitasAgendadas).save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se um agendamento duplicado é impedido.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoDuplicado() {
        prepararConsulta();

        when(visitasAgendadas
                .existsByParticipacaoIdAndVisitaPrevistaIdAndSituacao(
                        20L, 30L, SituacaoVisita.AGENDADA))
                .thenReturn(true);

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("Já existe um agendamento");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se participantes retirados não podem receber agendamentos.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoDeParticipanteRetirado() {
        participacao.registrarRetirada(
                "Retirada do estudo", Instant.now(),
                new Usuario("Responsavel", "responsavel@teste.com",
                        "senha", PerfilUsuario.COORDENADOR));

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findById(20L))
                .thenReturn(Optional.of(participacao));

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("participante retirado");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se uma visita finalizada não pode ser reagendada.
     *
     * @since 1.0
     */
    @Test
    void impedeReagendarVisitaFinalizada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        Usuario responsavel = new Usuario(
                "Coordenador", "registro@teste.com",
                "senha", PerfilUsuario.COORDENADOR);

        visita.registrarSituacao(
                SituacaoVisita.REALIZADA, null, responsavel, Instant.now());

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        assertThatThrownBy(() -> servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(
                        dataVisita.plus(1, ChronoUnit.DAYS)),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("Apenas visitas agendadas");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se datas anteriores ao dia atual são rejeitadas.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoComDataPassada() {
        prepararConsulta();

        Instant dataPassada = Instant.now().minus(2, ChronoUnit.DAYS);

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataPassada),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("fora do período permitido");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se a visita prevista deve pertencer ao estudo.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoDeVisitaDeOutroEstudo() {
        Estudo outroEstudo = mock(Estudo.class);
        Protocolo outroProtocolo = mock(Protocolo.class);
        VisitaPrevista outraVisita = mock(VisitaPrevista.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(participacoes.findById(20L))
                .thenReturn(Optional.of(participacao));
        when(visitasPrevistas.findById(30L))
                .thenReturn(Optional.of(outraVisita));

        when(outraVisita.getProtocolo())
                .thenReturn(outroProtocolo);
        when(outroProtocolo.getEstudo())
                .thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Visita prevista não encontrada");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se pesquisadores não podem agendar visitas.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoPorPesquisador() {
        Usuario usuario = new Usuario(
                "Pesquisador", "outro@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);

        UsuarioAutenticado pesquisador = new UsuarioAutenticado(usuario);

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                pesquisador))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(visitasAgendadas);
    }


    /**
     * Verifica o reagendamento de uma visita pendente.
     *
     * @since 1.0
     */
    @Test
    void reagendaVisitaComSucesso() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        Instant novaData = dataVisita.plus(1, ChronoUnit.DAYS);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaResposta resposta = servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(novaData),
                coordenador);

        assertThat(resposta.dataHora()).isEqualTo(novaData);
        assertThat(resposta.situacao()).isEqualTo(SituacaoVisita.AGENDADA);

        verify(visitasAgendadas).save(visita);
    }


    /**
     * Verifica se o coordenador só pode agendar visitas em seus estudos.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoEmEstudoNaoVinculadoAoCoordenador() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se a participação deve pertencer ao estudo informado.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoDeParticipacaoDeOutroEstudo() {
        Participacao outraParticipacao = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findById(20L))
                .thenReturn(Optional.of(outraParticipacao));

        when(outraParticipacao.getEstudo())
                .thenReturn(outroEstudo);

        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se o estado do estudo permite agendamento.
     *
     * @param estado estado do estudo utilizado no teste
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class,
            names = {"PLANEJAMENTO", "ENCERRADO"})
    void impedeAgendamentoEmEstadoInvalido(EstadoEstudo estado) {
        Estudo estudoInvalido = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudoInvalido));

        when(estudoInvalido.getEstado()).thenReturn(estado);

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("não permite agendamento");

        verifyNoInteractions(visitasAgendadas);
    }

    /**
     * Verifica se o estado do estudo permite reagendamento.
     *
     * @param estado estado do estudo utilizado no teste
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class,
            names = {"PLANEJAMENTO", "ENCERRADO"})
    void impedeReagendamentoEmEstadoInvalido(EstadoEstudo estado) {
        Estudo estudoInvalido = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudoInvalido));

        when(estudoInvalido.getEstado()).thenReturn(estado);

        assertThatThrownBy(() -> servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(dataVisita),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("não permite reagendamento");

        verifyNoInteractions(visitasAgendadas);
    }


    /**
     * Verifica se é possível agendar uma visita para o dia atual.
     *
     * @since 1.0
     */
    @Test
    void permiteAgendamentoNoDiaAtual() {
        prepararConsulta();

        LocalDate hoje = LocalDate.now(ZoneId.of("America/Recife"));

        Instant dataHoje = hoje.atTime(23, 0)
                .atZone(ZoneId.of("America/Recife"))
                .toInstant();

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaResposta resposta = servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataHoje),
                coordenador);

        assertThat(resposta.dataHora()).isEqualTo(dataHoje);

        verify(visitasAgendadas).save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se uma visita não pode ser agendada para o dia anterior.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoNoDiaAnterior() {
        prepararConsulta();

        LocalDate ontem = LocalDate.now(ZoneId.of("America/Recife"))
                .minusDays(1);

        Instant dataOntem = ontem.atTime(12, 0)
                .atZone(ZoneId.of("America/Recife"))
                .toInstant();

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataOntem),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("fora do período permitido");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se a data não pode anteceder o início do estudo.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoAntesDoInicioDoEstudo() {
        prepararConsulta();

        LocalDate hoje = LocalDate.now(ZoneId.of("America/Recife"));

        ReflectionTestUtils.setField(
                estudo, "dataInicio", hoje.plusDays(3));

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("fora do período permitido");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se a data não pode ultrapassar o fim do estudo.
     *
     * @since 1.0
     */
    @Test
    void impedeAgendamentoDepoisDoFimDoEstudo() {
        prepararConsulta();

        LocalDate hoje = LocalDate.now(ZoneId.of("America/Recife"));

        ReflectionTestUtils.setField(
                estudo, "dataFim", hoje.plusDays(1));

        assertThatThrownBy(() -> servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataVisita),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("fora do período permitido");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se uma data inválida impede o reagendamento.
     *
     * @since 1.0
     */
    @Test
    void impedeReagendamentoComDataInvalida() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        Instant dataInvalida = dataVisita.plus(100, ChronoUnit.DAYS);

        assertThatThrownBy(() -> servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(dataInvalida),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("fora do período permitido");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se participantes retirados não podem ter visitas reagendadas.
     *
     * @since 1.0
     */
    @Test
    void impedeReagendamentoDeParticipanteRetirado() {
        Usuario responsavel = new Usuario(
                "Responsavel", "responsavel2@teste.com",
                "senha", PerfilUsuario.COORDENADOR);

        participacao.registrarRetirada(
                "Retirada do estudo", Instant.now(), responsavel);

        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        ReflectionTestUtils.setField(visita, "id", 40L);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        assertThatThrownBy(() -> servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(
                        dataVisita.plus(1, ChronoUnit.DAYS)),
                coordenador))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("participante retirado");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se a visita reagendada pertence à participação informada.
     *
     * @since 1.0
     */
    @Test
    void impedeReagendamentoDeVisitaDeOutraParticipacao() {
        VisitaAgendada visita = mock(VisitaAgendada.class);
        Participacao outraParticipacao = mock(Participacao.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(visita.getParticipacao())
                .thenReturn(outraParticipacao);

        when(outraParticipacao.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(dataVisita),
                coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }

    /**
     * Verifica se a visita reagendada pertence ao estudo informado.
     *
     * @since 1.0
     */
    @Test
    void impedeReagendamentoDeVisitaDeOutroEstudo() {
        VisitaAgendada visita = mock(VisitaAgendada.class);
        Participacao participacaoVisita = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);

        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));

        when(visita.getParticipacao())
                .thenReturn(participacaoVisita);

        when(participacaoVisita.getId()).thenReturn(20L);
        when(participacaoVisita.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.reagendar(
                10L, 20L, 40L,
                new VisitaAgendadaReagendamentoEntrada(dataVisita),
                coordenador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se dois participantes podem agendar a mesma visita prevista.
     *
     * @since 1.0
     */
    @Test
    void permiteMesmaVisitaPrevistaParaDoisParticipantes() {
        prepararConsulta();

        Usuario outroUsuario = new Usuario(
                "Outro Participante", "outro.participante@teste.com",
                "senha", PerfilUsuario.PARTICIPANTE);

        Participacao outraParticipacao = new Participacao(
                estudo, outroUsuario, Instant.now());

        ReflectionTestUtils.setField(outraParticipacao, "id", 21L);

        when(participacoes.findById(21L))
                .thenReturn(Optional.of(outraParticipacao));

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaCadastroEntrada entrada =
                new VisitaAgendadaCadastroEntrada(30L, dataVisita);

        VisitaAgendadaResposta primeira =
                servico.agendar(10L, 20L, entrada, coordenador);

        VisitaAgendadaResposta segunda =
                servico.agendar(10L, 21L, entrada, coordenador);

        assertThat(primeira.participacaoId()).isEqualTo(20L);
        assertThat(segunda.participacaoId()).isEqualTo(21L);

        assertThat(primeira.visitaPrevistaId()).isEqualTo(30L);
        assertThat(segunda.visitaPrevistaId()).isEqualTo(30L);

        verify(visitasAgendadas, times(2))
                .save(any(VisitaAgendada.class));
    }


    /**
     * Verifica se o agendamento é permitido às 23h do último dia do estudo.
     *
     * @since 1.0
     */
    @Test
    void permiteAgendamentoAs23hNoUltimoDiaDoEstudo() {
        prepararConsulta();

        ZoneId zona = ZoneId.of("America/Recife");
        LocalDate ultimoDia = LocalDate.now(zona).plusDays(3);

        ReflectionTestUtils.setField(
                estudo, "dataFim", ultimoDia);

        Instant dataUltimoDia = ultimoDia.atTime(23, 0)
                .atZone(zona)
                .toInstant();

        when(visitasAgendadas.save(any(VisitaAgendada.class)))
                .thenAnswer(chamada -> chamada.getArgument(0));

        VisitaAgendadaResposta resposta = servico.agendar(
                10L, 20L,
                new VisitaAgendadaCadastroEntrada(30L, dataUltimoDia),
                coordenador);

        assertThat(resposta.dataHora()).isEqualTo(dataUltimoDia);

        verify(visitasAgendadas)
                .save(any(VisitaAgendada.class));
    }

    // <-------CONSULTA DE PARTICIPACOES------->

    /**
     * Verifica se a listagem utiliza a consulta sem bloqueio pessimista.
     *
     * @since 1.0
     */
    @Test
    void listaParticipacoesSemBloqueioPessimista() {
        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findByEstudoIdOrderByIdAsc(10L))
                .thenReturn(List.of(participacao));

        var resposta = servico.listarParticipacoes(10L, coordenador);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).id()).isEqualTo(20L);
        assertThat(resposta.get(0).situacao()).isEqualTo(SituacaoParticipacao.ATIVA);

        verify(estudos).findByIdAndCoordenadorId(10L, 1L);
        verify(estudos, never()).bloquearPorIdECoordenadorId(10L, 1L);
    }

    /**
     * Verifica se participações retiradas continuam listadas
     * com a data de retirada.
     *
     * @since 1.0
     */
    @Test
    void listaParticipacaoRetiradaComDataRetirada() {
        Instant retiradaEm = Instant.now();
        Usuario responsavel = new Usuario(
                "Coordenador", "retirada@teste.com",
                "senha", PerfilUsuario.COORDENADOR);

        participacao.registrarRetirada(
                "Retirada do estudo", retiradaEm, responsavel);

        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findByEstudoIdOrderByIdAsc(10L))
                .thenReturn(List.of(participacao));

        var resposta = servico.listarParticipacoes(10L, coordenador);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).id()).isEqualTo(20L);
        assertThat(resposta.get(0).situacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
        assertThat(resposta.get(0).dataRetirada()).isEqualTo(retiradaEm);

        verify(participacoes).findByEstudoIdOrderByIdAsc(10L);
    }


    /**
     * Verifica se o pesquisador responsável pode listar
     * as participações do seu estudo.
     *
     * @since 1.0
     */
    @Test
    void pesquisadorResponsavelPodeListarParticipacoes() {
        Usuario usuario = new Usuario(
                "Pesquisador", "pesquisador@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);
        ReflectionTestUtils.setField(usuario, "id", 2L);

        UsuarioAutenticado pesquisador = new UsuarioAutenticado(usuario);

        when(estudos.findByIdAndResponsavelId(10L, 2L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findByEstudoIdOrderByIdAsc(10L))
                .thenReturn(List.of(participacao));

        var resposta = servico.listarParticipacoes(10L, pesquisador);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).id()).isEqualTo(20L);

        verify(estudos).findByIdAndResponsavelId(10L, 2L);
        verify(estudos, never()).bloquearPorIdEResponsavelId(10L, 2L);
    }

    /**
     * Verifica se o pesquisador não pode consultar
     * participações de outro estudo.
     *
     * @since 1.0
     */
    @Test
    void pesquisadorDeOutroEstudoRecebe404() {
        Usuario usuario = new Usuario(
                "Pesquisador", "outro.pesquisador@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);
        ReflectionTestUtils.setField(usuario, "id", 99L);

        UsuarioAutenticado pesquisador = new UsuarioAutenticado(usuario);

        when(estudos.findByIdAndResponsavelId(10L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                servico.listarParticipacoes(10L, pesquisador))
                .isInstanceOfSatisfying(
                        ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verifyNoInteractions(participacoes);
    }

    /**
     * Verifica se administradores e participantes não podem
     * consultar a listagem.
     *
     * @param perfil perfil sem permissão de consulta
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoPodeListarParticipacoes(
            PerfilUsuario perfil) {

        Usuario usuario = new Usuario(
                "Sem permissao", "sem.permissao@teste.com",
                "senha", perfil);

        UsuarioAutenticado autenticado = new UsuarioAutenticado(usuario);

        assertThatThrownBy(() ->
                servico.listarParticipacoes(10L, autenticado))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, participacoes);
    }

}
