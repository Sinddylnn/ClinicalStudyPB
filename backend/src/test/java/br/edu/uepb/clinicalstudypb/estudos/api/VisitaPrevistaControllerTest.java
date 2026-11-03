package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.repository.AtividadePrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaPrevistaService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
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

@WebMvcTest(VisitaPrevistaController.class)
@Import({
        ConfiguracaoSeguranca.class,
        RespostaErroSeguranca.class,
        AutenticacaoService.class,
        VisitaPrevistaService.class
})
class VisitaPrevistaControllerTest {

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
    private VisitaPrevistaRepository visitas;

    @MockitoBean
    private AtividadePrevistaRepository atividades;

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
                        .filter(e -> e.getResponsavel().getId()
                                .equals(i.getArgument(1))));

        when(estudos.findByIdAndResponsavelId(anyLong(), anyLong()))
                .thenAnswer(i -> Optional.ofNullable(registros.get(i.getArgument(0)))
                        .filter(e -> e.getResponsavel().getId()
                                .equals(i.getArgument(1))));

        when(protocolos.save(any(Protocolo.class)))
                .thenAnswer(i -> {
                    Protocolo protocolo = i.getArgument(0);
                    ReflectionTestUtils.setField(protocolo, "id", 20L);
                    return protocolo;
                });

        when(visitas.save(any(VisitaPrevista.class)))
                .thenAnswer(i -> {
                    VisitaPrevista visita = i.getArgument(0);
                    ReflectionTestUtils.setField(visita, "id", 30L);
                    return visita;
                });

        when(atividades.save(any(AtividadePrevista.class)))
                .thenAnswer(i -> {
                    AtividadePrevista atividade = i.getArgument(0);
                    ReflectionTestUtils.setField(atividade, "id", 40L);
                    return atividade;
                });
    }

    @Test
    void cadastraVisitaPrevista() throws Exception {
        var entrada = new VisitaPrevistaCadastroEntrada(
                "Visita inicial",
                "Avaliação inicial do participante.",
                1
        );

        mvc.perform(como(1, post("/estudos/10/visitas"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(30))
                .andExpect(jsonPath("$.nome").value("Visita inicial"))
                .andExpect(jsonPath("$.descricao")
                        .value("Avaliação inicial do participante."))
                .andExpect(jsonPath("$.ordem").value(1))
                .andExpect(jsonPath("$.atividades").isArray());
    }

    @Test
    void normalizaDadosDaVisita() throws Exception {
        var entrada = new VisitaPrevistaCadastroEntrada(
                "  Visita inicial  ",
                "  Avaliação inicial.  ",
                1
        );

        mvc.perform(como(1, post("/estudos/10/visitas"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Visita inicial"))
                .andExpect(jsonPath("$.descricao")
                        .value("Avaliação inicial."));
    }

    @Test
    void recusaOrdemDuplicada() throws Exception {
        Protocolo protocolo = protocolo();

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(visitas.existsByProtocoloIdAndOrdem(20L, 1))
                .thenReturn(true);

        var entrada = new VisitaPrevistaCadastroEntrada(
                "Outra visita",
                null,
                1
        );

        mvc.perform(como(1, post("/estudos/10/visitas"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("ORDEM_VISITA_DUPLICADA"));

        verify(visitas, never()).save(any());
    }

    @Test
    void impedeCadastroForaDoPlanejamento() throws Exception {
        ReflectionTestUtils.setField(
                registros.get(10L),
                "estado",
                EstadoEstudo.RECRUTAMENTO
        );

        var entrada = new VisitaPrevistaCadastroEntrada(
                "Visita inicial",
                null,
                1
        );

        mvc.perform(como(1, post("/estudos/10/visitas"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo")
                        .value("ESTUDO_FORA_PLANEJAMENTO"));

        verify(visitas, never()).save(any());
    }

    @Test
    void cadastraAtividadeNaVisita() throws Exception {
        Protocolo protocolo = protocolo();
        VisitaPrevista visita = visita(protocolo, 30L, 1);

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(visitas.findByIdAndProtocoloId(30L, 20L))
                .thenReturn(Optional.of(visita));

        var entrada = new AtividadePrevistaCadastroEntrada(
                "Realizar aferição da pressão arterial."
        );

        mvc.perform(como(1, post("/estudos/10/visitas/30/atividades"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(40))
                .andExpect(jsonPath("$.descricao")
                        .value("Realizar aferição da pressão arterial."));
    }

    @Test
    void recusaAtividadeEmVisitaDeOutroEstudo() throws Exception {
        Protocolo protocolo = protocolo();

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(visitas.findByIdAndProtocoloId(99L, 20L))
                .thenReturn(Optional.empty());

        var entrada = new AtividadePrevistaCadastroEntrada(
                "Realizar aferição."
        );

        mvc.perform(como(1, post("/estudos/10/visitas/99/atividades"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isNotFound());

        verify(atividades, never()).save(any());
    }

    @Test
    void listaVisitasComAtividades() throws Exception {
        Protocolo protocolo = protocolo();

        VisitaPrevista primeira = visita(protocolo, 30L, 1);
        VisitaPrevista segunda = visita(protocolo, 31L, 2);

        AtividadePrevista atividade = new AtividadePrevista(
                primeira,
                "Realizar aferição."
        );

        ReflectionTestUtils.setField(atividade, "id", 40L);

        when(protocolos.findByEstudoId(10L))
                .thenReturn(Optional.of(protocolo));

        when(visitas.findByProtocoloIdOrderByOrdemAsc(20L))
                .thenReturn(List.of(primeira, segunda));

        when(atividades.findByVisitaPrevistaIdOrderByIdAsc(30L))
                .thenReturn(List.of(atividade));

        when(atividades.findByVisitaPrevistaIdOrderByIdAsc(31L))
                .thenReturn(List.of());

        mvc.perform(como(1, get("/estudos/10/visitas")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ordem").value(1))
                .andExpect(jsonPath("$[0].atividades[0].descricao")
                        .value("Realizar aferição."))
                .andExpect(jsonPath("$[1].ordem").value(2))
                .andExpect(jsonPath("$[1].atividades").isEmpty());
    }

    @Test
    void bloqueiaCoordenadorNosEndpointsDeVisita() throws Exception {
        mvc.perform(como(3, get("/estudos/10/visitas")))
                .andExpect(status().isForbidden());
    }

    private Protocolo protocolo() {
        Protocolo protocolo = new Protocolo(
                registros.get(10L),
                false
        );

        ReflectionTestUtils.setField(protocolo, "id", 20L);
        return protocolo;
    }

    private VisitaPrevista visita(
            Protocolo protocolo,
            Long id,
            Integer ordem) {

        VisitaPrevista visita = new VisitaPrevista(
                protocolo,
                "Visita " + ordem,
                "Descrição",
                ordem
        );

        ReflectionTestUtils.setField(visita, "id", id);
        return visita;
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
}
