package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaConsentimento;
import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoElegibilidade;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.EntityManager;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Confere a consulta completa do painel (RF21) com PostgreSQL real.
 * Os dados são preparados em um schema exclusivo e descartável.
 *
 * @author Luiz
 * @version 1.0
 * @since 26/11/2026
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class IndicadoresPainelIT {

    private static final String SCHEMA = "teste_painel_"
            + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = "/estudos/{estudoId}/indicadores";

    @Autowired private EntityManager entidades;
    @Autowired private PlatformTransactionManager transacoes;
    @Autowired private MockMvc mvc;

    private UsuarioAutenticado pesquisador;
    private UsuarioAutenticado coordenador;
    private UsuarioAutenticado outroPesquisador;
    private UsuarioAutenticado outroCoordenador;
    private Long estudoId;
    private Long outroEstudoId;
    private Long estudoVazioId;

    /**
     * Configura um schema independente no banco exclusivo de testes.
     *
     * @param propriedades propriedades do contexto Spring
     * @since 1.0
     */
    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        try (var conexao = DriverManager.getConnection(
                System.getenv("CLINICALSTUDYPB_TEST_DB_URL"),
                System.getenv("CLINICALSTUDYPB_TEST_DB_USER"),
                System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
                var sql = conexao.createStatement()) {
            sql.execute("CREATE SCHEMA IF NOT EXISTS " + SCHEMA);
        } catch (SQLException erro) {
            throw new IllegalStateException("Não foi possível preparar o schema de testes do painel.", erro);
        }

        propriedades.add("spring.datasource.url", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
        propriedades.add("spring.datasource.hikari.schema", () -> SCHEMA);
        propriedades.add("spring.flyway.schemas", () -> SCHEMA);
        propriedades.add("spring.flyway.default-schema", () -> SCHEMA);
        propriedades.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
    }

    /**
     * Prepara e confirma os registros antes de executar as requisições HTTP.
     * A transação do service não fica subordinada a uma transação do teste.
     *
     * @since 1.0
     */
    @BeforeAll
    void prepararDados() {
        new TransactionTemplate(transacoes).executeWithoutResult(transacao -> {
            Instant agora = Instant.now().truncatedTo(ChronoUnit.SECONDS);
            Usuario responsavel = conta(PerfilUsuario.PESQUISADOR);
            Usuario vinculado = conta(PerfilUsuario.COORDENADOR);
            Usuario responsavelExterno = conta(PerfilUsuario.PESQUISADOR);
            Usuario coordenadorExterno = conta(PerfilUsuario.COORDENADOR);

            Estudo estudo = estudo("Estudo do painel", responsavel, vinculado);
            Estudo externo = estudo("Outro estudo", responsavelExterno, coordenadorExterno);
            Estudo vazio = estudo("Estudo sem registros", responsavel, vinculado);

            estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
            estudo.alterarEstado(EstadoEstudo.EXECUCAO, null);
            externo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
            externo.alterarEstado(EstadoEstudo.EXECUCAO, null);

            Participacao ativa = incluir(estudo, agora);
            Participacao retirada = incluir(estudo, agora);
            entidades.persist(new Candidato(estudo, "Candidato sem inclusão",
                    "candidato-pendente@example.test"));
            Participacao outra = incluir(externo, agora);

            Protocolo protocolo = new Protocolo(estudo, false);
            Protocolo protocoloExterno = new Protocolo(externo, false);
            entidades.persist(protocolo);
            entidades.persist(protocoloExterno);

            VisitaPrevista primeira = prevista(protocolo, 1);
            VisitaPrevista segunda = prevista(protocolo, 2);
            VisitaPrevista terceira = prevista(protocolo, 3);
            VisitaPrevista quarta = prevista(protocolo, 4);
            VisitaPrevista quinta = prevista(protocolo, 5);

            visita(retirada, primeira, agora.minus(2, ChronoUnit.DAYS),
                    SituacaoVisita.REALIZADA, null, vinculado, agora.minus(1, ChronoUnit.DAYS));
            retirada.registrarRetirada("Retirada solicitada", agora, vinculado);
            visita(ativa, segunda, agora.minus(1, ChronoUnit.DAYS),
                    SituacaoVisita.AGENDADA, null, vinculado, agora);
            visita(ativa, terceira, agora.plus(1, ChronoUnit.DAYS),
                    SituacaoVisita.AGENDADA, null, vinculado, agora);
            visita(ativa, quarta, agora.minus(1, ChronoUnit.DAYS),
                    SituacaoVisita.CANCELADA, "Cancelamento solicitado", vinculado, agora);
            visita(ativa, quinta, agora.minus(1, ChronoUnit.DAYS),
                    SituacaoVisita.AUSENTE, null, vinculado, agora);

            visita(outra, prevista(protocoloExterno, 1), agora.minus(1, ChronoUnit.DAYS),
                    SituacaoVisita.REALIZADA, null, coordenadorExterno, agora);
            visita(outra, prevista(protocoloExterno, 2), agora.plus(1, ChronoUnit.DAYS),
                    SituacaoVisita.AGENDADA, null, coordenadorExterno, agora);

            entidades.flush();
            estudoId = estudo.getId();
            outroEstudoId = externo.getId();
            estudoVazioId = vazio.getId();
            pesquisador = new UsuarioAutenticado(responsavel);
            coordenador = new UsuarioAutenticado(vinculado);
            outroPesquisador = new UsuarioAutenticado(responsavelExterno);
            outroCoordenador = new UsuarioAutenticado(coordenadorExterno);
        });
    }

    /** Confere os indicadores do estudo para o pesquisador responsável. */
    @Test
    void pesquisadorConsultaContagensDoEstudo() throws Exception {
        conferirIndicadores(pesquisador, estudoId, 3, 2, 1, 1, 1, 2);
    }

    /** Confere os mesmos indicadores para o coordenador vinculado. */
    @Test
    void coordenadorConsultaContagensDoEstudo() throws Exception {
        conferirIndicadores(coordenador, estudoId, 3, 2, 1, 1, 1, 2);
    }

    /** Confere as contagens independentes do outro estudo. */
    @Test
    void outroEstudoPossuiContagensIndependentes() throws Exception {
        conferirIndicadores(outroCoordenador, outroEstudoId, 1, 1, 1, 0, 1, 1);
    }

    /** Confere o retorno zerado para um estudo acessível sem registros. */
    @Test
    void estudoSemRegistrosRetornaZeros() throws Exception {
        conferirIndicadores(pesquisador, estudoVazioId, 0, 0, 0, 0, 0, 0);
    }

    /** Confere o bloqueio de ambos os perfis sem vínculo com o estudo. */
    @Test
    void usuariosSemVinculoRecebem404() throws Exception {
        for (UsuarioAutenticado usuario : new UsuarioAutenticado[]{outroPesquisador, outroCoordenador}) {
            mvc.perform(get(URL, estudoId).with(user(usuario)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));
        }
    }

    /** Remove apenas o schema temporário criado por esta classe. */
    @AfterAll
    static void removerSchema() throws SQLException {
        try (var conexao = DriverManager.getConnection(
                System.getenv("CLINICALSTUDYPB_TEST_DB_URL"),
                System.getenv("CLINICALSTUDYPB_TEST_DB_USER"),
                System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
                var sql = conexao.createStatement()) {
            sql.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        }
    }

    private void conferirIndicadores(UsuarioAutenticado usuario, Long id,
            int candidatos, int incluidos, int ativos, int retirados,
            int realizadas, int pendentes) throws Exception {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        mvc.perform(get(URL, id).with(user(usuario)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estudoId").value(id.intValue()))
                .andExpect(jsonPath("$.totalCandidatos").value(candidatos))
                .andExpect(jsonPath("$.totalIncluidos").value(incluidos))
                .andExpect(jsonPath("$.participantesAtivos").value(ativos))
                .andExpect(jsonPath("$.participantesRetirados").value(retirados))
                .andExpect(jsonPath("$.visitasRealizadas").value(realizadas))
                .andExpect(jsonPath("$.visitasPendentes").value(pendentes));
    }

    private Usuario conta(PerfilUsuario perfil) {
        Usuario usuario = new Usuario("Teste " + perfil, UUID.randomUUID() + "@example.test",
                "hash-ficticio", perfil);
        entidades.persist(usuario);
        return usuario;
    }

    private Estudo estudo(String titulo, Usuario responsavel, Usuario coordenador) {
        Estudo estudo = new Estudo(titulo, "Objetivo fictício", responsavel,
                LocalDate.now().minusDays(30), LocalDate.now().plusDays(30), 10);
        estudo.atribuirCoordenador(coordenador);
        entidades.persist(estudo);
        return estudo;
    }

    private Participacao incluir(Estudo estudo, Instant agora) {
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);
        Candidato candidato = new Candidato(estudo, participante.getNome(), participante.getEmail());
        candidato.atualizarElegibilidade(SituacaoElegibilidade.ELEGIVEL);
        candidato.registrarConsentimento(RespostaConsentimento.ACEITOU);
        entidades.persist(candidato);
        Participacao participacao = new Participacao(candidato, participante, agora.minus(3, ChronoUnit.DAYS));
        entidades.persist(participacao);
        return participacao;
    }

    private VisitaPrevista prevista(Protocolo protocolo, int ordem) {
        VisitaPrevista prevista = new VisitaPrevista(protocolo, "Visita " + ordem, null, ordem);
        entidades.persist(prevista);
        return prevista;
    }

    private void visita(Participacao participacao, VisitaPrevista prevista, Instant data,
            SituacaoVisita situacao, String motivo, Usuario coordenador, Instant registro) {
        VisitaAgendada visita = new VisitaAgendada(participacao, prevista, data);
        if (situacao != SituacaoVisita.AGENDADA) {
            visita.registrarSituacao(situacao, motivo, coordenador, registro);
        }
        entidades.persist(visita);
    }
}
