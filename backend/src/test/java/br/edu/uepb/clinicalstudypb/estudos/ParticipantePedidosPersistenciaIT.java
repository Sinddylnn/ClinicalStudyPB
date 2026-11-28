package br.edu.uepb.clinicalstudypb.estudos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.api.PedidoReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.repository.SolicitacaoReagendamentoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaParticipanteService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------PERSISTÊNCIA DOS PEDIDOS DO PARTICIPANTE------------------->
/**
 * Confere confirmação e pedidos de reagendamento no PostgreSQL real.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class ParticipantePedidosPersistenciaIT {

    private static final ZoneId ZONA = ZoneId.of("America/Recife");

    @Autowired private VisitaParticipanteService visitasParticipante;
    @Autowired private VisitaAgendadaRepository visitasAgendadas;
    @Autowired private SolicitacaoReagendamentoRepository reagendamentos;
    @Autowired private EntityManager entidades;

    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add("spring.datasource.url",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
    }

    @Test
    void confirmaDuasVezesGravaConfirmacaoSemAlterarAVisita() {
        Cenario cenario = criarCenario();
        Instant dataOriginal = cenario.visita().getDataHora();

        visitasParticipante.confirmarPresenca(
                cenario.visita().getId(),
                new UsuarioAutenticado(cenario.participante()));
        entidades.flush();
        entidades.clear();

        VisitaAgendada confirmada =
                entidades.find(VisitaAgendada.class, cenario.visita().getId());
        assertThat(confirmada.getPresencaConfirmadaEm()).isNotNull();
        assertThat(confirmada.getSituacao()).isEqualTo(SituacaoVisita.AGENDADA);
        assertThat(confirmada.getDataHora()).isEqualTo(dataOriginal);

        visitasParticipante.confirmarPresenca(
                confirmada.getId(),
                new UsuarioAutenticado(cenario.participante()));
        entidades.flush();
        entidades.clear();

        VisitaAgendada atualizada =
                entidades.find(VisitaAgendada.class, cenario.visita().getId());
        assertThat(atualizada.getPresencaConfirmadaEm()).isNotNull();
    }

    @Test
    void gravaPedidoPendenteImpedeSegundoERespostaPermiteNovoPedido() {
        Cenario cenario = criarCenario();
        VisitaAgendada visita = cenario.visita();
        visita.confirmarPresenca(Instant.now());
        entidades.flush();
        entidades.clear();

        Instant desejada = LocalDate.now(ZONA).plusDays(3)
                .atTime(14, 0).atZone(ZONA).toInstant();
        visitasParticipante.pedirReagendamento(
                visita.getId(),
                new PedidoReagendamentoEntrada(desejada, "Consulta médica"),
                new UsuarioAutenticado(cenario.participante()));
        entidades.flush();
        entidades.clear();

        SolicitacaoReagendamento pedido = reagendamentos
                .findAll().stream().findFirst().orElseThrow();
        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.PENDENTE);
        assertThat(pedido.getDataHoraOriginal()).isEqualTo(visita.getDataHora());
        assertThat(pedido.getDataHoraDesejada()).isEqualTo(desejada);
        assertThat(pedido.getMotivo()).isEqualTo("Consulta médica");

        VisitaAgendada persistida =
                entidades.find(VisitaAgendada.class, visita.getId());
        assertThat(persistida.getDataHora()).isEqualTo(visita.getDataHora());
        assertThat(persistida.getPresencaConfirmadaEm()).isNotNull();

        assertThatThrownBy(() -> visitasParticipante.pedirReagendamento(
                visita.getId(),
                new PedidoReagendamentoEntrada(desejada.plusSeconds(3600), null),
                new UsuarioAutenticado(cenario.participante())))
                .isInstanceOf(ConflitoException.class);

        pedido = entidades.find(SolicitacaoReagendamento.class, pedido.getId());
        pedido.recusar(
                cenario.coordenador(),
                "Não há disponibilidade nesse horário",
                Instant.now());
        entidades.flush();
        entidades.clear();

        visitasParticipante.pedirReagendamento(
                visita.getId(),
                new PedidoReagendamentoEntrada(desejada.plusSeconds(7200), null),
                new UsuarioAutenticado(cenario.participante()));
        entidades.flush();
        entidades.clear();

        assertThat(reagendamentos.findAll()).hasSize(2);
    }

    @Test
    void outroParticipanteERetiradaOuCancelamentoNaoGravam() {
        Cenario cenario = criarCenario();
        Usuario outro = conta(PerfilUsuario.PARTICIPANTE);

        assertThatThrownBy(() -> visitasParticipante.confirmarPresenca(
                cenario.visita().getId(), new UsuarioAutenticado(outro)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));
        assertThatThrownBy(() -> visitasParticipante.pedirReagendamento(
                cenario.visita().getId(),
                new PedidoReagendamentoEntrada(
                        LocalDate.now(ZONA).plusDays(3)
                                .atTime(14, 0).atZone(ZONA).toInstant(),
                        null),
                new UsuarioAutenticado(outro)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode().value()).isEqualTo(404));

        cenario.participacao().registrarRetirada(
                "Retirada", Instant.now(), cenario.coordenador());
        cenario.visita().registrarSituacao(
                SituacaoVisita.CANCELADA, "Cancelada", cenario.coordenador(), Instant.now());
        entidades.flush();
        entidades.clear();

        assertThatThrownBy(() -> visitasParticipante.confirmarPresenca(
                cenario.visita().getId(),
                new UsuarioAutenticado(cenario.participante())))
                .isInstanceOfSatisfying(
                        RuntimeException.class,
                        erro -> assertThat(erro).isNotNull());
    }

    @Test
    void indiceParcialRejeitaSegundoPedidoPendente() {
        Cenario cenario = criarCenario();
        SolicitacaoReagendamento primeiro = new SolicitacaoReagendamento(
                cenario.visita(),
                cenario.visita().getDataHora().plusSeconds(3600),
                null,
                Instant.now());
        entidades.persist(primeiro);
        entidades.flush();

        SolicitacaoReagendamento segundo = new SolicitacaoReagendamento(
                cenario.visita(),
                cenario.visita().getDataHora().plusSeconds(7200),
                null,
                Instant.now());
        entidades.persist(segundo);

        assertThatThrownBy(entidades::flush)
                .isInstanceOf(PersistenceException.class)
                .hasRootCauseInstanceOf(ConstraintViolationException.class)
                .satisfies(erro -> {
                    Throwable causa = erro;
                    while (causa.getCause() != null) {
                        causa = causa.getCause();
                    }
                    assertThat(((ConstraintViolationException) causa).getConstraintName())
                            .isEqualTo("uk_solicitacoes_reagendamento_pendente");
                });
    }

    private Cenario criarCenario() {
        LocalDate hoje = LocalDate.now(ZONA);
        Usuario pesquisador = conta(PerfilUsuario.PESQUISADOR);
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);

        Estudo estudo = new Estudo(
                "Estudo de pedidos",
                "Objetivo fictício",
                pesquisador,
                hoje.minusDays(10),
                hoje.plusDays(90),
                20);
        ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.RECRUTAMENTO);
        estudo.atribuirCoordenador(coordenador);
        entidades.persist(estudo);

        Protocolo protocolo = new Protocolo(estudo, false);
        entidades.persist(protocolo);
        VisitaPrevista prevista =
                new VisitaPrevista(protocolo, "Visita inicial", null, 1);
        entidades.persist(prevista);

        Participacao participacao =
                new Participacao(estudo, participante, Instant.now());
        entidades.persist(participacao);

        VisitaAgendada visita = new VisitaAgendada(
                participacao,
                prevista,
                hoje.plusDays(2).atTime(14, 0).atZone(ZONA).toInstant());
        entidades.persist(visita);
        entidades.flush();

        return new Cenario(coordenador, participante, participacao, visita);
    }

    private Usuario conta(PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Teste " + perfil,
                UUID.randomUUID() + "@example.test",
                "hash-ficticio",
                perfil);
        entidades.persist(usuario);
        return usuario;
    }

    private record Cenario(
            Usuario coordenador,
            Usuario participante,
            Participacao participacao,
            VisitaAgendada visita) {
    }
}
