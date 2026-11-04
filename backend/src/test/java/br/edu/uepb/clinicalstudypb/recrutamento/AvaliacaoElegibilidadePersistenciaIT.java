
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
}
