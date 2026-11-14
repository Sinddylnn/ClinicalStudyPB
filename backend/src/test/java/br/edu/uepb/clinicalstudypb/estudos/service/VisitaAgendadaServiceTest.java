package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.*;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.*;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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

    @InjectMocks
    private VisitaAgendadaService servico;

    private Estudo estudo;
    private Participacao participacao;
    private VisitaPrevista visitaPrevista;
    private UsuarioAutenticado coordenador;
    private Instant dataVisita;

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

        participacao = new Participacao(
                estudo, participante, Instant.now());
        ReflectionTestUtils.setField(participacao, "id", 20L);

        Protocolo protocolo = new Protocolo(estudo, false);

        visitaPrevista = new VisitaPrevista(
                protocolo, "Visita inicial", null, 1);
        ReflectionTestUtils.setField(visitaPrevista, "id", 30L);

        dataVisita = Instant.now().plus(2, ChronoUnit.DAYS);
    }

    private void prepararConsulta() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        when(participacoes.findById(20L))
                .thenReturn(Optional.of(participacao));

        when(visitasPrevistas.findById(30L))
                .thenReturn(Optional.of(visitaPrevista));
    }

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

    @Test
    void impedeAgendamentoDuplicado() {
        prepararConsulta();

        when(visitasAgendadas
                .existsByParticipacao_IdAndVisitaPrevista_IdAndSituacao(
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

    @Test
    void impedeReagendarVisitaFinalizada() {
        VisitaAgendada visita = new VisitaAgendada(
                participacao, visitaPrevista, dataVisita);

        visita.registrarSituacao(
                SituacaoVisita.REALIZADA, null, null, Instant.now());

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
                .isInstanceOf(ConflitoException.class)
                .hasMessageContaining("Apenas visitas agendadas");

        verify(visitasAgendadas, never())
                .save(any(VisitaAgendada.class));
    }


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

}
