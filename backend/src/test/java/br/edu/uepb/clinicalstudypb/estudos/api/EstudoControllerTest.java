package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.service.EstudoService;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// <-------------------CADASTRO E ISOLAMENTO DOS ESTUDOS------------------->
/**
 * Exercita HTTP, validação, segurança e serviço de estudos com repositórios simulados.
 *
 * <p>Os testes de persistência ficam separados para usar PostgreSQL real.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 25/10/2026
 */
@WebMvcTest(EstudoController.class)
@Import({ConfiguracaoSeguranca.class, RespostaErroSeguranca.class,
        AutenticacaoService.class, EstudoService.class})
class EstudoControllerTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @MockitoBean private UsuarioRepository usuarios;
    @MockitoBean private EstudoRepository estudos;

    private final Map<Long, Usuario> contas = new LinkedHashMap<>();
    private final Map<Long, Estudo> registros = new LinkedHashMap<>();

    /**
     * Prepara dois pesquisadores e coordenadores com conjuntos diferentes de estudos.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararDados() {
        conta(1, PerfilUsuario.PESQUISADOR);
        conta(2, PerfilUsuario.PESQUISADOR);
        conta(3, PerfilUsuario.COORDENADOR);
        conta(4, PerfilUsuario.COORDENADOR);
        conta(5, PerfilUsuario.ADMINISTRADOR);
        conta(6, PerfilUsuario.PARTICIPANTE);
        conta(7, PerfilUsuario.COORDENADOR);
        conta(8, PerfilUsuario.COORDENADOR).desativar();
        estudo(10, 1, 3L);
        estudo(11, 2, 3L);
        estudo(12, 1, 4L);
        estudo(13, 2, null);

        when(usuarios.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(contas.get(i.getArgument(0))));
        when(usuarios.bloquearPorIds(anyCollection())).thenAnswer(i ->
                i.<Collection<Long>>getArgument(0).stream().distinct().sorted()
                        .map(contas::get).filter(Objects::nonNull).toList());
        when(usuarios.findByPerfilAndAtivoTrueOrderByNomeAscIdAsc(PerfilUsuario.COORDENADOR))
                .thenAnswer(i -> contas.values().stream()
                        .filter(u -> u.isAtivo() && u.getPerfil() == PerfilUsuario.COORDENADOR)
                        .sorted(Comparator.comparing(Usuario::getNome).thenComparing(Usuario::getId)).toList());
        when(estudos.findByResponsavelId(anyLong())).thenAnswer(i -> registros.values().stream()
                .filter(e -> e.getResponsavel().getId().equals(i.getArgument(0))).toList());
        when(estudos.findByCoordenadorId(anyLong())).thenAnswer(i -> registros.values().stream()
                .filter(e -> e.getCoordenador() != null
                        && e.getCoordenador().getId().equals(i.getArgument(0))).toList());
        when(estudos.findByIdAndResponsavelId(anyLong(), anyLong())).thenAnswer(i ->
                Optional.ofNullable(registros.get(i.getArgument(0)))
                        .filter(e -> e.getResponsavel().getId().equals(i.getArgument(1))));
        when(estudos.save(any(Estudo.class))).thenAnswer(i -> {
            Estudo novo = i.getArgument(0);
            ReflectionTestUtils.setField(novo, "id", 100L);
            registros.put(100L, novo);
            return novo;
        });
    }

    // <-------------------CADASTRO E VALIDAÇÃO------------------->

    /**
     * Aceita o cadastro inicial sem coordenador e usa a identidade da sessão.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void cadastraSemCoordenadorComDatasIguais() throws Exception {
        mvc.perform(como(1, post("/estudos")).content(json.writeValueAsString(entrada())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.responsavelId").value(1))
                .andExpect(jsonPath("$.estado").value("PLANEJAMENTO"))
                .andExpect(jsonPath("$.titulo").value("Estudo novo"))
                .andExpect(jsonPath("$.dataInicio").value("2026-11-01"))
                .andExpect(jsonPath("$.dataFim").value("2026-11-01"))
                .andExpect(jsonPath("$.coordenadorId").doesNotExist());
        assertThat(registros.get(100L).getCoordenador()).isNull();
    }

    /**
     * Permite definir um coordenador ativo já no cadastro.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void cadastraComCoordenador() throws Exception {
        var entrada = entrada();
        entrada.put("coordenadorId", 3);
        mvc.perform(como(1, post("/estudos")).content(json.writeValueAsString(entrada)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.coordenadorId").value(3));
        assertThat(registros.get(100L).getCoordenador()).isSameAs(contas.get(3L));
    }

    /**
     * Recusa contas com perfil diferente e coordenadores desativados nas duas operações.
     *
     * @param id identificador de uma conta inapta
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(longs = {1, 2, 5, 6, 8})
    void recusaCoordenadorInvalido(long id) throws Exception {
        var entrada = entrada();
        entrada.put("coordenadorId", id);
        mvc.perform(como(1, post("/estudos")).content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("COORDENADOR_INVALIDO"));
        mvc.perform(como(1, put("/estudos/10/coordenador"))
                        .content(json.writeValueAsString(new CoordenadorEntrada(id))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("COORDENADOR_INVALIDO"));
        verify(estudos, never()).save(any());
        assertThat(registros.get(10L).getCoordenador().getId()).isEqualTo(3L);
    }

    /**
     * Informa conta inexistente sem criar estudo nem alterar o vínculo anterior.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void recusaCoordenadorInexistente() throws Exception {
        var entrada = entrada();
        entrada.put("coordenadorId", 999);
        mvc.perform(como(1, post("/estudos")).content(json.writeValueAsString(entrada)))
                .andExpect(status().isNotFound());
        mvc.perform(como(1, put("/estudos/10/coordenador")).content("{\"coordenadorId\":999}"))
                .andExpect(status().isNotFound());
        verify(estudos, never()).save(any());
    }

    /**
     * Confere campos obrigatórios, limites e identificadores antes de persistir.
     *
     * @param campo campo inválido
     * @param valor valor recusado
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @MethodSource("camposInvalidos")
    void recusaCamposInvalidos(String campo, Object valor) throws Exception {
        var entrada = entrada();
        entrada.put(campo, valor);
        mvc.perform(como(1, post("/estudos")).content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos." + campo).exists());
        verify(estudos, never()).save(any());
    }

    /**
     * Fornece entradas que violam o contrato do cadastro.
     *
     * @return campos e valores inválidos
     * @since 1.0
     */
    static Stream<Arguments> camposInvalidos() {
        return Stream.of(Arguments.of("titulo", " "), Arguments.of("titulo", "a".repeat(151)),
                Arguments.of("objetivo", ""), Arguments.of("objetivo", "a".repeat(2001)),
                Arguments.of("dataInicio", null), Arguments.of("dataFim", null),
                Arguments.of("limiteParticipantes", 0), Arguments.of("limiteParticipantes", -1),
                Arguments.of("limiteParticipantes", null), Arguments.of("coordenadorId", 0));
    }

    /**
     * Mantém o erro de regra de negócio utilizado pelo formulário web.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void recusaPeriodoInvertido() throws Exception {
        var entrada = entrada();
        entrada.put("dataFim", "2026-10-31");
        mvc.perform(como(1, post("/estudos")).content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.codigo").value("DATA_INVALIDA"));
        verify(estudos, never()).save(any());
    }

    // <-------------------LISTAGEM E ATRIBUIÇÃO------------------->

    /**
     * Distingue vínculo por pesquisador, por coordenador e ausência de vínculos.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void filtraPorResponsavelEPorCoordenador() throws Exception {
        mvc.perform(como(1, get("/estudos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", containsInAnyOrder(10, 12)));
        mvc.perform(como(3, get("/estudos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", containsInAnyOrder(10, 11)));
        mvc.perform(como(4, get("/estudos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", containsInAnyOrder(12)));
        mvc.perform(como(7, get("/estudos"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        verify(estudos, never()).findAll();
    }

    /**
     * Atribui depois do cadastro e retira da listagem do coordenador substituído.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void atribuiDepoisESubstituiCoordenador() throws Exception {
        mvc.perform(como(2, put("/estudos/13/coordenador")).content("{\"coordenadorId\":4}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.coordenadorId").value(4));
        for (int tentativa = 0; tentativa < 2; tentativa++) {
            mvc.perform(como(1, put("/estudos/10/coordenador")).content("{\"coordenadorId\":4}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.coordenadorId").value(4));
        }
        mvc.perform(como(3, get("/estudos"))).andExpect(jsonPath("$[*].id", containsInAnyOrder(11)));
        mvc.perform(como(4, get("/estudos"))).andExpect(jsonPath("$[*].id", containsInAnyOrder(10, 12, 13)));
    }

    /**
     * Não revela nem altera um estudo pertencente a outro pesquisador.
     *
     * @param id estudo alheio ou inexistente
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(longs = {11, 999})
    void recusaAtribuicaoEmEstudoAlheioOuInexistente(long id) throws Exception {
        mvc.perform(como(1, put("/estudos/" + id + "/coordenador")).content("{\"coordenadorId\":4}"))
                .andExpect(status().isNotFound());
        assertThat(registros.get(11L).getCoordenador().getId()).isEqualTo(3L);
    }

    /**
     * Exige uma escolha válida para atribuir e não interpreta ausência como remoção.
     *
     * @param corpo JSON inválido para a atribuição
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"coordenadorId\":null}", "{\"coordenadorId\":0}"})
    void recusaAtribuicaoSemEscolha(String corpo) throws Exception {
        mvc.perform(como(1, put("/estudos/10/coordenador")).content(corpo))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errosCampos.coordenadorId").exists());
        assertThat(registros.get(10L).getCoordenador().getId()).isEqualTo(3L);
    }

    /**
     * Oferece opções ativas ao pesquisador sem expor e-mail, senha ou hash.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void listaSomenteCoordenadoresAtivosComDadosMinimos() throws Exception {
        mvc.perform(como(1, get("/estudos/coordenadores"))).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", containsInAnyOrder(3, 4, 7)))
                .andExpect(jsonPath("$[0].nome").exists())
                .andExpect(jsonPath("$[0].email").doesNotExist())
                .andExpect(jsonPath("$[0].senhaHash").doesNotExist());
    }

    // <-------------------SESSÃO, PERFIS E CSRF------------------->

    /**
     * Preserva a distinção entre falta de sessão e falta de CSRF.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void exigeSessaoEProtecaoCsrf() throws Exception {
        mvc.perform(get("/estudos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/estudos/coordenadores")).andExpect(status().isUnauthorized());
        mvc.perform(put("/estudos/10/coordenador").with(csrf())
                        .contentType("application/json").content("{\"coordenadorId\":4}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/estudos/10/coordenador").with(user(new UsuarioAutenticado(contas.get(1L))))
                        .contentType("application/json").content("{\"coordenadorId\":4}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
        mvc.perform(post("/estudos").with(user(new UsuarioAutenticado(contas.get(1L))))
                        .contentType("application/json").content(json.writeValueAsString(entrada())))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
    }

    /**
     * Mantém cadastro, seleção e atribuição exclusivos de pesquisadores.
     *
     * @param id conta de coordenador, administrador ou participante
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(longs = {3, 5, 6})
    void negaOperacoesDePesquisadorAOutrosPerfis(long id) throws Exception {
        mvc.perform(como(id, post("/estudos")).content(json.writeValueAsString(entrada())))
                .andExpect(status().isForbidden());
        mvc.perform(como(id, put("/estudos/10/coordenador")).content("{\"coordenadorId\":4}"))
                .andExpect(status().isForbidden());
        mvc.perform(como(id, get("/estudos/coordenadores"))).andExpect(status().isForbidden());
        if (id != 3) {
            mvc.perform(como(id, get("/estudos"))).andExpect(status().isForbidden());
        }
    }

    /**
     * Interrompe a sessão quando a conta pesquisadora deixa de estar ativa.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void recusaContaDesativada() throws Exception {
        contas.get(1L).desativar();
        mvc.perform(como(1, get("/estudos"))).andExpect(status().isUnauthorized());
    }

    // <-------------------DADOS E REQUISIÇÕES DOS TESTES------------------->

    /**
     * Monta um cadastro válido que não exige coordenador.
     *
     * @return dados editáveis usados em cada cenário
     * @since 1.0
     */
    private Map<String, Object> entrada() {
        return new LinkedHashMap<>(Map.of("titulo", "  Estudo novo  ", "objetivo", "Objetivo fictício",
                "dataInicio", "2026-11-01", "dataFim", "2026-11-01", "limiteParticipantes", 10));
    }

    /**
     * Cria uma conta fictícia sem utilizar banco de dados.
     *
     * @param id identificador da conta
     * @param perfil função no sistema
     * @return conta registrada na simulação
     * @since 1.0
     */
    private Usuario conta(long id, PerfilUsuario perfil) {
        Usuario conta = new Usuario("Pessoa " + id, "pessoa" + id + "@example.test", "hash-ficticio", perfil);
        ReflectionTestUtils.setField(conta, "id", id);
        contas.put(id, conta);
        return conta;
    }

    /**
     * Cria um estudo pertencente ao pesquisador e ao coordenador indicados.
     *
     * @param id identificador do estudo
     * @param responsavel pesquisador responsável
     * @param coordenador coordenador opcional
     * @since 1.0
     */
    private void estudo(long id, long responsavel, Long coordenador) {
        LocalDate data = LocalDate.of(2026, 11, 1);
        Estudo estudo = new Estudo("Estudo " + id, "Objetivo", contas.get(responsavel), data, data, 10);
        ReflectionTestUtils.setField(estudo, "id", id);
        if (coordenador != null) {
            estudo.atribuirCoordenador(contas.get(coordenador));
        }
        registros.put(id, estudo);
    }

    /**
     * Prepara identidade e CSRF para exercitar os filtros reais.
     *
     * @param id conta autenticada
     * @param pedido operação HTTP
     * @return requisição preparada para o cenário
     * @since 1.0
     */
    private MockHttpServletRequestBuilder como(long id, MockHttpServletRequestBuilder pedido) {
        return pedido.with(user(new UsuarioAutenticado(contas.get(id)))).with(csrf())
                .contentType("application/json");
    }
}
