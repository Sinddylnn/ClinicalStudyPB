package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

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
import br.edu.uepb.clinicalstudypb.estudos.api.RetiradaEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.RetiradaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;

// <-------------------REGRAS DA RETIRADA------------------->
/**
 * Testa as regras do registro de retirada de participantes.
 *
 * @author Georis
 * @version 1.0
 * @since 16/11/2026
 */
@ExtendWith(MockitoExtension.class)
class RetiradaParticipanteServiceTest {

    @Mock private EstudoRepository estudos;
    @Mock private ParticipacaoRepository participacoes;
    @Mock private VisitaAgendadaRepository visitasAgendadas;

    @InjectMocks private RetiradaParticipanteService servico;

    private Estudo estudo;
    private Participacao participacao;
    private VisitaPrevista visitaPrevista;
    private Usuario usuarioCoordenador;
    private UsuarioAutenticado coordenador;

    // <-------------------PREPARAÇÃO DOS CENÁRIOS------------------->
    @BeforeEach
    void prepararDados() {
        LocalDate hoje = LocalDate.now();

        Usuario pesquisador = new Usuario("Pesquisador", "pesq@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);
        usuarioCoordenador = new Usuario("Coordenador", "coord@teste.com",
                "senha", PerfilUsuario.COORDENADOR);
        ReflectionTestUtils.setField(usuarioCoordenador, "id", 1L);
        Usuario participante = new Usuario("Participante", "part@teste.com",
                "senha", PerfilUsuario.PARTICIPANTE);

        coordenador = new UsuarioAutenticado(usuarioCoordenador);

        estudo = new Estudo("Estudo", "Objetivo", pesquisador,
                hoje.minusDays(10), hoje.plusDays(90), 20);
        ReflectionTestUtils.setField(estudo, "id", 10L);
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        estudo.atribuirCoordenador(usuarioCoordenador);

        participacao = new Participacao(estudo, participante, Instant.now());
        ReflectionTestUtils.setField(participacao, "id", 20L);

        visitaPrevista = new VisitaPrevista(
                new Protocolo(estudo, false), "Visita inicial", null, 1);
        ReflectionTestUtils.setField(visitaPrevista, "id", 30L);
    }

    // <-------------------CASOS DE SUCESSO------------------->

    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class, names = {"RECRUTAMENTO", "EXECUCAO"})
    void registraRetiradaEmRecrutamentoOuExecucao(EstadoEstudo estado) {
        ReflectionTestUtils.setField(estudo, "estado", estado);
        prepararVinculos();
        when(visitasAgendadas.findByParticipacao_IdAndSituacao(
                20L, SituacaoVisita.AGENDADA)).thenReturn(List.of());
        when(participacoes.save(participacao)).thenReturn(participacao);

        RetiradaResposta resposta = servico.registrar(
                10L, 20L, new RetiradaEntrada("Participante desistiu"), coordenador);

        assertThat(resposta.participacaoId()).isEqualTo(20L);
        assertThat(resposta.situacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
        assertThat(resposta.motivoRetirada()).isEqualTo("Participante desistiu");
        assertThat(resposta.retiradaPorId()).isEqualTo(1L);
        assertThat(resposta.dataRetirada()).isNotNull();
        assertThat(participacao.getSituacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
    }

    @Test
    void cancelaVisitasPendentesEPreservaVisitaFinalizada() {
        prepararVinculos();
        Instant agora = Instant.now();
        VisitaAgendada finalizada = visita(39L, agora.minus(2, ChronoUnit.DAYS));
        finalizada.registrarSituacao(
                SituacaoVisita.REALIZADA, null, usuarioCoordenador, agora);
        VisitaAgendada pendente = visita(40L, agora.plus(2, ChronoUnit.DAYS));
        when(visitasAgendadas.findByParticipacao_IdAndSituacao(
                20L, SituacaoVisita.AGENDADA)).thenReturn(List.of(pendente));
        when(participacoes.save(participacao)).thenReturn(participacao);

        servico.registrar(10L, 20L, new RetiradaEntrada("Motivo"), coordenador);

        assertThat(pendente.getSituacao()).isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(pendente.getMotivo())
                .isEqualTo("Retirada do participante");
        assertThat(pendente.getRegistradoPor()).isSameAs(usuarioCoordenador);
        assertThat(pendente.getRegistradoEm()).isNotNull();
        assertThat(finalizada.getSituacao()).isEqualTo(SituacaoVisita.REALIZADA);
        verify(visitasAgendadas).saveAll(List.of(pendente));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 500})
    void aceitaMotivoNosLimitesPermitidos(int tamanho) {
        prepararVinculos();
        when(visitasAgendadas.findByParticipacao_IdAndSituacao(
                20L, SituacaoVisita.AGENDADA)).thenReturn(List.of());
        when(participacoes.save(participacao)).thenReturn(participacao);

        RetiradaResposta resposta = servico.registrar(
                10L, 20L, new RetiradaEntrada("x".repeat(tamanho)), coordenador);

        assertThat(resposta.motivoRetirada()).hasSize(tamanho);
    }

    // <-------------------REJEIÇÕES------------------->

    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class, names = {"PLANEJAMENTO", "ENCERRADO"})
    void impedeRetiradaEmEstadoInvalido(EstadoEstudo estado) {
        ReflectionTestUtils.setField(estudo, "estado", estado);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Motivo"), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("ESTADO_ESTUDO_INVALIDO"));

        verifyNoInteractions(participacoes, visitasAgendadas);
    }

    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PESQUISADOR", "PARTICIPANTE"})
    void perfilSemPermissaoNaoPodeRegistrarRetirada(PerfilUsuario perfil) {
        UsuarioAutenticado autenticado = new UsuarioAutenticado(
                new Usuario("Sem permissao", "x@teste.com", "senha", perfil));

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Motivo"), autenticado))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, participacoes, visitasAgendadas);
    }

