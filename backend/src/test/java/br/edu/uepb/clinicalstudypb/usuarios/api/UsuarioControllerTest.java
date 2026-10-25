package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.ConfiguracaoSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.RespostaErroSeguranca;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.usuarios.service.AutenticacaoService;
import br.edu.uepb.clinicalstudypb.usuarios.service.UsuarioService;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// <-------------------REGRESSÕES DA REVISÃO DE GESTÃO DE USUÁRIOS------------------->
/**
 * Confere validações, acesso e regras de usuários com controller e serviço reais.
 *
 * <p>O repositório é simulado. A execução de SQL, transações e bloqueios
 * concorrentes precisa de testes de integração com PostgreSQL.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 23/10/2026
 */
@WebMvcTest(UsuarioController.class)
@Import({ConfiguracaoSeguranca.class, RespostaErroSeguranca.class,
        AutenticacaoService.class, UsuarioService.class})
class UsuarioControllerTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper json;
    @Autowired
    private PasswordEncoder senhas;
    @MockitoBean
    private UsuarioRepository usuarios;
    @MockitoBean
    private EstudoRepository estudos;

    private final Map<Long, Usuario> contas = new HashMap<>();
    private Usuario administrador;

    /**
     * Prepara contas fictícias e consultas que refletem as alterações do serviço.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararContas() {
        administrador = conta(1L, PerfilUsuario.ADMINISTRADOR);
        contas.put(1L, administrador);
        contas.put(2L, conta(2L, PerfilUsuario.PESQUISADOR));
        when(usuarios.findById(anyLong())).thenAnswer(i -> Optional.ofNullable(contas.get(i.getArgument(0))));
        when(usuarios.bloquearPorIds(anyCollection())).thenAnswer(i ->
                i.<Collection<Long>>getArgument(0).stream().distinct().sorted()
                        .map(contas::get).filter(java.util.Objects::nonNull).toList());
        when(usuarios.buscarPorEmail(anyString())).thenAnswer(i -> contas.values().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(i.getArgument(0))).findFirst());
        when(usuarios.countByPerfilAndAtivoTrue(PerfilUsuario.ADMINISTRADOR))
                .thenAnswer(i -> contas.values().stream()
                        .filter(u -> u.isAtivo() && u.getPerfil() == PerfilUsuario.ADMINISTRADOR).count());
        when(usuarios.save(any(Usuario.class))).thenAnswer(i -> {
            Usuario nova = i.getArgument(0);
            ReflectionTestUtils.setField(nova, "id", 10L);
            contas.put(10L, nova);
            return nova;
        });
    }

    // <-------------------VALIDAÇÕES DO CADASTRO------------------->

    /**
     * Recusa o cadastro quando um campo obrigatório não é informado.
     *
     * @param campo campo que deve apresentar erro de validação
     * @param entrada dados enviados no cadastro
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @MethodSource("camposObrigatoriosCadastro")
    void recusaCamposObrigatoriosNoCadastro(
            String campo,
            UsuarioCadastroEntrada entrada) throws Exception {

        mvc.perform(comoAdmin(post("/usuarios"))
                        .content(json.writeValueAsString(entrada)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos." + campo).exists());

        verify(usuarios, never()).save(any());
    }

    /**
     * Fornece exemplos de campos obrigatórios ausentes no cadastro.
     *
     * @return campos e entradas inválidas
     * @since 1.0
     */
    static Stream<Arguments> camposObrigatoriosCadastro() {
        return Stream.of(
                Arguments.of("nome",
                        new UsuarioCadastroEntrada(
                                " ",
                                "nova@example.test",
                                "SenhaFicticia123",
                                PerfilUsuario.PESQUISADOR
                        )),
                Arguments.of("email",
                        new UsuarioCadastroEntrada(
                                "Pessoa fictícia",
                                " ",
                                "SenhaFicticia123",
                                PerfilUsuario.PESQUISADOR
                        )),
                Arguments.of("senha",
                        new UsuarioCadastroEntrada(
                                "Pessoa fictícia",
                                "nova@example.test",
                                " ",
                                PerfilUsuario.PESQUISADOR
                        )),
                Arguments.of("perfil",
                        new UsuarioCadastroEntrada(
                                "Pessoa fictícia",
                                "nova@example.test",
                                "SenhaFicticia123",
                                null
                        ))
        );
    }

    /**
     * Recusa o cadastro quando o formato do e-mail é inválido.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void recusaEmailInvalidoNoCadastro() throws Exception {
        mvc.perform(comoAdmin(post("/usuarios"))
                        .content(json.writeValueAsString(
                                new UsuarioCadastroEntrada(
                                        "Pessoa fictícia",
                                        "email-invalido",
                                        "SenhaFicticia123",
                                        PerfilUsuario.PESQUISADOR
                                ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos.email").exists());

        verify(usuarios, never()).save(any());
    }

    /**
     * Normaliza nome e e-mail antes de salvar o novo usuário.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void normalizaNomeEEmailNoCadastro() throws Exception {
        mvc.perform(comoAdmin(post("/usuarios"))
                        .content(json.writeValueAsString(
                                new UsuarioCadastroEntrada(
                                        "  Pessoa Teste  ",
                                        "  NOVA@EXAMPLE.TEST  ",
                                        "SenhaFicticia123",
                                        PerfilUsuario.PESQUISADOR
                                ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nome").value("Pessoa Teste"))
                .andExpect(jsonPath("$.email").value("nova@example.test"));

        assertThat(contas.get(10L).getNome()).isEqualTo("Pessoa Teste");
        assertThat(contas.get(10L).getEmail()).isEqualTo("nova@example.test");
    }

    /**
     * Confere o limite em bytes, inclusive quando há acentos na senha.
     *
     * @param senha senha fictícia no limite ou acima dele
     * @param codigo status HTTP esperado
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @MethodSource("limitesSenha")
    void validaSenhaAntesDeCodificar(String senha, int codigo) throws Exception {
        var resultado = mvc.perform(comoAdmin(post("/usuarios"))
                        .content(json.writeValueAsString(new UsuarioCadastroEntrada(
                                "Pessoa fictícia", "nova@example.test", senha, PerfilUsuario.PESQUISADOR))))
                .andExpect(status().is(codigo));
        if (codigo == 400) {
            resultado.andExpect(jsonPath("$.codigo").value("SENHA_MUITO_LONGA"));
            verify(usuarios, never()).save(any());
        } else {
            resultado.andExpect(jsonPath("$.senhaHash").doesNotExist());
            assertThat(senhas.matches(senha, contas.get(10L).getSenhaHash())).isTrue();
        }
    }

    /**
     * Fornece exemplos que distinguem bytes de caracteres.
     *
     * @return entradas e seus resultados esperados
     * @since 1.0
     */
    static Stream<Arguments> limitesSenha() {
        return Stream.of(Arguments.of("a".repeat(72), 201), Arguments.of("a".repeat(73), 400),
                Arguments.of("á".repeat(36), 201), Arguments.of("á".repeat(37), 400));
    }

    /**
     * Recusa nomes e e-mails maiores que as colunas antes de acessar a persistência.
     *
     * @param campo campo que ultrapassa o limite
     * @param valor valor inválido
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @MethodSource("camposLongos")
    void recusaCamposLongosNoCadastroENaEdicao(String campo, String valor) throws Exception {
        String nome = campo.equals("nome") ? valor : "Pessoa fictícia";
        String email = campo.equals("email") ? valor : "nova@example.test";
        mvc.perform(comoAdmin(post("/usuarios")).content(json.writeValueAsString(
                        new UsuarioCadastroEntrada(nome, email, "SenhaFicticia123", PerfilUsuario.PESQUISADOR))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos." + campo).exists());
        mvc.perform(comoAdmin(put("/usuarios/2")).content(json.writeValueAsString(
                        new UsuarioEdicaoEntrada(nome, email, PerfilUsuario.PESQUISADOR))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errosCampos." + campo).exists());
        verify(usuarios, never()).save(any());
        verify(usuarios, never()).bloquearAtivosPorPerfil(any());
    }

    /**
     * Fornece nome e endereço de e-mail acima de 255 caracteres.
     *
     * @return campos e valores que ultrapassam o armazenamento
     * @since 1.0
     */
    static Stream<Arguments> camposLongos() {
        return Stream.of(Arguments.of("nome", "a".repeat(256)),
                Arguments.of("email", "a".repeat(64) + "@" + "b".repeat(63) + "."
                        + "c".repeat(63) + "." + "d".repeat(63) + ".test"));
    }

    /**
     * Mantém a distinção entre ausência de sessão, perfil inadequado e falta de CSRF.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void exigeAdministradorEProtecaoCsrf() throws Exception {
        mvc.perform(get("/usuarios")).andExpect(status().isUnauthorized());
        mvc.perform(get("/usuarios").with(user(new UsuarioAutenticado(contas.get(2L)))))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/usuarios/2/desativar").with(user(new UsuarioAutenticado(administrador))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("CSRF_INVALIDO"));
    }

    /**
     * Preserva pelo menos um administrador e verifica a ordem da consulta protegida.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void impedeDesativarUltimoAdministrador() throws Exception {
        mvc.perform(comoAdmin(patch("/usuarios/1/desativar")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ULTIMO_ADMINISTRADOR"));
        assertThat(administrador.isAtivo()).isTrue();
        var ordem = inOrder(usuarios);
        // A primeira leitura é a revalidação da sessão feita pelo filtro de segurança
        ordem.verify(usuarios).findById(1L);
        ordem.verify(usuarios).bloquearAtivosPorPerfil(PerfilUsuario.ADMINISTRADOR);
        ordem.verify(usuarios).findById(1L);
        ordem.verify(usuarios).countByPerfilAndAtivoTrue(PerfilUsuario.ADMINISTRADOR);
    }

    /**
     * Impede retirar o perfil do último administrador ativo.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void impedeTrocarPerfilDoUltimoAdministrador() throws Exception {
        mvc.perform(comoAdmin(put("/usuarios/1")).content(json.writeValueAsString(
                        new UsuarioEdicaoEntrada("Admin", administrador.getEmail(), PerfilUsuario.PESQUISADOR))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("ULTIMO_ADMINISTRADOR"));
        assertThat(administrador.getPerfil()).isEqualTo(PerfilUsuario.ADMINISTRADOR);
    }

    /**
     * Permite remover um administrador quando outro permanece ativo.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void permiteDesativarQuandoExisteOutroAdministrador() throws Exception {
        contas.put(3L, conta(3L, PerfilUsuario.ADMINISTRADOR));
        mvc.perform(comoAdmin(patch("/usuarios/3/desativar")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ativo").value(false));
        assertThat(administrador.isAtivo()).isTrue();
    }

    /**
     * Confere o 404 e o conflito identificado pela consulta prévia.
     *
     * @throws Exception se alguma requisição falhar
     * @since 1.0
     */
    @Test
    void informaUsuarioInexistenteEEmailRepetido() throws Exception {
        mvc.perform(comoAdmin(patch("/usuarios/999/reativar")))
                .andExpect(status().isNotFound());
        mvc.perform(comoAdmin(post("/usuarios")).content(json.writeValueAsString(
                        new UsuarioCadastroEntrada("Pessoa", administrador.getEmail(),
                                "SenhaFicticia123", PerfilUsuario.PESQUISADOR))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("EMAIL_JA_CADASTRADO"));
    }

    /**
     * Confere o conflito quando a restrição única é identificada somente ao salvar.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void traduzConflitoDeEmailIdentificadoPelaPersistencia() throws Exception {
        var causa = new ConstraintViolationException("Conflito fictício",
                new SQLException("Duplicidade", "23505"), "uk_usuarios_email");
        when(usuarios.save(any())).thenThrow(new DataIntegrityViolationException("Conflito", causa));
        mvc.perform(comoAdmin(post("/usuarios")).content(json.writeValueAsString(
                        new UsuarioCadastroEntrada("Pessoa", "nova@example.test",
                                "SenhaFicticia123", PerfilUsuario.PESQUISADOR))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("EMAIL_JA_CADASTRADO"));
    }

    /**
     * Reativa uma conta que estava desativada.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void permiteReativarUsuario() throws Exception {
        Usuario usuario = contas.get(2L);
        usuario.desativar();

        assertThat(usuario.isAtivo()).isFalse();

        mvc.perform(comoAdmin(patch("/usuarios/2/reativar")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ativo").value(true));

        assertThat(usuario.isAtivo()).isTrue();
    }

    /**
     * Impede usar na edição um e-mail que já pertence a outra conta.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void impedeEmailRepetidoNaEdicao() throws Exception {
        Usuario outraConta = conta(3L, PerfilUsuario.COORDENADOR);
        contas.put(3L, outraConta);

        mvc.perform(comoAdmin(put("/usuarios/2"))
                        .content(json.writeValueAsString(
                                new UsuarioEdicaoEntrada(
                                        "Pessoa alterada",
                                        outraConta.getEmail(),
                                        PerfilUsuario.PESQUISADOR
                                ))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigo").value("EMAIL_JA_CADASTRADO"));

        assertThat(contas.get(2L).getEmail()).isNotEqualTo(outraConta.getEmail());
    }

    /**
     * Lista usuários ativos e desativados na gestão administrativa.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void listaUsuariosAtivosEDesativados() throws Exception {
        Usuario usuarioDesativado = contas.get(2L);
        usuarioDesativado.desativar();

        when(usuarios.findAll()).thenReturn(
                java.util.List.of(administrador, usuarioDesativado)
        );

        mvc.perform(comoAdmin(get("/usuarios")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].ativo").value(true))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].ativo").value(false));
    }

    // <-------------------PERFIS E VÍNCULOS COM ESTUDOS------------------->

    /**
     * Impede retirar o perfil necessário para vínculos já existentes.
     *
     * @param perfil perfil da conta vinculada
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class, names = {"PESQUISADOR", "COORDENADOR"})
    void bloqueiaMudancaDePerfilComEstudos(PerfilUsuario perfil) throws Exception {
        Usuario vinculada = conta(2L, perfil);
        contas.put(2L, vinculada);
        when(estudos.existsByResponsavelId(2L)).thenReturn(perfil == PerfilUsuario.PESQUISADOR);
        when(estudos.existsByCoordenadorId(2L)).thenReturn(perfil == PerfilUsuario.COORDENADOR);
        mvc.perform(comoAdmin(put("/usuarios/2")).content(json.writeValueAsString(
                        new UsuarioEdicaoEntrada("Nome alterado", vinculada.getEmail(), PerfilUsuario.PARTICIPANTE))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("PERFIL_COM_VINCULOS"));
        assertThat(vinculada.getPerfil()).isEqualTo(perfil);
        assertThat(vinculada.getNome()).isNotEqualTo("Nome alterado");
        var ordem = inOrder(usuarios, estudos);
        ordem.verify(usuarios).bloquearPorIds(java.util.List.of(2L));
        ordem.verify(estudos).existsByResponsavelId(2L);
    }

    /**
     * Permite editar dados pessoais sem retirar o perfil exigido pelo estudo.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void permiteEditarNomeMantendoPerfilVinculado() throws Exception {
        when(estudos.existsByResponsavelId(2L)).thenReturn(true);
        mvc.perform(comoAdmin(put("/usuarios/2")).content(json.writeValueAsString(
                        new UsuarioEdicaoEntrada("Novo nome", contas.get(2L).getEmail(), PerfilUsuario.PESQUISADOR))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nome").value("Novo nome"));
    }

    /**
     * Mantém disponível a troca de perfil quando não há vínculos incompatíveis.
     *
     * @throws Exception se a requisição falhar
     * @since 1.0
     */
    @Test
    void permiteTrocarPerfilSemEstudos() throws Exception {
        mvc.perform(comoAdmin(put("/usuarios/2")).content(json.writeValueAsString(
                        new UsuarioEdicaoEntrada("Pessoa", contas.get(2L).getEmail(), PerfilUsuario.COORDENADOR))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.perfil").value("COORDENADOR"));
    }

    /**
     * Prepara uma requisição administrativa com CSRF válido.
     *
     * @param pedido operação que será executada
     * @return requisição autenticada para os testes de gestão
     * @since 1.0
     */
    private MockHttpServletRequestBuilder comoAdmin(MockHttpServletRequestBuilder pedido) {
        return pedido.with(user(new UsuarioAutenticado(administrador)))
                .with(csrf().asHeader()).contentType("application/json");
    }

    /**
     * Cria uma conta fictícia com identificador estável.
     *
     * @param id identificador do cenário
     * @param perfil perfil atribuído à conta
     * @return entidade utilizada pelo repositório simulado
     * @since 1.0
     */
    private Usuario conta(Long id, PerfilUsuario perfil) {
        Usuario conta = new Usuario("Pessoa fictícia", "pessoa" + id + "@example.test", "hash-ficticio", perfil);
        ReflectionTestUtils.setField(conta, "id", id);
        return conta;
    }
}
