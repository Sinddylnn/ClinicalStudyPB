package br.edu.uepb.clinicalstudypb.estudos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeEdicaoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.service.ResultadoAtividadeService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * Verifica o cadastro, a edição e a integridade de resultados fictícios
 * no PostgreSQL exclusivo de testes da equipe.
 *
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class ResultadoAtividadePersistenciaIT {

    @Autowired
    private EntityManager entidades;

    @Autowired
    private ResultadoAtividadeRepository resultados;

    @Autowired
    private ResultadoAtividadeService servico;

    private Estudo estudo;
    private Participacao participacao;
    private VisitaPrevista visitaPrevista;
    private VisitaAgendada visita;
    private AtividadePrevista primeiraAtividade;
    private AtividadePrevista segundaAtividade;
    private Usuario coordenador;
    private UsuarioAutenticado autenticado;

    /**
     * Configura a conexão com o banco reservado aos testes de integração.
     *
     * @param propriedades propriedades usadas pelo contexto Spring
     * @since 1.0
     */
    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add("spring.datasource.url",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
    }

    /**
     * Cria dados fictícios válidos e isolados para cada teste.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararDados() {
        String sufixo = UUID.randomUUID().toString();
        Usuario pesquisador = new Usuario(
                "Pesquisador RF14", "pesquisador-rf14-" + sufixo + "@teste.com",
                "hash-ficticio", PerfilUsuario.PESQUISADOR);
        coordenador = new Usuario(
                "Coordenador RF14", "coordenador-rf14-" + sufixo + "@teste.com",
                "hash-ficticio", PerfilUsuario.COORDENADOR);
        Usuario participanteUsuario = new Usuario(
                "Participante RF14", "participante-rf14-" + sufixo + "@teste.com",
                "hash-ficticio", PerfilUsuario.PARTICIPANTE);

        entidades.persist(pesquisador);
        entidades.persist(coordenador);
        entidades.persist(participanteUsuario);

        LocalDate hoje = LocalDate.now();
        estudo = new Estudo("Estudo RF14 " + sufixo, "Avaliações fictícias",
                pesquisador, hoje.minusDays(20), hoje.plusDays(60), 10);
        estudo.atribuirCoordenador(coordenador);
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        entidades.persist(estudo);

        Protocolo protocolo = new Protocolo(estudo, false);
        entidades.persist(protocolo);
        visitaPrevista = new VisitaPrevista(protocolo, "Visita inicial", null, 1);
        entidades.persist(visitaPrevista);

        primeiraAtividade = new AtividadePrevista(visitaPrevista, "Avaliação fictícia A");
        segundaAtividade = new AtividadePrevista(visitaPrevista, "Avaliação fictícia B");
        entidades.persist(primeiraAtividade);
        entidades.persist(segundaAtividade);

        participacao = new Participacao(estudo, participanteUsuario, Instant.now());
        entidades.persist(participacao);

        visita = new VisitaAgendada(
                participacao, visitaPrevista, Instant.now().minusSeconds(86400));
        visita.registrarSituacao(SituacaoVisita.REALIZADA, null,
                coordenador, Instant.now());
        entidades.persist(visita);
        entidades.flush();

        autenticado = new UsuarioAutenticado(coordenador);
    }

    /**
     * Confere a gravação do resultado e da autoria inicial no banco.
     *
     * @since 1.0
     */
    @Test
    void cadastraResultadoERecuperaDadosDoPostgresql() {
        ResultadoAtividadeResposta resposta = cadastrar(
                visita.getId(), primeiraAtividade.getId(), "  Avaliação normal  ");
        entidades.flush();
        entidades.clear();

        ResultadoAtividade persistido = resultados.findById(resposta.id()).orElseThrow();
        assertThat(persistido.getTexto()).isEqualTo("Avaliação normal");
        assertThat(persistido.getVisitaAgendada().getId()).isEqualTo(visita.getId());
        assertThat(persistido.getAtividadePrevista().getId())
                .isEqualTo(primeiraAtividade.getId());
        assertThat(persistido.getRegistradoPor().getId()).isEqualTo(coordenador.getId());
        assertThat(persistido.getRegistradoEm()).isNotNull();
        assertThat(persistido.getAtualizadoPor()).isNull();
        assertThat(persistido.getAtualizadoEm()).isNull();
        assertThat(resultados.existsByVisitaAgendada_Id(visita.getId())).isTrue();
    }

    /**
     * Confere que a edição preserva o cadastro original e grava a atualização.
     *
     * @since 1.0
     */
    @Test
    void editaResultadoSemAlterarAutoriaEDataOriginais() {
        ResultadoAtividadeResposta inicial = cadastrar(
                visita.getId(), primeiraAtividade.getId(), "Texto inicial");
        Instant dataOriginal = inicial.registradoEm();

        ResultadoAtividadeResposta editado = servico.editar(
                estudo.getId(), participacao.getId(), visita.getId(), inicial.id(),
                new ResultadoAtividadeEdicaoEntrada("  Texto corrigido  "), autenticado);
        entidades.flush();
        entidades.clear();

        ResultadoAtividade persistido = resultados.findById(inicial.id()).orElseThrow();
        assertThat(editado.id()).isEqualTo(inicial.id());
        assertThat(persistido.getTexto()).isEqualTo("Texto corrigido");
        assertThat(persistido.getRegistradoPor().getId()).isEqualTo(coordenador.getId());
        assertThat(persistido.getRegistradoEm())
                .isCloseTo(dataOriginal, within(1, ChronoUnit.MICROS));
        assertThat(persistido.getAtualizadoPor().getId()).isEqualTo(coordenador.getId());
        assertThat(persistido.getAtualizadoEm()).isNotNull();
        assertThat(persistido.getAtualizadoEm())
                .isCloseTo(editado.atualizadoEm(), within(1, ChronoUnit.MICROS));
    }

    /**
     * Confere que resultados parciais são aceitos, sem exigir todas as atividades.
     *
     * @since 1.0
     */
    @Test
    void permiteResultadosParciaisEAtividadesDiferentes() {
        ResultadoAtividadeResposta primeiro = cadastrar(
                visita.getId(), primeiraAtividade.getId(), "Primeiro resultado");
        entidades.flush();
        entidades.clear();

        assertThat(resultados.existsByVisitaAgendada_IdAndAtividadePrevista_Id(
                visita.getId(), primeiraAtividade.getId())).isTrue();
        assertThat(resultados.existsByVisitaAgendada_IdAndAtividadePrevista_Id(
                visita.getId(), segundaAtividade.getId())).isFalse();

        ResultadoAtividadeResposta segundo = cadastrar(
                visita.getId(), segundaAtividade.getId(), "Segundo resultado");
        entidades.flush();
        entidades.clear();

        assertThat(primeiro.id()).isNotEqualTo(segundo.id());
        assertThat(resultados.findById(primeiro.id())).isPresent();
        assertThat(resultados.findById(segundo.id())).isPresent();
    }

    /**
     * Garante que a constraint única do PostgreSQL rejeita gravação duplicada
     * mesmo quando a validação do serviço não é utilizada.
     *
     * @since 1.0
     */
    @Test
    void bancoImpedeDuplicidadePorVisitaEAtividade() {
        cadastrar(visita.getId(), primeiraAtividade.getId(), "Primeiro resultado");
        entidades.flush();

        ResultadoAtividade duplicado = new ResultadoAtividade(
                visita, primeiraAtividade, "Resultado duplicado",
                coordenador, Instant.now());

        assertThatThrownBy(() -> {
            entidades.persist(duplicado);
            entidades.flush();
        }).isInstanceOfAny(PersistenceException.class, DataIntegrityViolationException.class);
    }

    /**
     * Confere a consulta por resultado e visita e a unicidade independente
     * entre visitas diferentes.
     *
     * @since 1.0
     */
    @Test
    void naoPermiteConsultarResultadoPorOutraVisita() {
        ResultadoAtividadeResposta primeiro = cadastrar(
                visita.getId(), primeiraAtividade.getId(), "Resultado da primeira visita");

        VisitaAgendada outraVisita = new VisitaAgendada(
                participacao, visitaPrevista, Instant.now().minusSeconds(172800));
        outraVisita.registrarSituacao(
                SituacaoVisita.REALIZADA, null, coordenador, Instant.now());
        entidades.persist(outraVisita);
        entidades.flush();

        ResultadoAtividadeResposta segundo = cadastrar(
                outraVisita.getId(), primeiraAtividade.getId(), "Resultado da segunda visita");
        entidades.flush();
        entidades.clear();

        assertThat(resultados.findByIdAndVisitaAgendada_Id(
                primeiro.id(), visita.getId())).isPresent();
        assertThat(resultados.findByIdAndVisitaAgendada_Id(
                primeiro.id(), outraVisita.getId())).isEmpty();
        assertThat(resultados.findByIdAndVisitaAgendada_Id(
                segundo.id(), visita.getId())).isEmpty();
        assertThat(resultados.findByIdAndVisitaAgendada_Id(
                segundo.id(), outraVisita.getId())).isPresent();
    }

    /**
     * Executa o cadastro com as entidades persistidas no banco.
     *
     * @param visitaId identificador da visita
     * @param atividadeId identificador da atividade
     * @param texto resultado fictício a registrar
     * @return dados retornados pelo serviço
     * @since 1.0
     */
    private ResultadoAtividadeResposta cadastrar(Long visitaId, Long atividadeId, String texto) {
        return servico.registrar(
                estudo.getId(), participacao.getId(), visitaId,
                new ResultadoAtividadeCadastroEntrada(atividadeId, texto), autenticado);
    }
}
