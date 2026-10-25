package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.service.EstudoService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.api.UsuarioEdicaoEntrada;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.UsuarioService;
import jakarta.persistence.EntityManager;
import java.sql.DriverManager;
import java.time.LocalDate;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// <-------------------PERSISTÊNCIA REAL EM BANCO EXCLUSIVO DE TESTES------------------->
/**
 * Confere migrações, consultas JPA e vínculos usando PostgreSQL real.
 *
 * <p>Executar explicitamente com {@code -Dtest=EstudoPersistenciaIT test} e as
 * variáveis {@code CLINICALSTUDYPB_TEST_DB_URL}, {@code CLINICALSTUDYPB_TEST_DB_USER}
 * e {@code CLINICALSTUDYPB_TEST_DB_PASSWORD}. O banco deve ser exclusivo de testes.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 25/10/2026
 */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class EstudoPersistenciaIT {

    @Autowired private UsuarioRepository usuarios;
    @Autowired private EstudoService estudos;
    @Autowired private UsuarioService gestaoUsuarios;
    @Autowired private EntityManager entidades;

    /**
     * Usa as credenciais explícitas de teste em vez das configurações de desenvolvimento.
     *
     * @param propriedades configurações recebidas pelo contexto Spring
     * @since 1.0
     */
    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add("spring.datasource.url", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
    }

    // <-------------------CONSULTAS E ATUALIZAÇÃO DOS VÍNCULOS------------------->

    /**
     * Persiste estudos de pesquisadores distintos e comprova a filtragem após trocar o coordenador.
     *
     * @since 1.0
     */
    @Test
    void persisteCadastroAtribuicaoEListagemFiltrada() {
        Usuario pesquisadorA = conta(PerfilUsuario.PESQUISADOR);
        Usuario pesquisadorB = conta(PerfilUsuario.PESQUISADOR);
        Usuario coordenadorA = conta(PerfilUsuario.COORDENADOR);
        Usuario coordenadorB = conta(PerfilUsuario.COORDENADOR);
        Usuario semVinculos = conta(PerfilUsuario.COORDENADOR);
        var primeiro = estudos.cadastrar(entrada(null), new UsuarioAutenticado(pesquisadorA));
        var segundo = estudos.cadastrar(entrada(coordenadorA.getId()), new UsuarioAutenticado(pesquisadorB));
        entidades.flush();
        entidades.clear();

        assertThat(estudos.listar(new UsuarioAutenticado(pesquisadorA)))
                .extracting(r -> r.id()).containsExactly(primeiro.id());
        assertThat(estudos.listar(new UsuarioAutenticado(semVinculos))).isEmpty();
        assertThat(estudos.listar(new UsuarioAutenticado(pesquisadorA)).getFirst().coordenadorId()).isNull();

        estudos.atribuirCoordenador(primeiro.id(), coordenadorA.getId(), new UsuarioAutenticado(pesquisadorA));
        entidades.flush();
        entidades.clear();
        assertThat(estudos.listar(new UsuarioAutenticado(coordenadorA)))
                .extracting(r -> r.id()).containsExactlyInAnyOrder(primeiro.id(), segundo.id());

        estudos.atribuirCoordenador(primeiro.id(), coordenadorB.getId(), new UsuarioAutenticado(pesquisadorA));
        entidades.flush();
        entidades.clear();
        assertThat(estudos.listar(new UsuarioAutenticado(coordenadorA)))
                .extracting(r -> r.id()).containsExactly(segundo.id());
        assertThat(estudos.listar(new UsuarioAutenticado(coordenadorB)))
                .extracting(r -> r.id()).containsExactly(primeiro.id());
        assertThat(estudos.listarCoordenadores()).extracting(r -> r.id())
                .contains(coordenadorA.getId(), coordenadorB.getId(), semVinculos.getId())
                .doesNotContain(pesquisadorA.getId(), pesquisadorB.getId());
    }

    /**
     * Confirma que os vínculos reais impedem trocar o perfil de pesquisadores e coordenadores.
     *
     * @param perfil perfil da conta vinculada que se tenta alterar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class, names = {"PESQUISADOR", "COORDENADOR"})
    void bloqueiaMudancaDePerfilComVinculoPersistido(PerfilUsuario perfil) {
        Usuario pesquisador = conta(PerfilUsuario.PESQUISADOR);
        Usuario coordenador = conta(PerfilUsuario.COORDENADOR);
        estudos.cadastrar(entrada(coordenador.getId()), new UsuarioAutenticado(pesquisador));
        entidades.flush();
        entidades.clear();
        Usuario alvo = perfil == PerfilUsuario.PESQUISADOR ? pesquisador : coordenador;

        assertThatThrownBy(() -> gestaoUsuarios.editar(alvo.getId(),
                new UsuarioEdicaoEntrada("Nome atualizado", alvo.getEmail(), PerfilUsuario.PARTICIPANTE)))
                .isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("vínculos incompatíveis");
        assertThat(usuarios.findById(alvo.getId()).orElseThrow().getPerfil()).isEqualTo(perfil);
    }

    // <-------------------EVOLUÇÃO DE UM BANCO QUE JÁ POSSUI DADOS------------------->

    /**
     * Aplica V3 sobre V1/V2 com dados existentes e verifica a chave estrangeira criada.
     *
     * @throws Exception se a conexão, migração ou consulta falhar
     * @since 1.0
     */
    @Test
    void migraBancoExistenteSemInventarCoordenador() throws Exception {
        String url = System.getenv("CLINICALSTUDYPB_TEST_DB_URL");
        String usuario = System.getenv("CLINICALSTUDYPB_TEST_DB_USER");
        String senha = System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD");
        String schema = "teste_upgrade_" + UUID.randomUUID().toString().replace("-", "");

        try (var conexao = DriverManager.getConnection(url, usuario, senha);
                var sql = conexao.createStatement()) {
            try {
                Flyway.configure().dataSource(url, usuario, senha).schemas(schema).defaultSchema(schema)
                        .target("2").load().migrate();
                sql.execute("SET search_path TO " + schema);
                sql.executeUpdate("""
                        INSERT INTO usuarios (id, nome, email, senha_hash, perfil)
                        VALUES (1, 'Pesquisa anterior', 'anterior@example.test', 'hash-ficticio', 'PESQUISADOR')
                        """);
                sql.executeUpdate("""
                        INSERT INTO estudos (id, titulo, objetivo, responsavel_id, data_inicio, data_fim,
                                             limite_participantes, estado)
                        VALUES (1, 'Estudo anterior', 'Objetivo preservado', 1, '2026-11-01', '2026-11-01',
                                10, 'PLANEJAMENTO')
                        """);

                Flyway.configure().dataSource(url, usuario, senha).schemas(schema).defaultSchema(schema)
                        .load().migrate();
                try (var dados = sql.executeQuery("SELECT titulo, responsavel_id, coordenador_id FROM estudos")) {
                    assertThat(dados.next()).isTrue();
                    assertThat(dados.getString("titulo")).isEqualTo("Estudo anterior");
                    assertThat(dados.getLong("responsavel_id")).isEqualTo(1L);
                    assertThat(dados.getObject("coordenador_id")).isNull();
                    assertThat(dados.next()).isFalse();
                }
                assertThatThrownBy(() -> sql.executeUpdate("UPDATE estudos SET coordenador_id = 999 WHERE id = 1"))
                        .isInstanceOf(java.sql.SQLException.class)
                        .satisfies(erro -> assertThat(((java.sql.SQLException) erro).getSQLState()).isEqualTo("23503"));
            } finally {
                // Remove somente o schema temporário criado por este teste
                sql.execute("SET search_path TO public");
                sql.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
            }
        }
    }

    // <-------------------DADOS FICTÍCIOS------------------->

    /**
     * Cria uma conta exclusiva deste teste sem depender de dados de desenvolvimento.
     *
     * @param perfil perfil que participa do cenário
     * @return conta persistida
     * @since 1.0
     */
    private Usuario conta(PerfilUsuario perfil) {
        String identificador = UUID.randomUUID().toString();
        return usuarios.saveAndFlush(new Usuario("Teste " + perfil, identificador + "@example.test",
                "hash-ficticio", perfil));
    }

    /**
     * Monta o cadastro mínimo com datas iguais e coordenador opcional.
     *
     * @param coordenador identificador do coordenador ou {@code null}
     * @return dados aceitos pelo serviço
     * @since 1.0
     */
    private EstudoCadastroEntrada entrada(Long coordenador) {
        LocalDate data = LocalDate.of(2026, 11, 1);
        return new EstudoCadastroEntrada("Estudo de teste", "Objetivo fictício", data, data, 10, coordenador);
    }
}
