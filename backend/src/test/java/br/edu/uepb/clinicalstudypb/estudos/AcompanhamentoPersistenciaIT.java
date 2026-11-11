package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.EntityManager;
import java.sql.DriverManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

// <-------------------PERSISTÊNCIA DO ACOMPANHAMENTO EM POSTGRESQL------------------->
/**
 * Confere o mapeamento JPA e as migrações do acompanhamento em PostgreSQL exclusivo de testes.
 *
 * <p>Executar com as variáveis {@code CLINICALSTUDYPB_TEST_DB_URL},
 * {@code CLINICALSTUDYPB_TEST_DB_USER} e {@code CLINICALSTUDYPB_TEST_DB_PASSWORD}.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 11/11/2026
 */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class AcompanhamentoPersistenciaIT {

    @Autowired private EntityManager entidades;

    /**
     * Configura o banco explicitamente destinado aos testes de persistência.
     *
     * @param propriedades propriedades do contexto Spring
     * @since 1.0
     */
    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add("spring.datasource.url", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
    }

    // <-------------------MIGRAÇÃO EM BANCO LIMPO------------------->

    /**
     * Executa todas as migrações desde a V1 em um schema isolado e descartável.
     *
     * @throws Exception se a conexão ou alguma migração falhar
     * @since 1.0
     */
    @Test
    void migraBancoLimpoAteV11() throws Exception {
        String url = System.getenv("CLINICALSTUDYPB_TEST_DB_URL");
        String usuario = System.getenv("CLINICALSTUDYPB_TEST_DB_USER");
        String senha = System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD");
        String schema = "teste_acompanhamento_" + UUID.randomUUID().toString().replace("-", "");

        try (var conexao = DriverManager.getConnection(url, usuario, senha);
                var sql = conexao.createStatement()) {
            try {
                Flyway.configure().dataSource(url, usuario, senha).schemas(schema).defaultSchema(schema)
                        .target("10").load().migrate();
                sql.execute("SET search_path TO " + schema);
                int inclusoes = sql.executeUpdate("""
                        INSERT INTO participacoes (estudo_id, participante_id, data_inclusao)
                        SELECT e.id, u.id, CURRENT_TIMESTAMP
                        FROM estudos e
                        CROSS JOIN usuarios u
                        WHERE e.titulo = 'Estudo de Acompanhamento Cardiovascular'
                          AND u.email = 'participante@clinicalstudypb.test'
                        """);
                assertThat(inclusoes).isEqualTo(1);

                Flyway.configure().dataSource(url, usuario, senha).schemas(schema).defaultSchema(schema)
                        .load().migrate();
                sql.execute("SET search_path TO " + schema);

                try (var versao = sql.executeQuery("""
                        SELECT version
                        FROM flyway_schema_history
                        WHERE success = TRUE
                        ORDER BY installed_rank DESC
                        LIMIT 1
                        """)) {
                    assertThat(versao.next()).isTrue();
                    assertThat(versao.getString("version")).isEqualTo("11");
                }
                try (var participacoes = sql.executeQuery("""
                        SELECT situacao, data_retirada, motivo_retirada, retirada_por_id
                        FROM participacoes
                        """)) {
                    assertThat(participacoes.next()).isTrue();
                    assertThat(participacoes.getString("situacao")).isEqualTo("ATIVA");
                    assertThat(participacoes.getObject("data_retirada")).isNull();
                    assertThat(participacoes.getString("motivo_retirada")).isNull();
                    assertThat(participacoes.getObject("retirada_por_id")).isNull();
                    assertThat(participacoes.next()).isFalse();
                }
                try (var colunas = sql.executeQuery("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = 'participacoes'
                          AND column_name IN ('situacao', 'data_retirada', 'motivo_retirada', 'retirada_por_id')
                        """)) {
                    var nomes = new java.util.ArrayList<String>();
                    while (colunas.next()) {
                        nomes.add(colunas.getString("column_name"));
                    }
                    assertThat(nomes).containsExactlyInAnyOrder(
                            "situacao", "data_retirada", "motivo_retirada", "retirada_por_id");
                }
                for (String tabela : new String[]{"visita_agendada", "resultado_atividade", "correcao_visita"}) {
                    try (var existe = sql.executeQuery("""
                            SELECT EXISTS (
                                SELECT 1 FROM information_schema.tables
                                WHERE table_schema = current_schema() AND table_name = '%s'
                            )
                            """.formatted(tabela))) {
                        assertThat(existe.next()).isTrue();
                        assertThat(existe.getBoolean(1)).isTrue();
                    }
                }
            } finally {
                sql.execute("SET search_path TO public");
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    // <-------------------PERSISTÊNCIA DAS ENTIDADES------------------->

    /**
     * Persiste visita, resultado, correção e retirada com seus vínculos e dados de auditoria.
     *
     * @since 1.0
     */
    @Test
    void persisteVisitaResultadoCorrecaoERetirada() {
        Instant agora = Instant.parse("2026-11-11T12:00:00Z");
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Estudo estudo = new Estudo("Estudo de acompanhamento", "Objetivo fictício", coordenador,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 1), 10);
        estudo.atribuirCoordenador(coordenador);
        Protocolo protocolo = new Protocolo(estudo, false);
        VisitaPrevista prevista = new VisitaPrevista(protocolo, "Visita inicial", null, 1);
        AtividadePrevista atividade = new AtividadePrevista(prevista, "Avaliação fictícia");
        Participacao participacao = new Participacao(estudo, participante, agora);

        entidades.persist(estudo);
        entidades.persist(protocolo);
        entidades.persist(prevista);
        entidades.persist(atividade);
        entidades.persist(participacao);
        entidades.flush();

        VisitaAgendada visita = new VisitaAgendada(participacao, prevista, agora);
        visita.registrarSituacao(SituacaoVisita.AUSENTE, "Ausência registrada", coordenador, agora);
        entidades.persist(visita);
        CorrecaoVisita correcao = new CorrecaoVisita(visita, SituacaoVisita.AUSENTE,
                SituacaoVisita.REALIZADA, "Correção validada", coordenador, agora);
        visita.registrarSituacao(SituacaoVisita.REALIZADA, null, coordenador, agora);
        entidades.persist(correcao);

        ResultadoAtividade resultado = new ResultadoAtividade(
                visita, atividade, "Resultado fictício", coordenador, agora);
        entidades.persist(resultado);
        resultado.atualizar("Resultado fictício atualizado", coordenador, agora.plusSeconds(60));
        participacao.registrarRetirada("Retirada solicitada", agora.plusSeconds(120), coordenador);
        entidades.flush();
        entidades.clear();

        Participacao persistida = entidades.find(Participacao.class, participacao.getId());
        VisitaAgendada visitaPersistida = entidades.find(VisitaAgendada.class, visita.getId());
        ResultadoAtividade resultadoPersistido = entidades.find(ResultadoAtividade.class, resultado.getId());
        CorrecaoVisita correcaoPersistida = entidades.find(CorrecaoVisita.class, correcao.getId());

        assertThat(persistida.getSituacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
        assertThat(persistida.getMotivoRetirada()).isEqualTo("Retirada solicitada");
        assertThat(persistida.getDataRetirada()).isEqualTo(agora.plusSeconds(120));
        assertThat(persistida.getRetiradaPor().getId()).isEqualTo(coordenador.getId());
        assertThat(visitaPersistida.getSituacao()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(resultadoPersistido.getTexto()).isEqualTo("Resultado fictício atualizado");
        assertThat(resultadoPersistido.getAtualizadoEm()).isEqualTo(agora.plusSeconds(60));
        assertThat(correcaoPersistida.getSituacaoAnterior()).isEqualTo(SituacaoVisita.AUSENTE);
        assertThat(correcaoPersistida.getSituacaoNova()).isEqualTo(SituacaoVisita.REALIZADA);
    }

    /**
     * Cria uma conta de teste com endereço exclusivo.
     *
     * @param perfil perfil da conta
     * @return usuário persistido
     * @since 1.0
     */
    private Usuario conta(PerfilUsuario perfil) {
        String identificador = UUID.randomUUID().toString();
        Usuario conta = new Usuario("Teste " + perfil, identificador + "@example.test", "hash-ficticio", perfil);
        entidades.persist(conta);
        return conta;
    }
}
