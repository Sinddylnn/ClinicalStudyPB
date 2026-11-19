package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.estudos.repository.CorrecaoVisitaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.service.RetiradaParticipanteService;
import br.edu.uepb.clinicalstudypb.estudos.service.ParticipanteConsultaService;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.api.RetiradaEntrada;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.EntityManager;
import java.sql.DriverManager;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    @Autowired private VisitaAgendadaRepository visitasAgendadas;
    @Autowired private CorrecaoVisitaRepository correcoes;
    @Autowired private ResultadoAtividadeRepository resultados;
    @Autowired private ParticipacaoRepository participacoes;
    @Autowired private RetiradaParticipanteService retiradas;
    @Autowired private ParticipanteConsultaService consultasParticipante;

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
                for (String tabela : new String[]{"visitas_agendadas", "resultados_atividades", "correcoes_visitas"}) {
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
                SituacaoVisita.REALIZADA, "Correção validada", "Ausência registrada", null,
                coordenador, agora);
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
        assertThat(correcaoPersistida.getMotivoAnterior()).isEqualTo("Ausência registrada");
        assertThat(correcaoPersistida.getMotivoNovo()).isNull();
    }

    /**
     * Confere no PostgreSQL a contagem de visitas por estudo e situação.
     * Também verifica se a consulta de participantes não repete quem tem mais de uma pendência.
     *
     * @since 1.0
     */
    @Test
    void contaVisitasPendentesPorEstudoEIdentificaParticipantes() {
        Instant data = Instant.parse("2026-11-20T12:00:00Z");
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Usuario participante1 = conta(PerfilUsuario.PARTICIPANTE);
        Usuario participante2 = conta(PerfilUsuario.PARTICIPANTE);
        Usuario participanteOutroEstudo = conta(PerfilUsuario.PARTICIPANTE);

        Estudo estudo = new Estudo("Estudo com visitas pendentes", "Objetivo fictício",
                coordenador, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), 10);
        Estudo outroEstudo = new Estudo("Outro estudo", "Objetivo fictício",
                coordenador, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), 10);
        entidades.persist(estudo);
        entidades.persist(outroEstudo);

        Protocolo protocolo = new Protocolo(estudo, false);
        Protocolo outroProtocolo = new Protocolo(outroEstudo, false);
        entidades.persist(protocolo);
        entidades.persist(outroProtocolo);

        VisitaPrevista primeira = new VisitaPrevista(protocolo, "Primeira visita", null, 1);
        VisitaPrevista segunda = new VisitaPrevista(protocolo, "Segunda visita", null, 2);
        VisitaPrevista previstaOutroEstudo =
                new VisitaPrevista(outroProtocolo, "Visita externa", null, 1);
        entidades.persist(primeira);
        entidades.persist(segunda);
        entidades.persist(previstaOutroEstudo);

        Participacao primeiraParticipacao = new Participacao(estudo, participante1, data);
        Participacao segundaParticipacao = new Participacao(estudo, participante2, data);
        Participacao participacaoOutroEstudo =
                new Participacao(outroEstudo, participanteOutroEstudo, data);
        entidades.persist(primeiraParticipacao);
        entidades.persist(segundaParticipacao);
        entidades.persist(participacaoOutroEstudo);

        // Duas visitas pendentes para o primeiro participante, sem duplicar seu ID na lista.
        entidades.persist(new VisitaAgendada(primeiraParticipacao, primeira, data));
        entidades.persist(new VisitaAgendada(primeiraParticipacao, segunda, data.plusSeconds(3600)));
        entidades.persist(new VisitaAgendada(segundaParticipacao, primeira, data));

        VisitaAgendada finalizada = new VisitaAgendada(
                segundaParticipacao, segunda, data.plusSeconds(3600));
        finalizada.registrarSituacao(SituacaoVisita.CANCELADA,
                "Cancelamento solicitado", coordenador, data);
        entidades.persist(finalizada);
        entidades.persist(new VisitaAgendada(
                participacaoOutroEstudo, previstaOutroEstudo, data));
        entidades.flush();
        entidades.clear();

        assertThat(visitasAgendadas.countByParticipacao_Estudo_IdAndSituacao(
                estudo.getId(), SituacaoVisita.AGENDADA)).isEqualTo(3L);
        assertThat(visitasAgendadas.countByParticipacao_Estudo_IdAndSituacao(
                estudo.getId(), SituacaoVisita.CANCELADA)).isEqualTo(1L);
        assertThat(visitasAgendadas.countByParticipacao_Estudo_IdAndSituacao(
                outroEstudo.getId(), SituacaoVisita.AGENDADA)).isEqualTo(1L);
        assertThat(visitasAgendadas.countByParticipacao_Estudo_IdAndSituacao(
                outroEstudo.getId(), SituacaoVisita.CANCELADA)).isZero();

        assertThat(visitasAgendadas.findIdsParticipantesComVisitasNaSituacao(
                estudo.getId(), SituacaoVisita.AGENDADA))
                .containsExactlyInAnyOrder(participante1.getId(), participante2.getId());
        assertThat(visitasAgendadas.findIdsParticipantesComVisitasNaSituacao(
                outroEstudo.getId(), SituacaoVisita.AGENDADA))
                .containsExactly(participanteOutroEstudo.getId());
    }

    // <-------------------RETIRADA COM CANCELAMENTO DAS PENDENTES------------------->

    /**
     * Registra a retirada no PostgreSQL e confere que somente visitas AGENDADA são canceladas.
     *
     * @since 1.1
     */
    @Test
    void retiradaCancelaSomenteVisitasAgendadasEPreservaHistorico() {
        Instant agora = Instant.now();
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Estudo estudo = new Estudo("Estudo de retirada", "Objetivo fictício", coordenador,
                LocalDate.now().minusDays(5), LocalDate.now().plusDays(60), 10);
        estudo.atribuirCoordenador(coordenador);
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        entidades.persist(estudo);

        Protocolo protocolo = new Protocolo(estudo, false);
        entidades.persist(protocolo);
        VisitaPrevista primeira = new VisitaPrevista(protocolo, "Primeira", null, 1);
        VisitaPrevista segunda = new VisitaPrevista(protocolo, "Segunda", null, 2);
        entidades.persist(primeira);
        entidades.persist(segunda);

        Participacao participacao = new Participacao(estudo, participante, agora);
        entidades.persist(participacao);

        VisitaAgendada realizada = new VisitaAgendada(
                participacao, primeira, agora.minusSeconds(86_400));
        realizada.registrarSituacao(
                SituacaoVisita.REALIZADA, null, coordenador, agora);
        VisitaAgendada pendente1 = new VisitaAgendada(
                participacao, segunda, agora.plusSeconds(86_400));
        VisitaAgendada pendente2 = new VisitaAgendada(
                participacao, primeira, agora.plusSeconds(172_800));
        entidades.persist(realizada);
        entidades.persist(pendente1);
        entidades.persist(pendente2);
        entidades.flush();
        entidades.clear();

        var resposta = retiradas.registrar(
                estudo.getId(),
                participacao.getId(),
                new RetiradaEntrada("Desistência"),
                new UsuarioAutenticado(coordenador));
        entidades.flush();
        entidades.clear();

        assertThat(resposta.situacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
        Participacao persistida = entidades.find(Participacao.class, participacao.getId());
        assertThat(persistida.getSituacao()).isEqualTo(SituacaoParticipacao.RETIRADA);
        assertThat(persistida.getMotivoRetirada()).isEqualTo("Desistência");
        assertThat(persistida.getRetiradaPor().getId()).isEqualTo(coordenador.getId());

        assertThat(entidades.find(VisitaAgendada.class, pendente1.getId()).getSituacao())
                .isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(entidades.find(VisitaAgendada.class, pendente2.getId()).getSituacao())
                .isEqualTo(SituacaoVisita.CANCELADA);
        assertThat(entidades.find(VisitaAgendada.class, realizada.getId()).getSituacao())
                .isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(participacoes.countByEstudoId(estudo.getId())).isEqualTo(1L);

        // O app remove visitas pendentes das próximas e as inclui no histórico como canceladas
        UsuarioAutenticado app = new UsuarioAutenticado(participante);
        assertThat(consultasParticipante.listarProximasVisitas(null, app)).isEmpty();
        assertThat(consultasParticipante.listarHistorico(null, app)).hasSize(3);
    }

    // <-------------------CONSULTAS DO PARTICIPANTE------------------->

    /**
     * Confere no PostgreSQL o filtro por conta, situação, ordenação e data de corte.
     *
     * @since 1.2
     */
    @Test
    void consultasDoParticipanteFiltramPorContaSituacaoEData() {
        Instant agora = Instant.now();
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);
        Usuario outroParticipante = conta(PerfilUsuario.PARTICIPANTE);

        Estudo estudo = new Estudo("Estudo do app", "Objetivo fictício", coordenador,
                LocalDate.now().minusDays(10), LocalDate.now().plusDays(60), 10);
        Estudo estudoSemVinculo = new Estudo("Estudo sem vínculo", "Objetivo fictício", coordenador,
                LocalDate.now().minusDays(10), LocalDate.now().plusDays(60), 10);
        entidades.persist(estudo);
        entidades.persist(estudoSemVinculo);

        Protocolo protocolo = new Protocolo(estudo, false);
        entidades.persist(protocolo);
        VisitaPrevista primeira = new VisitaPrevista(protocolo, "Primeira", null, 1);
        VisitaPrevista segunda = new VisitaPrevista(protocolo, "Segunda", null, 2);
        VisitaPrevista terceira = new VisitaPrevista(protocolo, "Terceira", null, 3);
        entidades.persist(primeira);
        entidades.persist(segunda);
        entidades.persist(terceira);

        Participacao minha = new Participacao(estudo, participante, agora);
        Participacao deOutro = new Participacao(estudo, outroParticipante, agora);
        entidades.persist(minha);
        entidades.persist(deOutro);

        VisitaAgendada futura = new VisitaAgendada(
                minha, primeira, agora.plus(2, ChronoUnit.DAYS));
        VisitaAgendada agendadaVencida = new VisitaAgendada(
                minha, segunda, agora.minus(2, ChronoUnit.DAYS));
        VisitaAgendada realizada = new VisitaAgendada(
                minha, primeira, agora.minus(4, ChronoUnit.DAYS));
        realizada.registrarSituacao(SituacaoVisita.REALIZADA, null, coordenador, agora);
        VisitaAgendada ausente = new VisitaAgendada(
                minha, segunda, agora.minus(3, ChronoUnit.DAYS));
        ausente.registrarSituacao(SituacaoVisita.AUSENTE, "Motivo interno", coordenador, agora);
        VisitaAgendada cancelada = new VisitaAgendada(
                minha, terceira, agora.minus(1, ChronoUnit.DAYS));
        cancelada.registrarSituacao(SituacaoVisita.CANCELADA, "Motivo interno", coordenador, agora);
        VisitaAgendada visitaDeOutro = new VisitaAgendada(
                deOutro, primeira, agora.plus(3, ChronoUnit.DAYS));
        for (VisitaAgendada visita : new VisitaAgendada[]{
                futura, agendadaVencida, realizada, ausente, cancelada, visitaDeOutro}) {
            entidades.persist(visita);
        }
        entidades.flush();
        entidades.clear();

        UsuarioAutenticado autenticado = new UsuarioAutenticado(participante);

        assertThat(consultasParticipante.listarEstudos(autenticado))
                .extracting(resposta -> resposta.estudoId())
                .containsExactly(estudo.getId());
        assertThat(consultasParticipante.listarProximasVisitas(null, autenticado))
                .extracting(resposta -> resposta.visitaAgendadaId())
                .containsExactly(futura.getId());
        assertThat(consultasParticipante.listarHistorico(null, autenticado))
                .extracting(resposta -> resposta.visitaAgendadaId())
                .containsExactly(cancelada.getId(), ausente.getId(), realizada.getId());
        assertThat(consultasParticipante.listarHistorico(estudo.getId(), autenticado))
                .extracting(resposta -> resposta.situacao())
                .containsExactly(
                        SituacaoVisita.CANCELADA,
                        SituacaoVisita.AUSENTE,
                        SituacaoVisita.REALIZADA);
        assertThatThrownBy(() ->
                consultasParticipante.listarHistorico(estudoSemVinculo.getId(), autenticado))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    // <-------------------CONSULTAS DE HISTÓRICO COMPLETO RF15------------------->

    /**
     * Confere no PostgreSQL a ordem das visitas e o carregamento da visita prevista
     * na mesma consulta, evitando buscas adicionais durante a montagem do histórico.
     *
     * @since 1.0
     */
    @Test
    void consultaVisitasDoHistoricoCarregaVisitasPrevistasSemNMaisUm() {
        Instant inicio = Instant.parse("2026-11-15T12:00:00Z");
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);
        Usuario outroParticipante = conta(PerfilUsuario.PARTICIPANTE);

        Estudo estudo = new Estudo("Estudo das visitas do histórico", "Objetivo fictício", coordenador,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), 10);
        entidades.persist(estudo);

        Protocolo protocolo = new Protocolo(estudo, false);
        entidades.persist(protocolo);
        VisitaPrevista prevista1 = new VisitaPrevista(protocolo, "Visita inicial", null, 1);
        VisitaPrevista prevista2 = new VisitaPrevista(protocolo, "Visita intermediária", null, 2);
        VisitaPrevista prevista3 = new VisitaPrevista(protocolo, "Visita final", null, 3);
        entidades.persist(prevista1);
        entidades.persist(prevista2);
        entidades.persist(prevista3);

        Participacao participacao = new Participacao(estudo, participante, inicio);
        Participacao outraParticipacao = new Participacao(estudo, outroParticipante, inicio);
        entidades.persist(participacao);
        entidades.persist(outraParticipacao);

        VisitaAgendada segunda = new VisitaAgendada(participacao, prevista2, inicio);
        VisitaAgendada primeira = new VisitaAgendada(participacao, prevista1, inicio);
        VisitaAgendada terceira = new VisitaAgendada(participacao, prevista3, inicio.plusSeconds(3600));
        VisitaAgendada externa = new VisitaAgendada(outraParticipacao, prevista1, inicio);
        entidades.persist(segunda);
        entidades.persist(primeira);
        entidades.persist(terceira);
        entidades.persist(externa);
        entidades.flush();
        entidades.clear();

        var encontradas = visitasAgendadas.findByParticipacao_IdOrderByDataHoraAsc(participacao.getId());
        assertThat(encontradas)
                .extracting(VisitaAgendada::getId)
                .containsExactly(segunda.getId(), primeira.getId(), terceira.getId());

        // A associação deve estar carregada antes de qualquer acesso ao nome.
        var utilPersistencia = entidades.getEntityManagerFactory().getPersistenceUnitUtil();
        assertThat(encontradas)
                .allSatisfy(visita -> assertThat(utilPersistencia.isLoaded(visita, "visitaPrevista")).isTrue());
        assertThat(encontradas)
                .extracting(visita -> visita.getVisitaPrevista().getNome())
                .containsExactly("Visita intermediária", "Visita inicial", "Visita final");

        assertThat(visitasAgendadas.findByParticipacao_IdOrderByDataHoraAsc(outraParticipacao.getId()))
                .extracting(VisitaAgendada::getId)
                .containsExactly(externa.getId());
        assertThat(visitasAgendadas.findByParticipacao_IdOrderByDataHoraAsc(-1L)).isEmpty();
    }

    /**
     * Confere o filtro por participação e a ordem das correções e dos resultados.
     *
     * @since 1.0
     */
    @Test
    void consultasDoHistoricoFiltramParticipacaoEOrdenamRegistros() {
        Instant inicio = Instant.parse("2026-11-15T12:00:00Z");
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        Usuario participante = conta(PerfilUsuario.PARTICIPANTE);
        Usuario outroParticipante = conta(PerfilUsuario.PARTICIPANTE);

        Estudo estudo = new Estudo("Estudo do histórico", "Objetivo fictício", coordenador,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), 10);
        entidades.persist(estudo);
        Protocolo protocolo = new Protocolo(estudo, false);
        entidades.persist(protocolo);
        VisitaPrevista prevista = new VisitaPrevista(protocolo, "Avaliação geral", null, 1);
        entidades.persist(prevista);
        AtividadePrevista atividadeA = new AtividadePrevista(prevista, "Avaliação A");
        AtividadePrevista atividadeB = new AtividadePrevista(prevista, "Avaliação B");
        entidades.persist(atividadeA);
        entidades.persist(atividadeB);

        Participacao participacao = new Participacao(estudo, participante, inicio);
        Participacao outraParticipacao = new Participacao(estudo, outroParticipante, inicio);
        entidades.persist(participacao);
        entidades.persist(outraParticipacao);

        VisitaAgendada primeira = new VisitaAgendada(participacao, prevista, inicio);
        VisitaAgendada segunda = new VisitaAgendada(participacao, prevista, inicio.plusSeconds(86_400));
        VisitaAgendada externa = new VisitaAgendada(outraParticipacao, prevista, inicio);
        primeira.registrarSituacao(SituacaoVisita.REALIZADA, null, coordenador, inicio.plusSeconds(600));
        segunda.registrarSituacao(SituacaoVisita.REALIZADA, null, coordenador, inicio.plusSeconds(86_500));
        externa.registrarSituacao(SituacaoVisita.REALIZADA, null, coordenador, inicio.plusSeconds(600));
        entidades.persist(primeira);
        entidades.persist(segunda);
        entidades.persist(externa);

        // Grava os resultados em ordem diferente da atividade para conferir o ORDER BY.
        ResultadoAtividade resultadoB = new ResultadoAtividade(
                primeira, atividadeB, "Resultado B", coordenador, inicio.plusSeconds(650));
        ResultadoAtividade resultadoA = new ResultadoAtividade(
                primeira, atividadeA, "Resultado A", coordenador, inicio.plusSeconds(660));
        ResultadoAtividade resultadoSegunda = new ResultadoAtividade(
                segunda, atividadeA, "Resultado segunda", coordenador, inicio.plusSeconds(86_600));
        ResultadoAtividade resultadoExterno = new ResultadoAtividade(
                externa, atividadeA, "Resultado externo", coordenador, inicio.plusSeconds(700));
        entidades.persist(resultadoB);
        entidades.persist(resultadoA);
        entidades.persist(resultadoSegunda);
        entidades.persist(resultadoExterno);

        // Grava as correções fora da ordem temporal para testar a ordenação por data.
        CorrecaoVisita posterior = new CorrecaoVisita(
                primeira, SituacaoVisita.CANCELADA, SituacaoVisita.REALIZADA,
                "Revisão do cancelamento", "Cancelamento incorreto", null,
                coordenador, inicio.plusSeconds(500));
        CorrecaoVisita anterior = new CorrecaoVisita(
                primeira, SituacaoVisita.AUSENTE, SituacaoVisita.CANCELADA,
                "Revisão da ausência", null, "Cancelamento incorreto",
                coordenador, inicio.plusSeconds(300));
        CorrecaoVisita correcaoExterna = new CorrecaoVisita(
                externa, SituacaoVisita.AUSENTE, SituacaoVisita.REALIZADA,
                "Revisão externa", null, null,
                coordenador, inicio.plusSeconds(400));
        entidades.persist(posterior);
        entidades.persist(anterior);
        entidades.persist(correcaoExterna);
        entidades.flush();
        entidades.clear();

        var correcoesEncontradas = correcoes.buscarCorrecoesDaParticipacao(participacao.getId());
        assertThat(correcoesEncontradas)
                .extracting(CorrecaoVisita::getId)
                .containsExactly(anterior.getId(), posterior.getId());
        assertThat(correcoesEncontradas.get(0).getCorrigidaPor().getId())
                .isEqualTo(coordenador.getId());
        assertThat(correcoes.buscarCorrecoesDaParticipacao(outraParticipacao.getId()))
                .extracting(CorrecaoVisita::getId)
                .containsExactly(correcaoExterna.getId());

        var resultadosEncontrados = resultados.buscarResultadosDaParticipacao(participacao.getId());
        assertThat(resultadosEncontrados)
                .extracting(ResultadoAtividade::getId)
                .containsExactly(resultadoA.getId(), resultadoB.getId(), resultadoSegunda.getId());
        assertThat(resultadosEncontrados.get(0).getAtividadePrevista().getDescricao())
                .isEqualTo("Avaliação A");
        assertThat(resultados.buscarResultadosDaParticipacao(outraParticipacao.getId()))
                .extracting(ResultadoAtividade::getId)
                .containsExactly(resultadoExterno.getId());
        assertThat(correcoes.buscarCorrecoesDaParticipacao(-1L)).isEmpty();
        assertThat(resultados.buscarResultadosDaParticipacao(-1L)).isEmpty();
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
