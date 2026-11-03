package br.edu.uepb.clinicalstudypb.estudos.api;

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
import br.edu.uepb.clinicalstudypb.estudos.service.CriterioService;
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


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CriterioController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class,
        CriterioService.class
})
class CriterioControllerTest {

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

    private final Map<Long, Usuario> contas = new LinkedHashMap<>();
    private final Map<Long, Estudo> registros = new LinkedHashMap<>();

    @BeforeEach
    void prepararDados() {
        conta(1, PerfilUsuario.PESQUISADOR);
        conta(2, PerfilUsuario.PESQUISADOR);
        conta(3, PerfilUsuario.COORDENADOR);

        estudo(10, 1);

        when(usuarios.findById(anyLong()))
                .thenAnswer(i -> Optional.ofNullable(contas.get(i.getArgument(0))));

        when(estudos.bloquearPorIdEResponsavelId(anyLong(), anyLong()))
                .thenAnswer(i -> Optional.ofNullable(registros.get(i.getArgument(0)))
                        .filter(e -> e.getResponsavel().getId().equals(i.getArgument(1))));

        when(estudos.findByIdAndResponsavelId(anyLong(), anyLong()))
                .thenAnswer(i -> Optional.ofNullable(registros.get(i.getArgument(0)))
                        .filter(e -> e.getResponsavel().getId().equals(i.getArgument(1))));

        when(estudos.findByIdAndCoordenadorId(anyLong(), anyLong()))
                .thenAnswer(i -> Optional.ofNullable(registros.get(i.getArgument(0)))
                        .filter(e -> e.getCoordenador() != null
                                && e.getCoordenador().getId().equals(i.getArgument(1))));

        when(protocolos.save(any(Protocolo.class)))
                .thenAnswer(i -> {
                    Protocolo protocolo = i.getArgument(0);
                    ReflectionTestUtils.setField(protocolo, "id", 20L);
                    return protocolo;
                });

        when(criterios.save(any(Criterio.class)))
                .thenAnswer(i -> {
                    Criterio criterio = i.getArgument(0);
                    ReflectionTestUtils.setField(criterio, "id", 30L);
                    return criterio;
                });
    }

