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
import java.time.ZoneOffset;
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
        LocalDate hoje = LocalDate.now(ZoneOffset.UTC);

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

}
