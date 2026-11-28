package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoReagendamento;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.api.PedidoReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.SolicitacaoReagendamentoParticipanteResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.SolicitacaoReagendamentoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

// <-------------------AÇÕES DO PARTICIPANTE NAS VISITAS------------------->
/**
 * Testa confirmação de presença e pedidos de reagendamento.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
@ExtendWith(MockitoExtension.class)
class VisitaParticipanteServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Recife");

    @Mock private EstudoRepository estudos;
    @Mock private VisitaAgendadaRepository visitasAgendadas;
    @Mock private SolicitacaoReagendamentoRepository solicitacoesReagendamento;

    @InjectMocks private VisitaParticipanteService servico;

    private Estudo estudo;
    private Participacao participacao;
    private VisitaAgendada visita;
    private UsuarioAutenticado participante;

    @BeforeEach
    void preparar() {
        LocalDate hoje = LocalDate.now(ZONA);
        Usuario conta = new Usuario(
                "Participante", "participante@teste.com", "senha", PerfilUsuario.PARTICIPANTE);
        ReflectionTestUtils.setField(conta, "id", 5L);
        participante = new UsuarioAutenticado(conta);

        Usuario pesquisador = new Usuario(
                "Pesquisador", "pesq@teste.com", "senha", PerfilUsuario.PESQUISADOR);
        estudo = new Estudo(
                "Estudo", "Objetivo", pesquisador,
                hoje.minusDays(10), hoje.plusDays(90), 20);
        ReflectionTestUtils.setField(estudo, "id", 10L);
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);

        participacao = new Participacao(estudo, conta, Instant.now());
        ReflectionTestUtils.setField(participacao, "id", 20L);

        VisitaPrevista prevista = new VisitaPrevista(
                new Protocolo(estudo, false), "Visita inicial", null, 1);
        ReflectionTestUtils.setField(prevista, "id", 30L);
        visita = new VisitaAgendada(
                participacao, prevista, Instant.now().plusSeconds(3600));
        ReflectionTestUtils.setField(visita, "id", 40L);
    }

    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class, names = {"RECRUTAMENTO", "EXECUCAO"})
    void confirmaPresencaEmRecrutamentoOuExecucao(EstadoEstudo estado) {
        ReflectionTestUtils.setField(estudo, "estado", estado);
        prepararVinculos();

        var resposta = servico.confirmarPresenca(40L, participante);

        assertThat(resposta.visitaAgendadaId()).isEqualTo(40L);
        assertThat(resposta.estudoId()).isEqualTo(10L);
        assertThat(resposta.situacao()).isEqualTo(SituacaoVisita.AGENDADA);
        assertThat(resposta.presencaConfirmadaEm()).isNotNull();
        assertThat(visita.getPresencaConfirmadaEm()).isNotNull();
        assertThat(visita.getSituacao()).isEqualTo(SituacaoVisita.AGENDADA);
    }

    @Test
    void confirmarDeNovoAtualizaAConfirmacaoSemErro() {
        prepararVinculos();
        servico.confirmarPresenca(40L, participante);
        Instant primeira = visita.getPresencaConfirmadaEm();

        servico.confirmarPresenca(40L, participante);

        assertThat(visita.getPresencaConfirmadaEm()).isNotNull();
        assertThat(visita.getPresencaConfirmadaEm()).isAfterOrEqualTo(primeira);
    }

    @Test
    void visitaDeOutraContaRetorna404SemBloqueioOuSalvamento() {
        when(visitasAgendadas.buscarEstudoIdDaVisitaDoParticipante(40L, 5L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.confirmarPresenca(40L, participante))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        verify(estudos, never()).bloquearPorId(org.mockito.ArgumentMatchers.any());
        verify(visitasAgendadas, never()).findById(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void visitaInexistenteRetorna404() {
        when(visitasAgendadas.buscarEstudoIdDaVisitaDoParticipante(40L, 5L))
                .thenReturn(Optional.of(10L));
        when(estudos.bloquearPorId(10L)).thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.confirmarPresenca(40L, participante))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));
    }

    @Test
    void perfilDiferenteENuloRecebemAcessoNegadoSemInteracao() {
        Usuario coordenador = new Usuario(
                "Coordenador", "coord@teste.com", "senha", PerfilUsuario.COORDENADOR);
        UsuarioAutenticado autenticado = new UsuarioAutenticado(coordenador);

        assertThatThrownBy(() -> servico.confirmarPresenca(40L, autenticado))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> servico.confirmarPresenca(40L, null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, visitasAgendadas, solicitacoesReagendamento);
    }

    @Test
    void participacaoRetiradaRejeita() {
        participacao.registrarRetirada(
                "Retirada", Instant.now(), estudo.getResponsavel());
        prepararVinculos();

        assertCodigo(() -> servico.confirmarPresenca(40L, participante),
                "PARTICIPACAO_INVALIDA");
    }

    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class,
            mode = EnumSource.Mode.EXCLUDE,
            names = {"RECRUTAMENTO", "EXECUCAO"})
    void estudoForaDosEstadosPermitidosRejeita(EstadoEstudo estado) {
        ReflectionTestUtils.setField(estudo, "estado", estado);
        prepararVinculos();

        assertCodigo(() -> servico.confirmarPresenca(40L, participante),
                "ESTADO_ESTUDO_INVALIDO");
    }

    @ParameterizedTest
    @EnumSource(value = SituacaoVisita.class, names = {"AGENDADA"}, mode = EnumSource.Mode.EXCLUDE)
    void visitaNaoAgendadaRejeita(SituacaoVisita situacao) {
        visita.registrarSituacao(situacao, null, estudo.getResponsavel(), Instant.now());
        prepararVinculos();

        assertCodigo(() -> servico.confirmarPresenca(40L, participante),
                "TRANSICAO_VISITA_INVALIDA");
    }

    @Test
    void visitaPassadaHojeOuOntemRejeita() {
        ReflectionTestUtils.setField(visita, "dataHora", Instant.now().minusSeconds(60));
        prepararVinculos();
        assertCodigo(() -> servico.confirmarPresenca(40L, participante),
                "TRANSICAO_VISITA_INVALIDA");
    }

    @Test
    void bloqueiaEstudoAntesDeRelerVisita() {
        prepararVinculos();

        servico.confirmarPresenca(40L, participante);

        InOrder ordem = inOrder(estudos, visitasAgendadas);
        ordem.verify(visitasAgendadas).buscarEstudoIdDaVisitaDoParticipante(40L, 5L);
        ordem.verify(estudos).bloquearPorId(10L);
        ordem.verify(visitasAgendadas).findById(40L);
    }

    @Test
    void pedidoPendenteMantemVisitaConfirmacaoECriaPedido() {
        prepararVinculos();
        visita.confirmarPresenca(Instant.now());
        Instant confirmada = visita.getPresencaConfirmadaEm();
        Instant dataVisita = visita.getDataHora();
        Instant desejada = LocalDate.now(ZONA).plusDays(3)
                .atTime(14, 0).atZone(ZONA).toInstant();
        when(solicitacoesReagendamento.saveAndFlush(
                org.mockito.ArgumentMatchers.any(SolicitacaoReagendamento.class)))
                .thenAnswer(invocacao -> {
                    SolicitacaoReagendamento pedido = invocacao.getArgument(0);
                    ReflectionTestUtils.setField(pedido, "id", 60L);
                    return pedido;
                });

        SolicitacaoReagendamentoParticipanteResposta resposta =
                servico.pedirReagendamento(
                        40L,
                        new PedidoReagendamentoEntrada(desejada, "Consulta médica"),
                        participante);

        assertThat(resposta.situacao()).isEqualTo(SituacaoSolicitacao.PENDENTE);
        assertThat(resposta.dataHoraOriginal()).isEqualTo(dataVisita);
        assertThat(resposta.motivo()).isEqualTo("Consulta médica");
        assertThat(visita.getDataHora()).isEqualTo(dataVisita);
        assertThat(visita.getPresencaConfirmadaEm()).isEqualTo(confirmada);
    }

    @Test
    void pedidoDuplicadoERejeitadoSemSalvar() {
        prepararVinculos();
        when(solicitacoesReagendamento
                .existsByVisitaAgendadaIdAndSituacao(
                        40L, SituacaoSolicitacao.PENDENTE))
                .thenReturn(true);

        assertThatThrownBy(() -> servico.pedirReagendamento(
                40L,
                new PedidoReagendamentoEntrada(
                        LocalDate.now(ZONA).plusDays(3).atTime(14, 0).atZone(ZONA).toInstant(),
                        null),
                participante))
                .isInstanceOfSatisfying(ConflitoException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("SOLICITACAO_JA_PENDENTE"));

        verify(solicitacoesReagendamento, never()).saveAndFlush(
                org.mockito.ArgumentMatchers.any());
    }

    private void prepararVinculos() {
        when(visitasAgendadas.buscarEstudoIdDaVisitaDoParticipante(40L, 5L))
                .thenReturn(Optional.of(10L));
        when(estudos.bloquearPorId(10L)).thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L)).thenReturn(Optional.of(visita));
    }

    private void assertCodigo(Runnable acao, String codigo) {
        assertThatThrownBy(acao::run)
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo()).isEqualTo(codigo));
    }
}
