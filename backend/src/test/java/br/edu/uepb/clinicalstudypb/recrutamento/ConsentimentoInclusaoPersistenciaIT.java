package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.*;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.*;
import br.edu.uepb.clinicalstudypb.estudos.api.AlteracaoEstadoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.repository.*;
import br.edu.uepb.clinicalstudypb.estudos.service.EstudoService;
import br.edu.uepb.clinicalstudypb.recrutamento.api.*;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.*;
import br.edu.uepb.clinicalstudypb.recrutamento.service.*;
import br.edu.uepb.clinicalstudypb.usuarios.*;
import br.edu.uepb.clinicalstudypb.usuarios.api.UsuarioEdicaoEntrada;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.UsuarioService;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;

// <-------------------INCLUSÃO COM POSTGRESQL REAL------------------->
/** Confere commits, histórico e concorrência em um banco exclusivo de testes. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "CLINICALSTUDYPB_TEST_DB_URL", matches = ".+")
class ConsentimentoInclusaoPersistenciaIT {
    @Autowired ConsentimentoInclusaoService servico;
    @Autowired AvaliacaoElegibilidadeService elegibilidade;
    @Autowired CandidatoService candidatosServico;
    @Autowired EstudoService estados;
    @Autowired UsuarioService gestaoUsuarios;
    @Autowired ParticipacaoRepository participacoes;
    @Autowired CandidatoRepository candidatos;
    @Autowired ConsentimentoRepository consentimentos;
    @Autowired UsuarioRepository usuarios;
    @Autowired EstudoRepository estudos;
    @Autowired EntityManager entidades;
    @Autowired PlatformTransactionManager transacoes;

    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add("spring.datasource.url", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL"));
        propriedades.add("spring.datasource.username", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER"));
        propriedades.add("spring.datasource.password", () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD"));
    }

    // <-------------------PERSISTÊNCIA E PRESERVAÇÃO DO HISTÓRICO------------------->

    @Test
    void registraCorrigeIncluiEPreservaHistorico() {
        Cenario c = preparar(2, 1);
        Pessoa p = c.pessoas().getFirst();
        avaliar(c, p, RespostaCriterio.ATENDIDO);
        consentir(c, p, RespostaConsentimento.RECUSOU);
        assertThatThrownBy(() -> incluir(c, p)).isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("aceite");
        assertThat(total(c)).isZero();
        consentir(c, p, RespostaConsentimento.ACEITOU);
        var incluido = incluir(c, p);
        assertThat(incluido.dataInclusao()).isNotNull();
        assertThat(total(c)).isEqualTo(1);
        assertThat(candidatosServico.listar(c.estudoId(), c.coordenador()).getFirst().dataInclusao())
                .isEqualTo(incluido.dataInclusao());
        var historico = servico.historico(c.estudoId(), p.candidatoId(), c.pesquisador());
        assertThat(historico).extracting(HistoricoConsentimentoResposta::resposta)
                .containsExactly(RespostaConsentimento.ACEITOU, RespostaConsentimento.RECUSOU);
        assertThat(historico).allSatisfy(item -> {
            assertThat(item.registradoPorId()).isEqualTo(c.coordenador().getId());
            assertThat(item.registradoEm()).isNotNull();
        });
        assertThatThrownBy(() -> incluir(c, p)).isInstanceOf(ConflitoException.class);
        assertThatThrownBy(() -> consentir(c, p, RespostaConsentimento.RECUSOU)).isInstanceOf(RegraNegocioException.class);
        assertThatThrownBy(() -> avaliar(c, p, RespostaCriterio.NAO_ATENDIDO)).isInstanceOf(RegraNegocioException.class);
        assertThat(servico.historico(c.estudoId(), p.candidatoId(), c.coordenador())).hasSize(2);
        assertThat(elegibilidade.obter(c.estudoId(), p.candidatoId(), c.coordenador()).situacao())
                .isEqualTo(SituacaoElegibilidade.ELEGIVEL);

        // A inclusão histórica também impede retirar o perfil exigido pelo vínculo
        String email = tx().execute(status -> usuarios.findById(p.contaId()).orElseThrow().getEmail());
        assertThatThrownBy(() -> gestaoUsuarios.editar(p.contaId(),
                new UsuarioEdicaoEntrada("Alterado", email, PerfilUsuario.PESQUISADOR)))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("vínculos");
        PerfilUsuario perfil = tx().execute(status -> usuarios.findById(p.contaId()).orElseThrow().getPerfil());
        assertThat(perfil).isEqualTo(PerfilUsuario.PARTICIPANTE);
        estados.alterarEstado(c.estudoId(), new AlteracaoEstadoEntrada(EstadoEstudo.EXECUCAO, null), c.pesquisador());
        assertThat(servico.obterInclusao(c.estudoId(), p.candidatoId(), c.pesquisador()).incluidos()).isEqualTo(1);
    }

    @Test
    void ultimaRecusaImpedeInclusaoMesmoDepoisDeAceite() {
        Cenario c = preparar(1, 1);
        Pessoa p = c.pessoas().getFirst();
        avaliar(c, p, RespostaCriterio.ATENDIDO);
        consentir(c, p, RespostaConsentimento.ACEITOU);
        consentir(c, p, RespostaConsentimento.RECUSOU);
        assertThatThrownBy(() -> incluir(c, p)).isInstanceOf(RegraNegocioException.class);
        assertThat(total(c)).isZero();
        assertThat(servico.historico(c.estudoId(), p.candidatoId(), c.coordenador())).hasSize(2);
    }

    @Test
    void naoConfiaEmResumoElegivelQuandoRespostasReprovam() {
        Cenario c = preparar(1, 1);
        Pessoa p = c.pessoas().getFirst();
        avaliar(c, p, RespostaCriterio.NAO_ATENDIDO);
        consentir(c, p, RespostaConsentimento.ACEITOU);
        tx().executeWithoutResult(status -> candidatos.findById(p.candidatoId()).orElseThrow()
                .atualizarElegibilidade(SituacaoElegibilidade.ELEGIVEL));
        assertThatThrownBy(() -> incluir(c, p)).isInstanceOf(RegraNegocioException.class)
                .hasMessageContaining("elegível");
        assertThat(total(c)).isZero();
    }

    // <-------------------OPERAÇÕES SIMULTÂNEAS------------------->

    @Test
    void avaliacaoEInclusaoSimultaneasPreservamConsistencia() throws Exception {
        Cenario c = preparar(1, 1);
        Pessoa p = c.pessoas().getFirst();

        // Candidato começa elegível e com consentimento aceito.
        avaliar(c, p, RespostaCriterio.ATENDIDO);
        consentir(c, p, RespostaConsentimento.ACEITOU);

        var prontas = new CountDownLatch(2);
        var iniciar = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);

        try {
            Future<String> avaliacao = executor.submit(() -> {
                prontas.countDown();
                aguardar(iniciar);

                try {
                    avaliar(c, p, RespostaCriterio.NAO_ATENDIDO);
                    return "AVALIACAO_ATUALIZADA";
                } catch (RegraNegocioException erro) {
                    return "AVALIACAO_BLOQUEADA";
                }
            });

            Future<String> inclusao = executor.submit(() -> {
                prontas.countDown();
                aguardar(iniciar);

                try {
                    incluir(c, p);
                    return "INCLUSAO_REALIZADA";
                } catch (RegraNegocioException erro) {
                    return "INCLUSAO_BLOQUEADA";
                }
            });

            aguardar(prontas);
            iniciar.countDown();

            String resultadoAvaliacao = avaliacao.get(15, TimeUnit.SECONDS);
            String resultadoInclusao = inclusao.get(15, TimeUnit.SECONDS);

            // Apenas uma das operações pode ser concluída.
            boolean avaliacaoPrimeiro =
                    resultadoAvaliacao.equals("AVALIACAO_ATUALIZADA")
                    && resultadoInclusao.equals("INCLUSAO_BLOQUEADA");

            boolean inclusaoPrimeiro =
                    resultadoAvaliacao.equals("AVALIACAO_BLOQUEADA")
                    && resultadoInclusao.equals("INCLUSAO_REALIZADA");

            assertThat(avaliacaoPrimeiro || inclusaoPrimeiro).isTrue();

            // Confere o estado final no banco.
            var situacao = elegibilidade.obter(
                    c.estudoId(), p.candidatoId(), c.coordenador()
            ).situacao();

            if (inclusaoPrimeiro) {
                assertThat(total(c)).isEqualTo(1);
                assertThat(situacao)
                        .isEqualTo(SituacaoElegibilidade.ELEGIVEL);
            } else {
                assertThat(total(c)).isZero();
                assertThat(situacao)
                        .isEqualTo(SituacaoElegibilidade.INELEGIVEL);
            }

        } finally {
            iniciar.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    @Test
    void duasInclusoesDisputamUltimaVagaSemUltrapassarLimite() throws Exception {
        Cenario c = preparar(1, 2);
        for (Pessoa p : c.pessoas()) {
            avaliar(c, p, RespostaCriterio.ATENDIDO);
            consentir(c, p, RespostaConsentimento.ACEITOU);
        }
        var prontas = new CountDownLatch(2);
        var iniciar = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            List<Future<Object>> resultados = new ArrayList<>();
            for (Pessoa p : c.pessoas()) {
                resultados.add(executor.submit(() -> {
                    prontas.countDown();
                    aguardar(iniciar);
                    try { return incluir(c, p); }
                    catch (ConflitoException conflito) { return conflito.getCodigo(); }
                }));
            }
            aguardar(prontas);
            iniciar.countDown();
            List<Object> recebidos = new ArrayList<>();
            for (Future<Object> resultado : resultados) recebidos.add(resultado.get(15, TimeUnit.SECONDS));
            assertThat(recebidos.stream().filter(CandidatoResposta.class::isInstance).count()).isEqualTo(1);
            assertThat(recebidos).contains("LIMITE_ATINGIDO");
            assertThat(total(c)).isEqualTo(1);
            assertThat(candidatosServico.listar(c.estudoId(), c.coordenador()).stream()
                    .filter(candidato -> candidato.dataInclusao() != null).count()).isEqualTo(1);
        } finally {
            iniciar.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    @Test
    void inclusaoAguardaEncerramentoEReconfereEstado() throws Exception {
        Cenario c = preparar(1, 1);
        Pessoa p = c.pessoas().getFirst();
        avaliar(c, p, RespostaCriterio.ATENDIDO);
        consentir(c, p, RespostaConsentimento.ACEITOU);
        var fechado = new CountDownLatch(1);
        var liberar = new CountDownLatch(1);
        var tentativaIniciada = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> fechamento = executor.submit(() -> tx().executeWithoutResult(status -> {
                estados.alterarEstado(c.estudoId(),
                        new AlteracaoEstadoEntrada(EstadoEstudo.ENCERRADO, "Cancelado"), c.pesquisador());
                fechado.countDown();
                aguardar(liberar);
            }));
            aguardar(fechado);
            Future<?> inclusao = executor.submit(() -> {
                tentativaIniciada.countDown();
                return incluir(c, p);
            });
            aguardar(tentativaIniciada);
            assertThatThrownBy(() -> inclusao.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            liberar.countDown();
            fechamento.get(15, TimeUnit.SECONDS);
            assertThatThrownBy(() -> inclusao.get(15, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(RegraNegocioException.class);
            assertThat(total(c)).isZero();
            EstadoEstudo estado = tx().execute(status -> estudos.findById(c.estudoId()).orElseThrow().getEstado());
            assertThat(estado).isEqualTo(EstadoEstudo.ENCERRADO);
        } finally {
            liberar.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    @Test
    void inclusaoReconfereContaDepoisDeTrocaConcorrenteDePerfil() throws Exception {
        Cenario c = preparar(1, 1);
        Pessoa p = c.pessoas().getFirst();
        avaliar(c, p, RespostaCriterio.ATENDIDO);
        consentir(c, p, RespostaConsentimento.ACEITOU);
        String email = tx().execute(status -> usuarios.findById(p.contaId()).orElseThrow().getEmail());
        var alterada = new CountDownLatch(1);
        var liberar = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            Future<?> edicao = executor.submit(() -> tx().executeWithoutResult(status -> {
                gestaoUsuarios.editar(p.contaId(), new UsuarioEdicaoEntrada("Novo perfil", email, PerfilUsuario.PESQUISADOR));
                alterada.countDown();
                aguardar(liberar);
            }));
            aguardar(alterada);
            Future<?> inclusao = executor.submit(() -> incluir(c, p));
            assertThatThrownBy(() -> inclusao.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            liberar.countDown();
            edicao.get(15, TimeUnit.SECONDS);
            assertThatThrownBy(() -> inclusao.get(15, TimeUnit.SECONDS))
                    .hasCauseInstanceOf(RegraNegocioException.class);
            assertThat(total(c)).isZero();
        } finally {
            liberar.countDown();
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }

    // <-------------------DADOS E TRANSAÇÕES INDEPENDENTES------------------->

    private Cenario preparar(int limite, int quantidade) {
        Cenario c = tx().execute(status -> {
            Usuario pesquisador = conta(PerfilUsuario.PESQUISADOR, UUID.randomUUID() + "@example.test");
            Usuario coordenador = conta(PerfilUsuario.COORDENADOR, UUID.randomUUID() + "@example.test");
            Estudo estudo = new Estudo("Inclusão", "Objetivo", pesquisador, LocalDate.now(), LocalDate.now(), limite);
            estudo.atribuirCoordenador(coordenador); entidades.persist(estudo);
            Protocolo protocolo = new Protocolo(estudo, true); entidades.persist(protocolo);
            Criterio criterio = new Criterio(protocolo, TipoCriterio.INCLUSAO, "Critério fictício"); entidades.persist(criterio);
            VisitaPrevista visita = new VisitaPrevista(protocolo, "Inicial", null, 1); entidades.persist(visita);
            entidades.persist(new AtividadePrevista(visita, "Atividade fictícia"));
            List<Pessoa> pessoas = new ArrayList<>();
            for (int i = 0; i < quantidade; i++) {
                String email = UUID.randomUUID() + "@example.test";
                Usuario participante = conta(PerfilUsuario.PARTICIPANTE, email);
                Candidato candidato = new Candidato(estudo, "Candidato", email); entidades.persist(candidato);
                pessoas.add(new Pessoa(candidato.getId(), participante.getId()));
            }
            return new Cenario(estudo.getId(), new UsuarioAutenticado(pesquisador),
                    new UsuarioAutenticado(coordenador), criterio.getId(), pessoas);
        });
        estados.alterarEstado(c.estudoId(), new AlteracaoEstadoEntrada(EstadoEstudo.RECRUTAMENTO, null), c.pesquisador());
        return c;
    }

    private Usuario conta(PerfilUsuario perfil, String email) {
        Usuario usuario = new Usuario("Pessoa de teste", email, "hash", perfil);
        entidades.persist(usuario);
        return usuario;
    }
    private void avaliar(Cenario c, Pessoa p, RespostaCriterio resposta) {
        elegibilidade.salvar(c.estudoId(), p.candidatoId(), new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(c.criterioId(), resposta))), c.coordenador());
    }
    private void consentir(Cenario c, Pessoa p, RespostaConsentimento resposta) {
        servico.registrarConsentimento(c.estudoId(), p.candidatoId(),
                new ConsentimentoEntrada(resposta, "Registro fictício"), c.coordenador());
    }
    private CandidatoResposta incluir(Cenario c, Pessoa p) {
        return servico.incluir(c.estudoId(), p.candidatoId(), new InclusaoEntrada(p.contaId()), c.coordenador());
    }
    private long total(Cenario c) {
        return tx().execute(status -> participacoes.countByEstudoId(c.estudoId()));
    }
    private TransactionTemplate tx() { return new TransactionTemplate(transacoes); }
    private void aguardar(CountDownLatch sinal) {
        try {
            if (!sinal.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Tempo de espera excedido.");
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(erro);
        }
    }
    private record Pessoa(Long candidatoId, Long contaId) { }
    private record Cenario(Long estudoId, UsuarioAutenticado pesquisador, UsuarioAutenticado coordenador,
            Long criterioId, List<Pessoa> pessoas) { }
}
