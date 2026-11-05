package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.service.CandidatoService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaConsentimento;
import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoElegibilidade;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CandidatoController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class,
        CandidatoService.class
})
class CandidatoControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @MockitoBean
    private UsuarioRepository usuarios;

    @MockitoBean
    private EstudoRepository estudos;

    @MockitoBean
    private CandidatoRepository candidatos;

    private final Map<Long, Usuario> contas = new LinkedHashMap<>();
    private final Map<Long, Estudo> registros = new LinkedHashMap<>();

    @BeforeEach
    void prepararDados() {
        conta(1, PerfilUsuario.PESQUISADOR);
        conta(2, PerfilUsuario.COORDENADOR);
        conta(3, PerfilUsuario.COORDENADOR);

        Estudo estudo = estudo(10, 1);
        estudo.atribuirCoordenador(contas.get(2L));

        ReflectionTestUtils.setField(
                estudo, "estado", EstadoEstudo.RECRUTAMENTO
        );

        when(usuarios.findById(anyLong()))
                .thenAnswer(i -> Optional.ofNullable(
                        contas.get(i.getArgument(0))
                ));

        when(estudos.bloquearPorIdECoordenadorId(anyLong(), anyLong()))
                .thenAnswer(i -> Optional.ofNullable(
                        registros.get(i.getArgument(0))
                ).filter(e -> e.getCoordenador() != null
                        && e.getCoordenador().getId()
                                .equals(i.getArgument(1))));

        conta(4, PerfilUsuario.PESQUISADOR);
        when(estudos.findByIdAndResponsavelId(10L, 1L))
                .thenReturn(Optional.of(registros.get(10L)));

        when(estudos.findByIdAndCoordenadorId(anyLong(), anyLong()))
                .thenAnswer(i -> Optional.ofNullable(
                        registros.get(i.getArgument(0))
                ).filter(e -> e.getCoordenador() != null
                        && e.getCoordenador().getId()
                                .equals(i.getArgument(1))));

        when(candidatos.save(any(Candidato.class)))
                .thenAnswer(i -> {
                    Candidato candidato = i.getArgument(0);
                    ReflectionTestUtils.setField(
                            candidato, "id", 30L
                    );
                    return candidato;
                });
    }

    // <-------------------CADASTRO------------------->

    @Test
    void cadastraCandidatoNoEstudo() throws Exception {
        var entrada = new CandidatoCadastroEntrada(
                "Maria Silva",
                "maria@example.com"
        );

        mvc.perform(como(2, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(30))
                .andExpect(jsonPath("$.estudoId").value(10))
                .andExpect(jsonPath("$.nome").value("Maria Silva"))
                .andExpect(jsonPath("$.email").value("maria@example.com"))
                .andExpect(jsonPath("$.elegibilidade")
                        .value("NAO_AVALIADO"))
                .andExpect(jsonPath("$.consentimento")
                        .value("PENDENTE"));
    }

    @Test
    void normalizaNomeEEmail() throws Exception {
        var entrada = new CandidatoCadastroEntrada(
                "  Maria Silva  ",
                "  MARIA@EXAMPLE.COM  "
        );

        mvc.perform(como(2, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Maria Silva"))
                .andExpect(jsonPath("$.email").value("maria@example.com"));
    }

    @Test
    void recusaNomeEmBranco() throws Exception {
        var entrada = new CandidatoCadastroEntrada(
                "   ",
                "maria@example.com"
        );

        mvc.perform(como(2, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.nome").exists());

        verify(candidatos, never()).save(any());
    }

    @Test
    void recusaEmailInvalido() throws Exception {
        var entrada = new CandidatoCadastroEntrada(
                "Maria Silva",
                "email-invalido"
        );

        mvc.perform(como(2, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos.email").exists());

        verify(candidatos, never()).save(any());
    }

    @Test
    void recusaEmailDuplicado() throws Exception {
        when(candidatos.existsByEstudoIdAndEmailIgnoreCase(
                10L, "maria@example.com"
        )).thenReturn(true);

        var entrada = new CandidatoCadastroEntrada(
                "Maria Silva",
                "maria@example.com"
        );

        mvc.perform(como(2, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo")
                        .value("EMAIL_JA_CADASTRADO"));

        verify(candidatos, never()).save(any());
    }

    @Test
    void impedeCadastroForaDoRecrutamento() throws Exception {
        ReflectionTestUtils.setField(
                registros.get(10L),
                "estado",
                EstadoEstudo.PLANEJAMENTO
        );

        var entrada = new CandidatoCadastroEntrada(
                "Maria Silva",
                "maria@example.com"
        );

        mvc.perform(como(2, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("ESTADO_INVALIDO"));

        verify(candidatos, never()).save(any());
    }

    @Test
    void impedeCoordenadorDeOutroEstudo() throws Exception {
        var entrada = new CandidatoCadastroEntrada(
                "Maria Silva",
                "maria@example.com"
        );

        mvc.perform(como(3, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isNotFound());

        verify(candidatos, never()).save(any());
    }

    @Test
    void impedePesquisadorDeCadastrarCandidato() throws Exception {
        var entrada = new CandidatoCadastroEntrada(
                "Maria Silva",
                "maria@example.com"
        );

        mvc.perform(como(1, post("/estudos/10/candidatos"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isForbidden());

        verify(candidatos, never()).save(any());
    }

    // <-------------------LISTAGEM------------------->

    @Test
    void listaCandidatosDoEstudo() throws Exception {
        Candidato candidato = new Candidato(
                registros.get(10L),
                "Maria Silva",
                "maria@example.com"
        );

        ReflectionTestUtils.setField(
                candidato, "id", 30L
        );

        when(candidatos.findByEstudoIdOrderByIdAsc(10L))
                .thenReturn(List.of(candidato));

        mvc.perform(como(2, get("/estudos/10/candidatos")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(30))
                .andExpect(jsonPath("$[0].nome").value("Maria Silva"))
                .andExpect(jsonPath("$[0].elegibilidade")
                        .value("NAO_AVALIADO"));
    }

    @Test
    void listaCandidatoComElegibilidadeEConsentimentoAtualizados()
            throws Exception {
        Candidato candidato = new Candidato(
                registros.get(10L),
                "Maria Silva",
                "maria@example.com"
        );
        ReflectionTestUtils.setField(candidato, "id", 30L);
        candidato.atualizarElegibilidade(SituacaoElegibilidade.ELEGIVEL);
        candidato.registrarConsentimento(RespostaConsentimento.ACEITOU);
        when(candidatos.findByEstudoIdOrderByIdAsc(10L))
                .thenReturn(List.of(candidato));
        mvc.perform(como(2, get("/estudos/10/candidatos")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(30))
                .andExpect(jsonPath("$[0].elegibilidade").value("ELEGIVEL"))
                .andExpect(jsonPath("$[0].consentimento").value("ACEITOU"));
    }

    @Test
    void listaVaziaQuandoNaoHaCandidatos() throws Exception {
        mvc.perform(como(2, get("/estudos/10/candidatos")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void impedeListagemPorOutroCoordenador() throws Exception {
        mvc.perform(como(3, get("/estudos/10/candidatos")))
                .andExpect(status().isNotFound());
    }

    @Test
    void permitePesquisadorResponsavelListarCandidatos() throws Exception {
        mvc.perform(como(1, get("/estudos/10/candidatos")))
                .andExpect(status().isOk());
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

    private Estudo estudo(long id, long responsavel) {
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
        return estudo;
    }

    private MockHttpServletRequestBuilder como(
            long id,
            MockHttpServletRequestBuilder pedido) {

        return pedido
                .with(user(new UsuarioAutenticado(contas.get(id))))
                .with(csrf())
                .contentType("application/json");
    }

    // <-------------------LEITURA DO PESQUISADOR------------------->

    @Test
    void pesquisadorConsultaSeuEstudoMesmoEncerrado() throws Exception {
        ReflectionTestUtils.setField(registros.get(10L), "estado", EstadoEstudo.ENCERRADO);
        mvc.perform(como(1, get("/estudos/10/candidatos"))).andExpect(status().isOk());
    }

    @Test
    void pesquisadorNaoConsultaEstudoDeOutroResponsavel() throws Exception {
        mvc.perform(como(4, get("/estudos/10/candidatos"))).andExpect(status().isNotFound());
    }
}
