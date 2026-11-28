package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.SolicitacaoReagendamentoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

// <-------------------REGRAS DAS CONSULTAS DO PARTICIPANTE------------------->
/**
 * Testa o filtro pela conta da sessão, o vínculo do estudo e os dados devolvidos ao aplicativo.
 *
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
@ExtendWith(MockitoExtension.class)
class ParticipanteConsultaServiceTest {

    private static final ZoneId ZONA = ZoneId.of("America/Recife");

    @Mock private ParticipacaoRepository participacoes;
    @Mock private VisitaAgendadaRepository visitasAgendadas;
    @Mock private SolicitacaoReagendamentoRepository solicitacoesReagendamento;

    @InjectMocks private ParticipanteConsultaService servico;

    private UsuarioAutenticado participante;
    private Participacao ativa;
    private Participacao retirada;
    private VisitaPrevista prevista;

    // <-------------------PREPARAÇÃO DOS CENÁRIOS------------------->

    @BeforeEach
    void preparar() {
        LocalDate hoje = LocalDate.now(ZONA);

        Usuario coordenador = new Usuario("Coordenador", "coord@teste.com",
                "senha", PerfilUsuario.COORDENADOR);
        ReflectionTestUtils.setField(coordenador, "id", 1L);

        Usuario conta = new Usuario("Participante", "part@teste.com",
                "senha", PerfilUsuario.PARTICIPANTE);
        ReflectionTestUtils.setField(conta, "id", 5L);
        participante = new UsuarioAutenticado(conta);

        Estudo estudo = new Estudo("Estudo A", "Objetivo A", coordenador,
                hoje.minusDays(10), hoje.plusDays(60), 10);
        ReflectionTestUtils.setField(estudo, "id", 10L);
        Estudo outroEstudo = new Estudo("Estudo B", "Objetivo B", coordenador,
                hoje.minusDays(10), hoje.plusDays(60), 10);
        ReflectionTestUtils.setField(outroEstudo, "id", 11L);

        ativa = new Participacao(estudo, conta, Instant.now());
        ReflectionTestUtils.setField(ativa, "id", 20L);

        retirada = new Participacao(outroEstudo, conta, Instant.now());
        ReflectionTestUtils.setField(retirada, "id", 21L);
        retirada.registrarRetirada("Desistência", Instant.now(), coordenador);

        prevista = new VisitaPrevista(new Protocolo(estudo, false), "Visita inicial", null, 1);
        ReflectionTestUtils.setField(prevista, "id", 30L);
    }

    // <-------------------ESTUDOS (RF17)------------------->

    @Test
    void listaEstudosDaContaInclusiveOsRetirados() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L))
                .thenReturn(List.of(ativa, retirada));

        var resposta = servico.listarEstudos(participante);

        assertThat(resposta).hasSize(2);
        assertThat(resposta.get(0).estudoId()).isEqualTo(10L);
        assertThat(resposta.get(0).titulo()).isEqualTo("Estudo A");
        assertThat(resposta.get(0).estado()).isEqualTo(EstadoEstudo.PLANEJAMENTO);
        assertThat(resposta.get(0).situacaoParticipacao()).isEqualTo(SituacaoParticipacao.ATIVA);
        assertThat(resposta.get(1).estudoId()).isEqualTo(11L);
        assertThat(resposta.get(1).situacaoParticipacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
    }

    @Test
    void contaSemParticipacaoRecebeListaVazia() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L)).thenReturn(List.of());

        assertThat(servico.listarEstudos(participante)).isEmpty();
    }

    // <-------------------PRÓXIMAS VISITAS (RF18)------------------->

    @Test
    void proximasUsaTodasAsParticipacoesEOInicioDoDiaDeHoje() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L))
                .thenReturn(List.of(ativa, retirada));
        VisitaAgendada visita = visita(40L, ativa, Instant.now().plus(1, ChronoUnit.DAYS));
        when(visitasAgendadas.buscarProximasDasParticipacoes(
                eq(List.of(20L, 21L)), eq(SituacaoVisita.AGENDADA), any(Instant.class)))
                .thenReturn(List.of(visita));

        var resposta = servico.listarProximasVisitas(null, participante);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).visitaAgendadaId()).isEqualTo(40L);
        assertThat(resposta.get(0).estudoId()).isEqualTo(10L);
        assertThat(resposta.get(0).tituloEstudo()).isEqualTo("Estudo A");
        assertThat(resposta.get(0).nomeVisita()).isEqualTo("Visita inicial");

        ArgumentCaptor<Instant> inicio = ArgumentCaptor.forClass(Instant.class);
        verify(visitasAgendadas).buscarProximasDasParticipacoes(
                any(), eq(SituacaoVisita.AGENDADA), inicio.capture());
        assertThat(inicio.getValue())
                .isEqualTo(LocalDate.now(ZONA).atStartOfDay(ZONA).toInstant());
    }

    @Test
    void proximasComEstudoIdFiltraSomenteAquelaParticipacao() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L))
                .thenReturn(List.of(ativa, retirada));
        when(visitasAgendadas.buscarProximasDasParticipacoes(
                eq(List.of(20L)), eq(SituacaoVisita.AGENDADA), any(Instant.class)))
                .thenReturn(List.of());

        assertThat(servico.listarProximasVisitas(10L, participante)).isEmpty();

        verify(visitasAgendadas).buscarProximasDasParticipacoes(
                eq(List.of(20L)), eq(SituacaoVisita.AGENDADA), any(Instant.class));
    }

    @Test
    void proximasSemParticipacoesNaoConsultaVisitas() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L)).thenReturn(List.of());

        assertThat(servico.listarProximasVisitas(null, participante)).isEmpty();

        verifyNoInteractions(visitasAgendadas);
    }

    @Test
    void proximasComEstudoSemVinculoRecebe404() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L)).thenReturn(List.of(ativa));

        assertThatThrownBy(() -> servico.listarProximasVisitas(99L, participante))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        verifyNoInteractions(visitasAgendadas);
    }

    // <-------------------HISTÓRICO (RF18)------------------->

    @Test
    void historicoConsultaSomenteSituacoesPermitidasESemDadosDeGestao() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L)).thenReturn(List.of(ativa));
        VisitaAgendada ausente = visita(41L, ativa, Instant.now().minus(1, ChronoUnit.DAYS));
        ausente.registrarSituacao(
                SituacaoVisita.AUSENTE, "Motivo interno", ativa.getEstudo().getResponsavel(), Instant.now());
        when(visitasAgendadas.buscarHistoricoDasParticipacoes(
                eq(List.of(20L)),
                eq(List.of(SituacaoVisita.REALIZADA, SituacaoVisita.AUSENTE, SituacaoVisita.CANCELADA))))
                .thenReturn(List.of(ausente));

        var resposta = servico.listarHistorico(null, participante);

        assertThat(resposta).hasSize(1);
        assertThat(resposta.get(0).situacao()).isEqualTo(SituacaoVisita.AUSENTE);
        assertThat(resposta.get(0).nomeVisita()).isEqualTo("Visita inicial");
        assertThat(resposta.get(0).getClass().getRecordComponents())
                .extracting(componente -> componente.getName())
                .doesNotContain("motivo", "justificativa", "registradoPorId");
    }

    @Test
    void historicoComEstudoSemVinculoRecebe404() {
        when(participacoes.findByParticipanteIdOrderByIdAsc(5L)).thenReturn(List.of(ativa));

        assertThatThrownBy(() -> servico.listarHistorico(99L, participante))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        verifyNoInteractions(visitasAgendadas);
    }

    // <-------------------PERFIS SEM PERMISSÃO------------------->

    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PESQUISADOR", "COORDENADOR"})
    void outrosPerfisRecebemAcessoNegado(PerfilUsuario perfil) {
        UsuarioAutenticado outro = new UsuarioAutenticado(
                new Usuario("Outro", "outro@teste.com", "senha", perfil));

        assertThatThrownBy(() -> servico.listarEstudos(outro))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> servico.listarProximasVisitas(null, outro))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> servico.listarHistorico(null, outro))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(participacoes, visitasAgendadas);
    }

    @Test
    void autenticacaoAusenteRecebeAcessoNegado() {
        assertThatThrownBy(() -> servico.listarEstudos(null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(participacoes, visitasAgendadas);
    }

    // <-------------------APOIO AOS CENÁRIOS------------------->

    private VisitaAgendada visita(Long id, Participacao participacao, Instant dataHora) {
        VisitaAgendada visita = new VisitaAgendada(participacao, prevista, dataHora);
        ReflectionTestUtils.setField(visita, "id", id);
        return visita;
    }
}
