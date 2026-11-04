package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.*;
import br.edu.uepb.clinicalstudypb.estudos.*;
import br.edu.uepb.clinicalstudypb.estudos.repository.*;
import br.edu.uepb.clinicalstudypb.recrutamento.*;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.*;
import br.edu.uepb.clinicalstudypb.recrutamento.service.*;
import br.edu.uepb.clinicalstudypb.usuarios.*;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// <-------------------CONTRATO E REGRAS DO RF10 E RF11------------------->
/** Executa controller, segurança e serviços reais; apenas os repositórios são simulados. */
@WebMvcTest(ConsentimentoInclusaoController.class)
@Import({ConfiguracaoSeguranca.class, RespostaErroSeguranca.class, AutenticacaoService.class,
        ConsentimentoInclusaoService.class, AvaliacaoElegibilidadeService.class})
class ConsentimentoInclusaoControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean EstudoRepository estudos;
    @MockitoBean CandidatoRepository candidatos;
    @MockitoBean ConsentimentoRepository consentimentos;
    @MockitoBean ParticipacaoRepository participacoes;
    @MockitoBean AvaliacaoElegibilidadeRepository avaliacoes;
    @MockitoBean ProtocoloRepository protocolos;
    @MockitoBean CriterioRepository criterios;
    @MockitoBean RespostaElegibilidadeRepository respostas;
    private final Map<Long, Usuario> contas = new HashMap<>();
    private final List<Consentimento> historico = new ArrayList<>();
    private final List<Participacao> inclusoes = new ArrayList<>();
    private final List<RespostaElegibilidade> marcacoes = new ArrayList<>();
    private Estudo estudo;
    private Candidato candidato;
    private static final String BASE = "/estudos/10/candidatos/40";

    @BeforeEach
    void preparar() {
        conta(1, PerfilUsuario.PESQUISADOR, "pesquisador@example.test");
        conta(2, PerfilUsuario.COORDENADOR, "coordenador@example.test");
        conta(3, PerfilUsuario.COORDENADOR, "outro@example.test");
        conta(4, PerfilUsuario.PARTICIPANTE, "candidato@example.test");
        conta(5, PerfilUsuario.PESQUISADOR, "outro-pesquisador@example.test");
        conta(6, PerfilUsuario.PARTICIPANTE, "diferente@example.test");
        conta(7, PerfilUsuario.PARTICIPANTE, "candidato@example.test").desativar();
        conta(9, PerfilUsuario.ADMINISTRADOR, "admin@example.test");
        estudo = new Estudo("Estudo", "Objetivo", contas.get(1L), LocalDate.now(), LocalDate.now(), 2);
        id(estudo, 10);
        estudo.atribuirCoordenador(contas.get(2L));
        ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.RECRUTAMENTO);
        candidato = new Candidato(estudo, "Candidato", "candidato@example.test"); id(candidato, 40);
        candidato.atualizarElegibilidade(SituacaoElegibilidade.ELEGIVEL);
        candidato.registrarConsentimento(RespostaConsentimento.ACEITOU);
        Protocolo protocolo = new Protocolo(estudo, false); id(protocolo, 20);
        Criterio inclusao = new Criterio(protocolo, TipoCriterio.INCLUSAO, "Inclusão"); id(inclusao, 30);
        Criterio exclusao = new Criterio(protocolo, TipoCriterio.EXCLUSAO, "Exclusão"); id(exclusao, 31);
        var avaliacao = new AvaliacaoElegibilidade(candidato, contas.get(2L)); id(avaliacao, 50);
        marcacoes.add(new RespostaElegibilidade(avaliacao, inclusao, RespostaCriterio.ATENDIDO));
        marcacoes.add(new RespostaElegibilidade(avaliacao, exclusao, RespostaCriterio.AUSENTE));
        var aceite = new Consentimento(candidato, RespostaConsentimento.ACEITOU, null, contas.get(2L), Instant.now());
        id(aceite, 90); historico.add(aceite);

        when(usuarios.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(contas.get(i.getArgument(0))));
        when(usuarios.bloquearPorIds(anyCollection())).thenAnswer(i -> i.<Collection<Long>>getArgument(0).stream()
                .distinct().sorted().map(contas::get).filter(Objects::nonNull).toList());
        when(usuarios.buscarPorEmail(anyString())).thenReturn(Optional.of(contas.get(4L)));
        when(estudos.bloquearPorIdECoordenadorId(10L, 2L)).thenReturn(Optional.of(estudo));
        when(estudos.findByIdAndCoordenadorId(10L, 2L)).thenReturn(Optional.of(estudo));
        when(estudos.findByIdAndResponsavelId(10L, 1L)).thenReturn(Optional.of(estudo));
        when(candidatos.findById(40L)).thenReturn(Optional.of(candidato));
        when(protocolos.findByEstudoId(10L)).thenReturn(Optional.of(protocolo));
        when(criterios.findByProtocoloIdOrderByIdAsc(20L)).thenReturn(List.of(inclusao, exclusao));
        when(avaliacoes.findByCandidatoId(40L)).thenReturn(Optional.of(avaliacao));
        when(respostas.findByAvaliacaoId(50L)).thenAnswer(i -> marcacoes);
        when(consentimentos.findFirstByCandidatoIdOrderByIdDesc(40L)).thenAnswer(i ->
                historico.isEmpty() ? Optional.empty() : Optional.of(historico.getLast()));
        when(consentimentos.findByCandidatoIdOrderByIdDesc(40L)).thenAnswer(i -> historico.reversed());
        when(consentimentos.save(any())).thenAnswer(i -> {
            Consentimento registro = i.getArgument(0); id(registro, 91 + historico.size());
            historico.add(registro); return registro;
        });
        when(participacoes.existsByCandidatoId(40L)).thenAnswer(i -> !inclusoes.isEmpty());
        when(participacoes.countByEstudoId(10L)).thenAnswer(i -> (long) inclusoes.size());
        when(participacoes.save(any())).thenAnswer(i -> {
            Participacao participacao = i.getArgument(0); id(participacao, 100);
            inclusoes.add(participacao); return participacao;
        });
    }

    // <-------------------FLUXOS PERMITIDOS E HISTÓRICO------------------->

    @Test
    void incluiRetornaDataEImpedeDuplicata() throws Exception {
        incluir(4).andExpect(status().isCreated()).andExpect(jsonPath("$.dataInclusao").isNotEmpty());
        assertThat(inclusoes.getFirst().getCandidato()).isSameAs(candidato);
        mvc.perform(como(2, get(BASE + "/inclusao"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.incluidos").value(1))
                .andExpect(jsonPath("$.candidato.dataInclusao").isNotEmpty());
        incluir(4).andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("INCLUSAO_DUPLICADA"));
        assertThat(inclusoes).hasSize(1);
        var ordem = inOrder(usuarios, estudos, participacoes);
        ordem.verify(usuarios).bloquearPorIds(List.of(2L, 4L));
        ordem.verify(estudos).bloquearPorIdECoordenadorId(10L, 2L);
        ordem.verify(participacoes).save(any());
    }

    @Test
    void corrigeConsentimentoPreservandoRecusaEAutor() throws Exception {
        registrar("{\"resposta\":\"RECUSOU\",\"observacao\":\"  Sem interesse  \"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.candidato.consentimento").value("RECUSOU"))
                .andExpect(jsonPath("$.observacao").value("Sem interesse"))
                .andExpect(jsonPath("$.registradoEm").isNotEmpty());
        registrar("{\"resposta\":\"ACEITOU\"}").andExpect(status().isOk());
        mvc.perform(como(1, get(BASE + "/consentimento/historico"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].resposta").value("ACEITOU"))
                .andExpect(jsonPath("$[1].resposta").value("RECUSOU"))
                .andExpect(jsonPath("$[1].registradoPorId").value(2));
        assertThat(historico).hasSize(3);
    }

    @Test
    void consultaPendenteSemCriarRegistro() throws Exception {
        historico.clear();
        ReflectionTestUtils.setField(candidato, "consentimento", SituacaoConsentimento.PENDENTE);
        mvc.perform(como(1, get(BASE + "/consentimento"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.candidato.consentimento").value("PENDENTE"))
                .andExpect(jsonPath("$.registradoEm").isEmpty());
        verify(consentimentos, never()).save(any());
    }

    @Test
    void consultaContaCorrespondenteSemExporGestaoDeUsuarios() throws Exception {
        mvc.perform(como(2, get(BASE + "/inclusao"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.contas.length()").value(1)).andExpect(jsonPath("$.contas[0].id").value(4))
                .andExpect(jsonPath("$.contas[0].senhaHash").doesNotExist());
        when(usuarios.buscarPorEmail(anyString())).thenReturn(Optional.of(contas.get(7L)));
        mvc.perform(como(2, get(BASE + "/inclusao"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.contas").isEmpty());
    }

    // <-------------------REGRAS QUE IMPEDEM A INCLUSÃO------------------->

    @ParameterizedTest
    @ValueSource(longs = {1, 6, 7, 9, 99})
    void rejeitaContaIncompativel(long contaId) throws Exception {
        incluir(contaId).andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("CONTA_INVALIDA"));
        verify(participacoes, never()).save(any());
    }

    @Test
    void rejeitaLimiteHistoricoEContaJaIncluida() throws Exception {
        when(participacoes.countByEstudoId(10L)).thenReturn(2L);
        incluir(4).andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("LIMITE_ATINGIDO"));
        when(participacoes.existsByEstudoIdAndParticipanteId(10L, 4L)).thenReturn(true);
        incluir(4).andExpect(status().isConflict()).andExpect(jsonPath("$.codigo").value("INCLUSAO_DUPLICADA"));
        verify(participacoes, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = SituacaoElegibilidade.class, names = {"NAO_AVALIADO", "INCOMPLETA", "INELEGIVEL"})
    void rejeitaElegibilidadeInvalida(SituacaoElegibilidade situacao) throws Exception {
        candidato.atualizarElegibilidade(situacao);
        rejeitarInclusao("ELEGIBILIDADE_INVALIDA");
    }

    @ParameterizedTest
    @EnumSource(value = RespostaCriterio.class, names = {"NAO_ATENDIDO", "PRESENTE", "AUSENTE"})
    void reconfereRespostasMesmoComResumoElegivel(RespostaCriterio resposta) throws Exception {
        marcacoes.getFirst().atualizarResposta(resposta);
        rejeitarInclusao("ELEGIBILIDADE_INVALIDA");
    }

    @Test
    void exigeRespostasCompletasEAvaliacaoPersistida() throws Exception {
        marcacoes.clear();
        rejeitarInclusao("ELEGIBILIDADE_INVALIDA");
        when(avaliacoes.findByCandidatoId(40L)).thenReturn(Optional.empty());
        rejeitarInclusao("ELEGIBILIDADE_INVALIDA");
        registrar("{\"resposta\":\"ACEITOU\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("AVALIACAO_PENDENTE"));
    }

    @Test
    void rejeitaProtocoloSemCriterioInclusao() throws Exception {
        when(criterios.findByProtocoloIdOrderByIdAsc(20L)).thenReturn(List.of());
        rejeitarInclusao("ELEGIBILIDADE_INVALIDA");
    }

    @Test
    void exigeHistoricoDeAceiteENaoApenasResumo() throws Exception {
        historico.clear();
        rejeitarInclusao("CONSENTIMENTO_NAO_ACEITO");
        historico.add(new Consentimento(candidato, RespostaConsentimento.RECUSOU, null, contas.get(2L), Instant.now()));
        rejeitarInclusao("CONSENTIMENTO_NAO_ACEITO");
    }

    @Test
    void naoCorrigeConsentimentoAposInclusao() throws Exception {
        when(participacoes.existsByCandidatoId(40L)).thenReturn(true);
        registrar("{\"resposta\":\"RECUSOU\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("CANDIDATO_JA_INCLUIDO"));
        assertThat(historico).hasSize(1);
        assertThat(candidato.getConsentimento()).isEqualTo(SituacaoConsentimento.ACEITOU);
    }

    // <-------------------VALIDAÇÃO E SEGURANÇA------------------->

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"resposta\":null}", "{\"resposta\":\"PENDENTE\"}", "{\"resposta\":\"OUTRA\"}"})
    void rejeitaRespostaInvalida(String corpo) throws Exception {
        registrar(corpo).andExpect(status().isBadRequest());
        verify(consentimentos, never()).save(any());
    }

    @Test
    void validaLimiteDaObservacaoAposNormalizar() throws Exception {
        registrar(json.writeValueAsString(new ConsentimentoEntrada(RespostaConsentimento.ACEITOU, "x".repeat(501))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errosCampos.observacao").exists());
        registrar(json.writeValueAsString(new ConsentimentoEntrada(RespostaConsentimento.ACEITOU, "  " + "x".repeat(500))))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"contaId\":0}", "{\"contaId\":-1}"})
    void exigeIdentificadorValido(String corpo) throws Exception {
        mvc.perform(como(2, post(BASE + "/inclusao")).content(corpo)).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @EnumSource(value = EstadoEstudo.class, names = {"PLANEJAMENTO", "EXECUCAO", "ENCERRADO"})
    void bloqueiaEscritaForaDoRecrutamento(EstadoEstudo estado) throws Exception {
        ReflectionTestUtils.setField(estudo, "estado", estado);
        rejeitarInclusao("ESTADO_INVALIDO");
        registrar("{\"resposta\":\"ACEITOU\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ESTADO_INVALIDO"));
        mvc.perform(como(1, get(BASE + "/consentimento"))).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(longs = {1, 4, 9})
    void bloqueiaEscritaDeOutrosPerfis(long id) throws Exception {
        mvc.perform(como(id, post(BASE + "/inclusao")).content("{\"contaId\":4}")).andExpect(status().isForbidden());
        mvc.perform(como(id, put(BASE + "/consentimento")).content("{\"resposta\":\"ACEITOU\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void exigeVinculosNasLeiturasEEscritas() throws Exception {
        for (long id : new long[]{3, 5}) {
            for (String rota : List.of("/consentimento", "/consentimento/historico", "/inclusao")) {
                mvc.perform(como(id, get(BASE + rota))).andExpect(status().isNotFound());
            }
        }
        mvc.perform(como(3, post(BASE + "/inclusao")).content("{\"contaId\":4}")).andExpect(status().isNotFound());
        mvc.perform(como(3, put(BASE + "/consentimento")).content("{\"resposta\":\"ACEITOU\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(como(2, get("/estudos/10/candidatos/99/consentimento"))).andExpect(status().isNotFound());
        mvc.perform(como(2, post("/estudos/10/candidatos/99/inclusao")).content("{\"contaId\":4}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void exigeSessaoECsrf() throws Exception {
        for (String rota : List.of("/consentimento", "/consentimento/historico", "/inclusao")) {
            mvc.perform(get(BASE + rota)).andExpect(status().isUnauthorized());
            mvc.perform(como(4, get(BASE + rota))).andExpect(status().isForbidden());
        }
        mvc.perform(post(BASE + "/inclusao").with(user(new UsuarioAutenticado(contas.get(2L))))
                .contentType("application/json").content("{\"contaId\":4}")).andExpect(status().isForbidden());
        mvc.perform(put(BASE + "/consentimento").with(user(new UsuarioAutenticado(contas.get(2L))))
                .contentType("application/json").content("{\"resposta\":\"ACEITOU\"}")).andExpect(status().isForbidden());
    }

    private ResultActions incluir(long contaId) throws Exception {
        return mvc.perform(como(2, post(BASE + "/inclusao")).content("{\"contaId\":" + contaId + "}"));
    }
    private ResultActions registrar(String corpo) throws Exception {
        return mvc.perform(como(2, put(BASE + "/consentimento")).content(corpo));
    }
    private void rejeitarInclusao(String codigo) throws Exception {
        incluir(4).andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value(codigo));
        verify(participacoes, never()).save(any());
    }
    private Usuario conta(long id, PerfilUsuario perfil, String email) {
        Usuario usuario = new Usuario("Pessoa " + id, email, "hash", perfil);
        id(usuario, id); contas.put(id, usuario); return usuario;
    }
    private void id(Object objeto, long id) { ReflectionTestUtils.setField(objeto, "id", id); }
    private MockHttpServletRequestBuilder como(long id, MockHttpServletRequestBuilder pedido) {
        return pedido.with(user(new UsuarioAutenticado(contas.get(id)))).with(csrf()).contentType("application/json");
    }
}
