
package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import br.edu.uepb.clinicalstudypb.estudos.repository.CriterioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.api.AvaliacaoElegibilidadeEntrada;
import br.edu.uepb.clinicalstudypb.recrutamento.api.RespostaCriterioEntrada;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.AvaliacaoElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.RespostaElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.service.AvaliacaoElegibilidadeService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

// <-------------------PERSISTENCIA DE ELEGIBILIDADE------------------->
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(
        named = "CLINICALSTUDYPB_TEST_DB_URL",
        matches = ".+"
)
class AvaliacaoElegibilidadePersistenciaIT {

    @Autowired
    private EstudoRepository estudos;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private ProtocoloRepository protocolos;

    @Autowired
    private CriterioRepository criterios;

    @Autowired
    private CandidatoRepository candidatos;

    @Autowired
    private AvaliacaoElegibilidadeRepository avaliacoes;

    @Autowired
    private RespostaElegibilidadeRepository respostas;

    @Autowired
    private AvaliacaoElegibilidadeService servico;

    @Autowired
    private EntityManager entidades;

    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add(
                "spring.datasource.url",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL")
        );

        propriedades.add(
                "spring.datasource.username",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER")
        );

        propriedades.add(
                "spring.datasource.password",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD")
        );
    }

    // <-------------------TESTE DE PERSISTENCIA------------------->

    @Test
    void salvaAtualizaEConsultaAvaliacaoNoPostgresql() {

        // Usa dados ficticios do banco de testes.
        Estudo estudo = estudos.findById(1L).orElseThrow();

        Usuario coordenador = usuarios.findAll().stream()
                .filter(u -> u.getPerfil() == PerfilUsuario.COORDENADOR)
                .findFirst()
                .orElseThrow();

        // Prepara o estudo para o cenario de recrutamento.
        ReflectionTestUtils.setField(
                estudo, "coordenador", coordenador
        );

        ReflectionTestUtils.setField(
                estudo, "estado", EstadoEstudo.RECRUTAMENTO
        );

        estudos.saveAndFlush(estudo);

        // Aproveita o protocolo existente ou cria um.
        Protocolo protocolo = protocolos.findByEstudoId(estudo.getId())
                .orElseGet(() -> protocolos.saveAndFlush(
                        new Protocolo(estudo, false)
                ));

        Criterio inclusao = criterios.saveAndFlush(
                new Criterio(
                        protocolo,
                        TipoCriterio.INCLUSAO,
                        "Ter disponibilidade para as visitas."
                )
        );

        criterios.saveAndFlush(
                new Criterio(
                        protocolo,
                        TipoCriterio.EXCLUSAO,
                        "Participar de outro estudo."
                )
        );

        String email = "avaliacao-"
                + UUID.randomUUID()
                + "@example.test";

        Candidato candidato = candidatos.saveAndFlush(
                new Candidato(estudo, "Maria Silva", email)
        );

        Long candidatoId = candidato.getId();
        Long estudoId = estudo.getId();

        UsuarioAutenticado autenticado =
                new UsuarioAutenticado(coordenador);

        // <-------------------AVALIACAO INCOMPLETA------------------->

        var parcial = servico.salvar(
                estudoId,
                candidatoId,
                new AvaliacaoElegibilidadeEntrada(List.of(
                        new RespostaCriterioEntrada(
                                inclusao.getId(),
                                RespostaCriterio.ATENDIDO
                        )
                )),
                autenticado
        );

        assertThat(parcial.situacao())
                .isEqualTo(SituacaoElegibilidade.INCOMPLETA);

        entidades.flush();
        entidades.clear();

        assertThat(avaliacoes.findByCandidatoId(candidatoId))
                .isPresent();

        // <-------------------AVALIACAO COMPLETA------------------->

        List<Criterio> todos = criterios
                .findByProtocoloIdOrderByIdAsc(protocolo.getId());

        List<RespostaCriterioEntrada> marcacoes = todos.stream()
                .map(criterio -> new RespostaCriterioEntrada(
                        criterio.getId(),
                        criterio.getTipo() == TipoCriterio.INCLUSAO
                                ? RespostaCriterio.ATENDIDO
                                : RespostaCriterio.AUSENTE
                ))
                .toList();

        var completa = servico.salvar(
                estudoId,
                candidatoId,
                new AvaliacaoElegibilidadeEntrada(marcacoes),
                autenticado
        );

        assertThat(completa.situacao())
                .isEqualTo(SituacaoElegibilidade.ELEGIVEL);

        entidades.flush();
        entidades.clear();

        Candidato encontrado = candidatos.findById(candidatoId)
                .orElseThrow();

        assertThat(encontrado.getElegibilidade())
                .isEqualTo(SituacaoElegibilidade.ELEGIVEL);

        AvaliacaoElegibilidade avaliacao = avaliacoes
                .findByCandidatoId(candidatoId)
                .orElseThrow();

        Long avaliacaoId = avaliacao.getId();

        assertThat(respostas.findByAvaliacaoId(avaliacaoId))
                .hasSize(todos.size());

        // <-------------------ATUALIZAR AVALIACAO------------------->

        List<RespostaCriterioEntrada> alteradas = todos.stream()
                .map(criterio -> new RespostaCriterioEntrada(
                        criterio.getId(),
                        criterio.getId().equals(inclusao.getId())
                                ? RespostaCriterio.NAO_ATENDIDO
                                : criterio.getTipo() == TipoCriterio.INCLUSAO
                                        ? RespostaCriterio.ATENDIDO
                                        : RespostaCriterio.AUSENTE
                ))
                .toList();

        var atualizada = servico.salvar(
                estudoId,
                candidatoId,
                new AvaliacaoElegibilidadeEntrada(alteradas),
                autenticado
        );

        assertThat(atualizada.situacao())
                .isEqualTo(SituacaoElegibilidade.INELEGIVEL);

        entidades.flush();
        entidades.clear();

        // Confere se os dados foram realmente atualizados.
        assertThat(candidatos.findById(candidatoId)
                .orElseThrow()
                .getElegibilidade())
                .isEqualTo(SituacaoElegibilidade.INELEGIVEL);

        assertThat(avaliacoes.findByCandidatoId(candidatoId)
                .orElseThrow()
                .getId())
                .isEqualTo(avaliacaoId);

        assertThat(respostas.findByAvaliacaoId(avaliacaoId))
                .hasSize(todos.size());

        assertThat(respostas.findByAvaliacaoIdAndCriterioId(
                avaliacaoId, inclusao.getId()
        ).orElseThrow().getResposta())
                .isEqualTo(RespostaCriterio.NAO_ATENDIDO);

        // Confere a consulta pelo servico.
        var consulta = servico.obter(
                estudoId, candidatoId, autenticado
        );

        assertThat(consulta.situacao())
                .isEqualTo(SituacaoElegibilidade.INELEGIVEL);

        assertThat(consulta.avaliadoPor())
                .isEqualTo(coordenador.getNome());

        assertThat(consulta.avaliadoEm()).isNotNull();
    }

    // <-------------------HISTÓRICO DO PARTICIPANTE------------------->

    @Autowired
    private br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository participacoes;

    @Autowired
    private org.springframework.transaction.PlatformTransactionManager transacoes;

    /** Impede sobrescrever respostas e metadados após uma inclusão já confirmada. */
    @Test
    @org.springframework.transaction.annotation.Transactional(
            propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void preservaAvaliacaoPersistidaAposInclusao() {
        var tx = new org.springframework.transaction.support.TransactionTemplate(transacoes);
        Long[] ids = tx.execute(status -> {
            String email = UUID.randomUUID() + "@example.test";
            Usuario pesquisador = usuarios.save(new Usuario("Pesquisador", UUID.randomUUID() + "@example.test",
                    "hash", PerfilUsuario.PESQUISADOR));
            Usuario coordenador = usuarios.save(new Usuario("Coordenador", UUID.randomUUID() + "@example.test",
                    "hash", PerfilUsuario.COORDENADOR));
            Usuario participante = usuarios.save(new Usuario("Participante", email, "hash", PerfilUsuario.PARTICIPANTE));
            Estudo estudo = new Estudo("Histórico", "Objetivo", pesquisador,
                    java.time.LocalDate.now(), java.time.LocalDate.now(), 5);
            estudo.atribuirCoordenador(coordenador);
            ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.RECRUTAMENTO);
            estudos.save(estudo);
            Protocolo protocolo = protocolos.save(new Protocolo(estudo, true));
            Criterio criterio = criterios.save(new Criterio(protocolo, TipoCriterio.INCLUSAO, "Inclusão"));
            Candidato candidato = candidatos.save(new Candidato(estudo, "Candidato", email));
            return new Long[]{estudo.getId(), candidato.getId(), criterio.getId(), coordenador.getId(), participante.getId()};
        });
        UsuarioAutenticado autor = tx.execute(status -> new UsuarioAutenticado(usuarios.findById(ids[3]).orElseThrow()));
        servico.salvar(ids[0], ids[1], new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(ids[2], RespostaCriterio.ATENDIDO))), autor);
        var antes = servico.obter(ids[0], ids[1], autor);
        tx.executeWithoutResult(status -> participacoes.save(
                new br.edu.uepb.clinicalstudypb.estudos.Participacao(
                        candidatos.findById(ids[1]).orElseThrow(), usuarios.findById(ids[4]).orElseThrow(),
                        java.time.Instant.now())));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> servico.salvar(ids[0], ids[1],
                new AvaliacaoElegibilidadeEntrada(List.of(
                        new RespostaCriterioEntrada(ids[2], RespostaCriterio.NAO_ATENDIDO))), autor))
                .isInstanceOf(br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException.class)
                .hasMessageContaining("já incluído");
        // A consulta em outra transação comprova a preservação após o rollback
        var depois = servico.obter(ids[0], ids[1], autor);
        assertThat(depois.situacao()).isEqualTo(SituacaoElegibilidade.ELEGIVEL);
        assertThat(depois.itens()).isEqualTo(antes.itens());
        assertThat(depois.avaliadoPor()).isEqualTo(antes.avaliadoPor());
        assertThat(depois.avaliadoEm()).isEqualTo(antes.avaliadoEm());
    }

    /** Aplica V9 sobre inclusões legadas sem apagar registros ou inventar candidatos. */
    @Test
    void migraV8PreservandoInclusoesLegadas() throws Exception {
        String url = System.getenv("CLINICALSTUDYPB_TEST_DB_URL");
        String usuario = System.getenv("CLINICALSTUDYPB_TEST_DB_USER");
        String senha = System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD");
        String schema = "teste_candidato_" + UUID.randomUUID().toString().replace("-", "");
        try (var conexao = java.sql.DriverManager.getConnection(url, usuario, senha);
                var sql = conexao.createStatement()) {
            try {
                org.flywaydb.core.Flyway.configure().dataSource(url, usuario, senha)
                        .schemas(schema).defaultSchema(schema).target("8").load().migrate();
                sql.execute("SET search_path TO " + schema);
                sql.execute("INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES "
                        + "('Com candidato', 'LEGADO@example.test', 'hash', 'PARTICIPANTE'), "
                        + "('Sem candidato', 'sem-candidato@example.test', 'hash', 'PARTICIPANTE')");
                sql.execute("INSERT INTO candidatos (estudo_id, nome, email) "
                        + "VALUES (1, 'Legado', 'legado@example.test')");
                sql.execute("INSERT INTO participacoes (estudo_id, participante_id, data_inclusao) "
                        + "SELECT 1, id, CURRENT_TIMESTAMP FROM usuarios "
                        + "WHERE email IN ('LEGADO@example.test', 'sem-candidato@example.test')");
                org.flywaydb.core.Flyway.configure().dataSource(url, usuario, senha)
                        .schemas(schema).defaultSchema(schema).load().migrate();
                try (var dados = sql.executeQuery("SELECT COUNT(*), COUNT(candidato_id) FROM participacoes")) {
                    dados.next();
                    assertThat(dados.getLong(1)).isEqualTo(2);
                    assertThat(dados.getLong(2)).isEqualTo(1);
                }
                try (var dados = sql.executeQuery("SELECT COUNT(*) FROM participacoes p JOIN candidatos c "
                        + "ON c.id = p.candidato_id WHERE c.email = 'legado@example.test' AND c.estudo_id = p.estudo_id")) {
                    dados.next();
                    assertThat(dados.getLong(1)).isEqualTo(1);
                }
            } finally {
                sql.execute("SET search_path TO public");
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }
}
