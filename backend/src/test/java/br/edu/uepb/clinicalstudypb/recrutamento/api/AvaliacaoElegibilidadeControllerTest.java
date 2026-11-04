
package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import br.edu.uepb.clinicalstudypb.estudos.repository.CriterioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaCriterio;
import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoElegibilidade;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.AvaliacaoElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.RespostaElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.service.AvaliacaoElegibilidadeService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.LinkedHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AvaliacaoElegibilidadeController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class,
        AvaliacaoElegibilidadeService.class
})
class AvaliacaoElegibilidadeControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private EstudoRepository estudos;

    @MockitoBean
    private ProtocoloRepository protocolos;

    @MockitoBean
    private CriterioRepository criterios;

    @MockitoBean
    private CandidatoRepository candidatos;

    @MockitoBean
    private AvaliacaoElegibilidadeRepository avaliacoes;

    @MockitoBean
    private RespostaElegibilidadeRepository respostas;

    private final Map<Long, Usuario> contas = new LinkedHashMap<>();

    private Estudo estudo;
    private Candidato candidato;
    private Criterio inclusao;
    private Criterio exclusao;

    private static final String URL =
            "/estudos/10/candidatos/40/elegibilidade";

    // <-------------------PREPARAÇÃO DOS TESTES------------------->

    @BeforeEach
    void prepararDados() {
        conta(1, PerfilUsuario.PESQUISADOR);
        conta(2, PerfilUsuario.COORDENADOR);
        conta(3, PerfilUsuario.COORDENADOR);

        LocalDate data = LocalDate.of(2026, 11, 1);

        estudo = new Estudo(
                "Estudo de teste",
                "Objetivo",
                contas.get(1L),
                data,
                data,
                10
        );

        ReflectionTestUtils.setField(estudo, "id", 10L);
        estudo.atribuirCoordenador(contas.get(2L));

        ReflectionTestUtils.setField(
                estudo, "estado", EstadoEstudo.RECRUTAMENTO
        );

        candidato = new Candidato(
                estudo,
                "Maria Silva",
                "maria@example.test"
        );

        ReflectionTestUtils.setField(candidato, "id", 40L);

        Protocolo protocolo = new Protocolo(estudo, false);
        ReflectionTestUtils.setField(protocolo, "id", 20L);

        inclusao = new Criterio(
                protocolo,
                TipoCriterio.INCLUSAO,
                "Ter disponibilidade para as visitas."
        );
        ReflectionTestUtils.setField(inclusao, "id", 30L);

        exclusao = new Criterio(
                protocolo,
                TipoCriterio.EXCLUSAO,
                "Participar de outro estudo."
        );
        ReflectionTestUtils.setField(exclusao, "id", 31L);

        when(usuarios.findById(anyLong()))
                .thenAnswer(i -> Optional.ofNullable(
                        contas.get(i.getArgument(0))
                ));

        when(estudos.findByIdAndCoordenadorId(anyLong(), anyLong()))
                .thenAnswer(i ->
                        i.<Long>getArgument(0).equals(10L)
                                && i.<Long>getArgument(1).equals(2L)
                                ? Optional.of(estudo)
                                : Optional.empty()
                );

        when(estudos.bloquearPorIdECoordenadorId(anyLong(), anyLong()))
                .thenAnswer(i ->
                        i.<Long>getArgument(0).equals(10L)
                                && i.<Long>getArgument(1).equals(2L)
                                ? Optional.of(estudo)
                                : Optional.empty()
                );

        when(candidatos.findById(40L))
                .thenReturn(Optional.of(candidato));

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(criterios.findByProtocoloIdOrderByIdAsc(20L))
                .thenReturn(List.of(inclusao, exclusao));

        when(avaliacoes.save(any()))
                .thenAnswer(i -> {
                    var avaliacao = i.getArgument(0);
                    ReflectionTestUtils.setField(
                            avaliacao, "id", 50L
                    );
                    return avaliacao;
                });
    }

    // <-------------------CONSULTA------------------->

    @Test
    void consultaCandidatoAindaNaoAvaliado() throws Exception {
        mvc.perform(como(2, get(URL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidato.id").value(40))
                .andExpect(jsonPath("$.situacao")
                        .value("NAO_AVALIADO"))
                .andExpect(jsonPath("$.itens.length()").value(2))
                .andExpect(jsonPath("$.itens[0].criterioId")
                        .value(30))
                .andExpect(jsonPath("$.itens[1].criterioId")
                        .value(31))
                .andExpect(jsonPath("$.avaliadoPor").isEmpty())
                .andExpect(jsonPath("$.avaliadoEm").isEmpty());
    }

    // <-------------------AVALIAÇÃO ELEGÍVEL------------------->

    @Test
    void consideraElegivelQuandoTodosCriteriosSaoValidos()
            throws Exception {

        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                ),
                new RespostaCriterioEntrada(
                        31L, RespostaCriterio.AUSENTE
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao").value("ELEGIVEL"))
                .andExpect(jsonPath("$.candidato.elegibilidade")
                        .value("ELEGIVEL"))
                .andExpect(jsonPath("$.avaliadoPor")
                        .value("Pessoa 2"))
                .andExpect(jsonPath("$.avaliadoEm").exists());

        assertThat(candidato.getElegibilidade())
                .isEqualTo(SituacaoElegibilidade.ELEGIVEL);
    }

    // <-------------------AVALIAÇÃO INCOMPLETA------------------->

    @Test
    void permiteSalvarAvaliacaoIncompleta() throws Exception {
        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                ),
                new RespostaCriterioEntrada(31L, null)
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao")
                        .value("INCOMPLETA"))
                .andExpect(jsonPath("$.itens[0].resposta")
                        .value("ATENDIDO"))
                .andExpect(jsonPath("$.itens[1].resposta")
                        .isEmpty());
    }

    // <-------------------AVALIAÇÃO INELEGÍVEL------------------->

    @Test
    void consideraInelegivelQuandoInclusaoNaoFoiAtendida()
            throws Exception {

        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.NAO_ATENDIDO
                ),
                new RespostaCriterioEntrada(
                        31L, RespostaCriterio.AUSENTE
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao")
                        .value("INELEGIVEL"));
    }

    @Test
    void consideraInelegivelQuandoExclusaoEstaPresente()
            throws Exception {

        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                ),
                new RespostaCriterioEntrada(
                        31L, RespostaCriterio.PRESENTE
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao")
                        .value("INELEGIVEL"));
    }

    @Test
    void mantemIncompletaMesmoComCriterioReprovado()
            throws Exception {

        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.NAO_ATENDIDO
                ),
                new RespostaCriterioEntrada(31L, null)
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.situacao")
                        .value("INCOMPLETA"));
    }

    // <-------------------VALIDAÇÕES------------------->

    @Test
    void recusaAvaliacaoSemNenhumaResposta() throws Exception {
        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(30L, null),
                new RespostaCriterioEntrada(31L, null)
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("VALIDACAO_INVALIDA"));

        verify(avaliacoes, never()).save(any());
    }

    @Test
    void recusaRespostaIncompativelComTipoDoCriterio()
            throws Exception {

        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.PRESENTE
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("VALIDACAO_INVALIDA"));
    }

    @Test
    void recusaCriterioForaDoProtocolo() throws Exception {
        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        99L, RespostaCriterio.ATENDIDO
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("VALIDACAO_INVALIDA"));
    }

    @Test
    void recusaCriterioDuplicado() throws Exception {
        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                ),
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.NAO_ATENDIDO
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("VALIDACAO_INVALIDA"));
    }

    @Test
    void impedeAvaliacaoForaDoRecrutamento() throws Exception {
        ReflectionTestUtils.setField(
                estudo, "estado", EstadoEstudo.EXECUCAO
        );

        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                )
        ));

        mvc.perform(como(2, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("ESTADO_INVALIDO"));
    }

    // <-------------------PERMISSÕES------------------->

    @Test
    void impedePesquisadorDeAvaliar() throws Exception {
        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                )
        ));

        mvc.perform(como(1, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isForbidden());
    }

    @Test
    void impedeOutroCoordenadorDeAvaliar() throws Exception {
        var entrada = new AvaliacaoElegibilidadeEntrada(List.of(
                new RespostaCriterioEntrada(
                        30L, RespostaCriterio.ATENDIDO
                )
        ));

        mvc.perform(como(3, put(URL))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isNotFound());
    }

    @Test
    void impedeConsultaPorOutroCoordenador() throws Exception {
        mvc.perform(como(3, get(URL)))
                .andExpect(status().isNotFound());
    }

    @Test
    void impedeAvaliacaoDeCandidatoInexistente()
            throws Exception {

        mvc.perform(como(2,
                        get("/estudos/10/candidatos/99/elegibilidade")))
                .andExpect(status().isNotFound());
    }

    @Test
    void exigeCsrfParaSalvarAvaliacao() throws Exception {
        mvc.perform(put(URL)
                        .with(user(new UsuarioAutenticado(
                                contas.get(2L)
                        )))
                        .contentType("application/json")
                        .content("""
                                {
                                  "respostas": [
                                    {
                                      "criterioId": 30,
                                      "resposta": "ATENDIDO"
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    // <-------------------MÉTODOS AUXILIARES------------------->

    private Usuario conta(long id, PerfilUsuario perfil) {
        Usuario conta = new Usuario(
                "Pessoa " + id,
                "pessoa" + id + "@example.test",
                "hash-ficticio",
                perfil
        );

        ReflectionTestUtils.setField(conta, "id", id);
        contas.put(id, conta);

        return conta;
    }

    private MockHttpServletRequestBuilder como(
            long id,
            MockHttpServletRequestBuilder pedido) {

        return pedido
                .with(user(new UsuarioAutenticado(contas.get(id))))
                .with(csrf())
                .contentType("application/json");
    }
}
