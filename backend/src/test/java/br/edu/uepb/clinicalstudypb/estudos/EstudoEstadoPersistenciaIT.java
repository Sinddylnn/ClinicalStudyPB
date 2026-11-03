package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.api.AlteracaoEstadoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.service.EstudoService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.EntityManager;
import java.sql.DriverManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// <-------------------TRANSIÇÕES COM POSTGRESQL REAL------------------->
/**
 * Confere commits, migrações e bloqueios em banco exclusivo de testes.
 *
 * <p>Executar com -Dtest=EstudoEstadoPersistenciaIT e CLINICALSTUDYPB_TEST_DB_*.
 * As fixtures criam configurações e inclusões diretamente porque seus endpoints
 * ainda não fazem parte desta entrega. Não validam o fluxo de consentimento.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class EstudoEstadoPersistenciaIT {
    @Autowired private EstudoService servico;
    @Autowired private EstudoRepository estudos;
    @Autowired private EntityManager entidades;
    @Autowired private PlatformTransactionManager transacoes;

    /**
     * Aponta exclusivamente para as credenciais do banco de testes.
     *
     * @param propriedades registro de configuração do contexto
     */
    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add("spring.datasource.url", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
    }

    /** Persiste o fluxo completo e preserva o recrutamento quando uma condição falha. */
    @Test
    void persisteFluxoPrincipalERejeitaEncerramentoComInclusao() {
        Cenario c = preparar(true);
        mudar(c, EstadoEstudo.RECRUTAMENTO, null);
        conferirPersistido(c, EstadoEstudo.RECRUTAMENTO, null);
        assertThatThrownBy(() -> mudar(c, EstadoEstudo.EXECUCAO, null))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("Inclua");
        conferirPersistido(c, EstadoEstudo.RECRUTAMENTO, null);
        tx().executeWithoutResult(status -> {
            Estudo estudo = estudos.bloquearPorIdEResponsavelId(c.estudoId(), c.identidade().getId()).orElseThrow();
            entidades.persist(new Participacao(estudo, conta(PerfilUsuario.PARTICIPANTE), Instant.now()));
        });
        assertThatThrownBy(() -> mudar(c, EstadoEstudo.ENCERRADO, "Cancelado"))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("inclusões");
        conferirPersistido(c, EstadoEstudo.RECRUTAMENTO, null);
        mudar(c, EstadoEstudo.EXECUCAO, null);
        conferirPersistido(c, EstadoEstudo.EXECUCAO, null);
        mudar(c, EstadoEstudo.ENCERRADO, null);
        conferirPersistido(c, EstadoEstudo.ENCERRADO, null);
        assertThatThrownBy(() -> mudar(c, EstadoEstudo.RECRUTAMENTO, null))
                .isInstanceOf(RegraNegocioException.class);
        conferirPersistido(c, EstadoEstudo.ENCERRADO, null);
    }

    /** Salva o motivo nos dois encerramentos antecipados e bloqueia a troca de coordenador. */
    @Test
    void persisteEncerramentosAntecipadosEProtegeCoordenador() {
        for (boolean recrutar : new boolean[]{false, true}) {
            Cenario c = preparar(true);
            if (recrutar) {
                mudar(c, EstadoEstudo.RECRUTAMENTO, null);
            }
            assertThatThrownBy(() -> mudar(c, EstadoEstudo.ENCERRADO, "  "))
                    .isInstanceOf(RegraNegocioException.class);
            conferirPersistido(c, recrutar ? EstadoEstudo.RECRUTAMENTO : EstadoEstudo.PLANEJAMENTO, null);
            mudar(c, EstadoEstudo.ENCERRADO, "  Cancelado antes da inclusão.  ");
            conferirPersistido(c, EstadoEstudo.ENCERRADO, "Cancelado antes da inclusão.");
            Long outroCoordenador = tx().execute(status -> conta(PerfilUsuario.COORDENADOR).getId());
            assertThatThrownBy(() -> servico.atribuirCoordenador(c.estudoId(), outroCoordenador, c.identidade()))
                    .isInstanceOf(RegraNegocioException.class).hasMessageContaining("encerrado");
            Long coordenadorPersistido = tx().execute(status -> estudos.findById(c.estudoId()).orElseThrow()
                    .getCoordenador().getId());
            assertThat(coordenadorPersistido).isEqualTo(c.coordenadorId());
        }
    }

    /** Confere a consulta real de visitas sem atividade e o protocolo com intervalos na ordem. */
    @Test
    void consultaAtividadesReaisAntesDeAbrirRecrutamento() {
        Cenario c = preparar(false);
        assertThatThrownBy(() -> mudar(c, EstadoEstudo.RECRUTAMENTO, null))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("Visita final");
        conferirPersistido(c, EstadoEstudo.PLANEJAMENTO, null);
        tx().executeWithoutResult(status -> {
            estudos.bloquearPorIdEResponsavelId(c.estudoId(), c.identidade().getId()).orElseThrow();
            entidades.persist(new AtividadePrevista(entidades.find(VisitaPrevista.class, c.visitaId()), "Atividade final"));
        });
        mudar(c, EstadoEstudo.RECRUTAMENTO, null);
        conferirPersistido(c, EstadoEstudo.RECRUTAMENTO, null);
    }

    /**
     * Mostra que a atribuição espera a transação concorrente e lê o estado já encerrado.
     *
     * @throws Exception se o controle das tarefas concorrentes falhar
     */
    @Test
    void bloqueioImpedeTrocaDeCoordenadorDuranteEncerramento() throws Exception {
        Cenario c = preparar(true);
        Long outro = tx().execute(status -> conta(PerfilUsuario.COORDENADOR).getId());
        CountDownLatch bloqueado = new CountDownLatch(1);
        CountDownLatch liberar = new CountDownLatch(1);
        CountDownLatch segundaIniciada = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var encerramento = executor.submit(() -> tx().executeWithoutResult(status -> {
                Estudo estudo = estudos.bloquearPorIdEResponsavelId(c.estudoId(), c.identidade().getId()).orElseThrow();
                bloqueado.countDown();
                aguardar(liberar);
                estudo.alterarEstado(EstadoEstudo.ENCERRADO, "Cancelado na primeira transação");
            }));
            assertThat(bloqueado.await(10, TimeUnit.SECONDS)).isTrue();
            var atribuicao = executor.submit(() -> {
                segundaIniciada.countDown();
                return servico.atribuirCoordenador(c.estudoId(), outro, c.identidade());
            });
            assertThat(segundaIniciada.await(10, TimeUnit.SECONDS)).isTrue();
            // A segunda operação deve esperar o bloqueio da primeira ser liberado
            assertThatThrownBy(() -> atribuicao.get(500, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            liberar.countDown();
            encerramento.get(10, TimeUnit.SECONDS);
            // Depois do commit, a segunda operação já deve encontrar o estudo encerrado
            assertThatThrownBy(() -> atribuicao.get(10, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(RegraNegocioException.class);
            conferirPersistido(c, EstadoEstudo.ENCERRADO, "Cancelado na primeira transação");
            Long coordenador = tx().execute(status -> estudos.findById(c.estudoId()).orElseThrow().getCoordenador().getId());
            assertThat(coordenador).isEqualTo(c.coordenadorId());
        } finally {
            liberar.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    /**
     * Aplica as migrações novas sobre V4 e preserva os estudos existentes.
     *
     * @throws Exception se a conexão ou a migração falhar
     */
    @Test
    void evoluiBancoV4SemApagarEstudos() throws Exception {
        String url = System.getenv("CLINICALSTUDYPB_TEST_DB_URL");
        String usuario = System.getenv("CLINICALSTUDYPB_TEST_DB_USER");
        String senha = System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD");
        String schema = "teste_estados_" + UUID.randomUUID().toString().replace("-", "");
        try (var conexao = DriverManager.getConnection(url, usuario, senha); var sql = conexao.createStatement()) {
            try {
                Flyway.configure().dataSource(url, usuario, senha).schemas(schema).defaultSchema(schema)
                        .target("4").load().migrate();
                sql.execute("SET search_path TO " + schema);
                long quantidade;
                try (var dados = sql.executeQuery("SELECT COUNT(*) FROM estudos")) {
                    dados.next();
                    quantidade = dados.getLong(1);
                    assertThat(quantidade).isPositive();
                }
                Flyway.configure().dataSource(url, usuario, senha).schemas(schema).defaultSchema(schema).load().migrate();
                try (var dados = sql.executeQuery("SELECT COUNT(*) FROM estudos WHERE estado = 'PLANEJAMENTO' "
                        + "AND justificativa_encerramento IS NULL")) {
                    dados.next();
                    assertThat(dados.getLong(1)).isEqualTo(quantidade);
                }
            } finally {
                sql.execute("SET search_path TO public");
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    // <-------------------FIXTURES E TRANSAÇÕES INDEPENDENTES------------------->

    /**
     * Cria dados completos ou uma visita pendente, exclusivamente para o cenário.
     *
     * @param atividadeFinal se a última visita também recebe uma atividade
     * @return identificadores persistidos e identidade do responsável
     */
    private Cenario preparar(boolean atividadeFinal) {
        return tx().execute(status -> {
            Usuario pesquisador = conta(PerfilUsuario.PESQUISADOR);
            Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
            Estudo estudo = new Estudo("Estudo de teste", "Objetivo fictício", pesquisador,
                    LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1), 10);
            estudo.atribuirCoordenador(coordenador);
            entidades.persist(estudo);
            Protocolo protocolo = new Protocolo(estudo, true);
            entidades.persist(protocolo);
            entidades.persist(new Criterio(protocolo, TipoCriterio.INCLUSAO, "Disponibilidade fictícia"));
            VisitaPrevista inicial = new VisitaPrevista(protocolo, "Visita inicial", null, 1);
            entidades.persist(inicial);
            entidades.persist(new AtividadePrevista(inicial, "Atividade inicial"));
            VisitaPrevista ultima = new VisitaPrevista(protocolo, "Visita final", null, 3);
            entidades.persist(ultima);
            if (atividadeFinal) {
                entidades.persist(new AtividadePrevista(ultima, "Atividade final"));
            }
            return new Cenario(estudo.getId(), coordenador.getId(), ultima.getId(), new UsuarioAutenticado(pesquisador));
        });
    }

    /**
     * Cria uma conta sem depender dos dados de demonstração.
     *
     * @param perfil papel necessário ao cenário
     * @return conta persistida na transação atual
     */
    private Usuario conta(PerfilUsuario perfil) {
        Usuario conta = new Usuario("Teste", UUID.randomUUID() + "@example.test", "hash-ficticio", perfil);
        entidades.persist(conta);
        return conta;
    }

    /**
     * Executa a operação pública, com commit ou rollback do próprio serviço.
     *
     * @param c cenário persistido
     * @param destino estado solicitado
     * @param motivo justificativa opcional
     */
    private void mudar(Cenario c, EstadoEstudo destino, String motivo) {
        servico.alterarEstado(c.estudoId(), new AlteracaoEstadoEntrada(destino, motivo), c.identidade());
    }

    /**
     * Consulta em uma nova transação, sem reutilizar a entidade alterada em memória.
     *
     * @param c cenário persistido
     * @param estado estado esperado após o commit ou rollback
     * @param motivo justificativa esperada
     */
    private void conferirPersistido(Cenario c, EstadoEstudo estado, String motivo) {
        tx().executeWithoutResult(status -> {
            Estudo salvo = estudos.findById(c.estudoId()).orElseThrow();
            assertThat(salvo.getEstado()).isEqualTo(estado);
            assertThat(salvo.getJustificativaEncerramento()).isEqualTo(motivo);
        });
    }

    /** @return executor de uma transação independente para preparar ou conferir dados */
    private TransactionTemplate tx() {
        return new TransactionTemplate(transacoes);
    }

    /**
     * Aguarda a liberação do cenário sem permitir uma espera indefinida.
     *
     * @param sinal evento que permite concluir a transação
     */
    private void aguardar(CountDownLatch sinal) {
        try {
            if (!sinal.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("A transação de teste não foi liberada.");
            }
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Teste interrompido.", erro);
        }
    }

    /** Identificadores mínimos utilizados entre transações distintas. */
    private record Cenario(Long estudoId, Long coordenadorId, Long visitaId, UsuarioAutenticado identidade) { }
}