    @Test
    void autenticacaoAusenteNaoPodeRegistrarRetirada() {
        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Motivo"), null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, participacoes, visitasAgendadas);
    }

    @Test
    void coordenadorNaoVinculadoRecebe404() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Motivo"), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verifyNoInteractions(participacoes, visitasAgendadas);
    }

    @Test
    void participacaoDeOutroEstudoRecebe404() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        Estudo outro = new Estudo("Outro", "Objetivo", estudo.getResponsavel(),
                LocalDate.now(), LocalDate.now().plusDays(5), 5);
        ReflectionTestUtils.setField(outro, "id", 99L);
        Participacao alheia = new Participacao(outro,
                new Usuario("P", "p@teste.com", "senha", PerfilUsuario.PARTICIPANTE),
                Instant.now());
        when(participacoes.findById(20L)).thenReturn(Optional.of(alheia));

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Motivo"), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verifyNoInteractions(visitasAgendadas);
    }

    @Test
    void participacaoInexistenteRecebe404() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(participacoes.findById(20L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Motivo"), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value())
                                .isEqualTo(404));

        verifyNoInteractions(visitasAgendadas);
    }

    @Test
    void retiradaEhIrreversivelEImpedeSegundoRegistro() {
        prepararVinculos();
        participacao.registrarRetirada(
                "Primeira", Instant.now(), usuarioCoordenador);

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("Segunda"), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("PARTICIPACAO_JA_RETIRADA"));

        assertThat(participacao.getMotivoRetirada()).isEqualTo("Primeira");
        verifyNoInteractions(visitasAgendadas);
        verify(participacoes, never()).save(any());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void rejeitaMotivoVazioSemAlterarParticipacao(String motivo) {
        prepararVinculos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada(motivo), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("MOTIVO_RETIRADA_INVALIDO"));

        assertThat(participacao.getSituacao()).isEqualTo(SituacaoParticipacao.ATIVA);
        verifyNoInteractions(visitasAgendadas);
        verify(participacoes, never()).save(any());
    }

    @Test
    void rejeitaMotivoAcimaDoLimite() {
        prepararVinculos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, new RetiradaEntrada("x".repeat(501)), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("MOTIVO_RETIRADA_INVALIDO"));

        assertThat(participacao.getSituacao()).isEqualTo(SituacaoParticipacao.ATIVA);
        verifyNoInteractions(visitasAgendadas);
    }

    // <-------------------APOIO AOS CENÁRIOS------------------->

    private void prepararVinculos() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(participacoes.findById(20L)).thenReturn(Optional.of(participacao));
    }

    private VisitaAgendada visita(Long id, Instant dataHora) {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataHora);
        ReflectionTestUtils.setField(visita, "id", id);
        return visita;
    }
}