    @Test
    void cadastraCriterioDeInclusao() throws Exception {
        var entrada = new CriterioCadastroEntrada(
                TipoCriterio.INCLUSAO,
                "Ter idade igual ou superior a 18 anos."
        );

        mvc.perform(como(1, post("/estudos/10/criterios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(30))
                .andExpect(jsonPath("$.tipo").value("INCLUSAO"))
                .andExpect(jsonPath("$.descricao")
                        .value("Ter idade igual ou superior a 18 anos."));
    }

    @Test
    void normalizaDescricaoAntesDoCadastro() throws Exception {
        var entrada = new CriterioCadastroEntrada(
                TipoCriterio.EXCLUSAO,
                "  Participar de outro estudo clínico.  "
        );

        mvc.perform(como(1, post("/estudos/10/criterios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.descricao")
                        .value("Participar de outro estudo clínico."));
    }

    @Test
    void recusaDescricaoEmBranco() throws Exception {
        var entrada = new CriterioCadastroEntrada(
                TipoCriterio.INCLUSAO,
                "   "
        );

        mvc.perform(como(1, post("/estudos/10/criterios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.descricao").exists());

        verify(criterios, never()).save(any());
    }

    @Test
    void impedeAlteracaoForaDoPlanejamento() throws Exception {
        ReflectionTestUtils.setField(
                registros.get(10L),
                "estado",
                EstadoEstudo.RECRUTAMENTO
        );

        var entrada = new CriterioCadastroEntrada(
                TipoCriterio.INCLUSAO,
                "Ter idade igual ou superior a 18 anos."
        );

        mvc.perform(como(1, post("/estudos/10/criterios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("ESTUDO_FORA_PLANEJAMENTO"));

        verify(criterios, never()).save(any());
    }

    @Test
    void impedePesquisadorDeAlterarEstudoDeOutroResponsavel() throws Exception {
        var entrada = new CriterioCadastroEntrada(
                TipoCriterio.INCLUSAO,
                "Ter idade igual ou superior a 18 anos."
        );

        mvc.perform(como(2, post("/estudos/10/criterios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isNotFound());

        verify(criterios, never()).save(any());
    }

    @Test
    void permiteDeclararAusenciaDeCriteriosDeExclusao() throws Exception {
        Protocolo protocolo = new Protocolo(registros.get(10L), false);
        ReflectionTestUtils.setField(protocolo, "id", 20L);

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(criterios.existsByProtocoloIdAndTipo(
                20L,
                TipoCriterio.EXCLUSAO
        )).thenReturn(false);

        var entrada = new CriterioExclusaoConfiguracaoEntrada(true);

        mvc.perform(como(1, put("/estudos/10/criterios/exclusao"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.semCriteriosExclusao")
                        .value(true));
    }

    @Test
    void recusaDeclararAusenciaQuandoExistemCriteriosDeExclusao()
            throws Exception {

        Protocolo protocolo = new Protocolo(registros.get(10L), false);
        ReflectionTestUtils.setField(protocolo, "id", 20L);

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(criterios.existsByProtocoloIdAndTipo(
                20L,
                TipoCriterio.EXCLUSAO
        )).thenReturn(true);

        var entrada = new CriterioExclusaoConfiguracaoEntrada(true);

        mvc.perform(como(1, put("/estudos/10/criterios/exclusao"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("CRITERIOS_EXCLUSAO_INCONSISTENTES"));
    }

    @Test
    void recusaExclusaoEnquantoDeclaracaoEstiverMarcada()
            throws Exception {

        Protocolo protocolo = new Protocolo(registros.get(10L), true);
        ReflectionTestUtils.setField(protocolo, "id", 20L);

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        var entrada = new CriterioCadastroEntrada(
                TipoCriterio.EXCLUSAO,
                "Não participar de outro estudo clínico."
        );

        mvc.perform(como(1, post("/estudos/10/criterios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("CRITERIOS_EXCLUSAO_INCONSISTENTES"));

        org.junit.jupiter.api.Assertions.assertTrue(protocolo.isSemCriteriosExclusao());
        verify(criterios, never()).save(any());
    }

    @Test
    void bloqueiaCoordenadorNaConfiguracaoDeExclusao()
            throws Exception {

        var entrada = new CriterioExclusaoConfiguracaoEntrada(true);

        mvc.perform(como(3, put("/estudos/10/criterios/exclusao"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isForbidden());
    }

    @Test
    void listaCriteriosDoEstudo() throws Exception {
        Protocolo protocolo = new Protocolo(registros.get(10L), false);
        ReflectionTestUtils.setField(protocolo, "id", 20L);

        Criterio inclusao = new Criterio(
                protocolo,
                TipoCriterio.INCLUSAO,
                "Ter idade igual ou superior a 18 anos."
        );
        ReflectionTestUtils.setField(inclusao, "id", 30L);

        Criterio exclusao = new Criterio(
                protocolo,
                TipoCriterio.EXCLUSAO,
                "Não participar de outro estudo."
        );
        ReflectionTestUtils.setField(exclusao, "id", 31L);

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(criterios.findByProtocoloIdOrderByIdAsc(20L))
                .thenReturn(List.of(inclusao, exclusao));

        mvc.perform(como(1, get("/estudos/10/criterios")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipo").value("INCLUSAO"))
                .andExpect(jsonPath("$[1].tipo").value("EXCLUSAO"));
    }

    @Test
    void bloqueiaCoordenadorNosEndpointsDeCriterio() throws Exception {
        mvc.perform(como(3, get("/estudos/10/criterios")))
                .andExpect(status().isNotFound());
    }

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

    private void estudo(long id, long responsavel) {
        LocalDate data = LocalDate.of(2026, 11, 1);

        Estudo estudo = new Estudo(
                "Estudo " + id,
                "Objetivo",
                contas.get(responsavel),
                data,
                data,
                10
        );

        ReflectionTestUtils.setField(estudo, "id", id);
        registros.put(id, estudo);
    }

    private MockHttpServletRequestBuilder como(
            long id,
            MockHttpServletRequestBuilder pedido) {

        return pedido
                .with(user(new UsuarioAutenticado(contas.get(id))))
                .with(csrf())
                .contentType("application/json");
    }

    // <-------------------CONSULTAS E ALTERAÇÕES DO PROTOCOLO------------------->

    @Test
    void consultaDeclaracaoSemCriarProtocoloERecuperaValorSalvo() throws Exception {
        mvc.perform(como(1, get("/estudos/10/criterios/exclusao")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.semCriteriosExclusao").value(false));
        verify(protocolos, never()).save(any());
        Protocolo protocolo = configurarCriterio();
        protocolo.definirSemCriteriosExclusao(true);
        mvc.perform(como(1, get("/estudos/10/criterios/exclusao")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.semCriteriosExclusao").value(true));
    }

    @Test
    void coordenadorVinculadoConsultaMasNaoAlteraMesmoAposEncerramento() throws Exception {
        ReflectionTestUtils.setField(registros.get(10L), "coordenador", contas.get(3L));
        ReflectionTestUtils.setField(registros.get(10L), "estado", EstadoEstudo.ENCERRADO);
        for (String caminho : List.of("/estudos/10/criterios", "/estudos/10/criterios/exclusao")) {
            mvc.perform(como(3, get(caminho))).andExpect(status().isOk());
            mvc.perform(como(2, get(caminho))).andExpect(status().isNotFound());
        }
        mvc.perform(como(3, delete("/estudos/10/criterios/30"))).andExpect(status().isForbidden());
    }

    @Test
    void editaERemoveCriterioPreservandoIdentidadeEDeclaracao() throws Exception {
        Protocolo protocolo = configurarCriterio();
        mvc.perform(como(1, put("/estudos/10/criterios/30"))
                .content(json.writeValueAsString(new CriterioCadastroEntrada(TipoCriterio.EXCLUSAO, " Nova descrição "))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(30))
                .andExpect(jsonPath("$.descricao").value("Nova descrição"));
        mvc.perform(como(1, delete("/estudos/10/criterios/30"))).andExpect(status().isNoContent());
        verify(criterios).delete(any(Criterio.class));
        org.junit.jupiter.api.Assertions.assertFalse(protocolo.isSemCriteriosExclusao());
    }

    @Test
    void rejeitaTrocaParaExclusaoComDeclaracaoMarcada() throws Exception {
        configurarCriterio().definirSemCriteriosExclusao(true);
        mvc.perform(como(1, put("/estudos/10/criterios/30"))
                .content(json.writeValueAsString(new CriterioCadastroEntrada(TipoCriterio.EXCLUSAO, "Exclusão"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("CRITERIOS_EXCLUSAO_INCONSISTENTES"));
    }

    @Test
    void naoAlteraCriterioDeOutroProtocolo() throws Exception {
        configurarCriterio();
        mvc.perform(como(1, delete("/estudos/10/criterios/99"))).andExpect(status().isNotFound());
        mvc.perform(como(1, put("/estudos/10/criterios/99"))
                .content(json.writeValueAsString(new CriterioCadastroEntrada(TipoCriterio.INCLUSAO, "Inclusão"))))
                .andExpect(status().isNotFound());
        verify(criterios, never()).delete(any(Criterio.class));
    }

    private Protocolo configurarCriterio() {
        Protocolo protocolo = new Protocolo(registros.get(10L), false);
        ReflectionTestUtils.setField(protocolo, "id", 20L);
        Criterio criterio = new Criterio(protocolo, TipoCriterio.INCLUSAO, "Inclusão");
        ReflectionTestUtils.setField(criterio, "id", 30L);
        when(protocolos.findByEstudoId(10L)).thenReturn(Optional.of(protocolo));
        when(criterios.findByIdAndProtocoloId(30L, 20L)).thenReturn(Optional.of(criterio));
        return protocolo;
    }

    @Test
    void protegeNovaOperacao0() throws Exception {
        mvc.perform(como(2, put("/estudos/10/criterios/30").content("{\"tipo\":\"INCLUSAO\",\"descricao\":\"Inclusão\"}"))).andExpect(status().isNotFound());
        mvc.perform(como(3, put("/estudos/10/criterios/30").content("{\"tipo\":\"INCLUSAO\",\"descricao\":\"Inclusão\"}"))).andExpect(status().isForbidden());
        mvc.perform(put("/estudos/10/criterios/30").content("{\"tipo\":\"INCLUSAO\",\"descricao\":\"Inclusão\"}").with(user(new UsuarioAutenticado(contas.get(1L))))
                .contentType("application/json")).andExpect(status().isForbidden());
        mvc.perform(put("/estudos/10/criterios/30").content("{\"tipo\":\"INCLUSAO\",\"descricao\":\"Inclusão\"}").with(csrf()).contentType("application/json"))
                .andExpect(status().isUnauthorized());
        for (EstadoEstudo estado : List.of(EstadoEstudo.RECRUTAMENTO, EstadoEstudo.EXECUCAO, EstadoEstudo.ENCERRADO)) {
            ReflectionTestUtils.setField(registros.get(10L), "estado", estado);
            mvc.perform(como(1, put("/estudos/10/criterios/30").content("{\"tipo\":\"INCLUSAO\",\"descricao\":\"Inclusão\"}"))).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_PLANEJAMENTO"));
        }
    }

    @Test
    void protegeNovaOperacao1() throws Exception {
        mvc.perform(como(2, delete("/estudos/10/criterios/30").content("{}"))).andExpect(status().isNotFound());
        mvc.perform(como(3, delete("/estudos/10/criterios/30").content("{}"))).andExpect(status().isForbidden());
        mvc.perform(delete("/estudos/10/criterios/30").content("{}").with(user(new UsuarioAutenticado(contas.get(1L))))
                .contentType("application/json")).andExpect(status().isForbidden());
        mvc.perform(delete("/estudos/10/criterios/30").content("{}").with(csrf()).contentType("application/json"))
                .andExpect(status().isUnauthorized());
        for (EstadoEstudo estado : List.of(EstadoEstudo.RECRUTAMENTO, EstadoEstudo.EXECUCAO, EstadoEstudo.ENCERRADO)) {
            ReflectionTestUtils.setField(registros.get(10L), "estado", estado);
            mvc.perform(como(1, delete("/estudos/10/criterios/30").content("{}"))).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.codigo").value("ESTUDO_FORA_PLANEJAMENTO"));
        }
    }
}
