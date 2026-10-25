package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.usuarios.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// <-------------------GESTÃO DE USUÁRIOS------------------->
/**
 * Expõe as operações administrativas de gestão de usuários.
 *
 * <p>As permissões de acesso às rotas são aplicadas pela configuração
 * de segurança da aplicação.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
@RestController
@RequestMapping("/usuarios")
@Tag(name = "Usuários", description = "Gestão de contas, exclusiva do perfil ADMINISTRADOR.")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou conta desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil sem permissão ou CSRF inválido em uma alteração.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class UsuarioController {

    private final UsuarioService usuarios;

    /**
     * Recebe o serviço responsável pelas regras de gestão de usuários.
     *
     * @param usuarios serviço de gestão das contas
     */
    public UsuarioController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    // <-------------------CADASTRO------------------->

    /**
     * Cadastra uma nova conta de usuário.
     *
     * @param entrada dados da conta que será criada
     * @return dados públicos do usuário cadastrado
     * @since 1.0
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cadastrar usuário", description = "Exige administrador e CSRF válido. "
            + "Cria uma conta ativa com e-mail único e senha protegida por BCrypt. "
            + "A senha admite no máximo 72 bytes em UTF-8, não necessariamente 72 caracteres.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Usuário cadastrado, sem senha ou hash na resposta."),
        @ApiResponse(responseCode = "400", description = "Campos inválidos ou senha acima de 72 bytes em UTF-8.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "409", description = "E-mail já cadastrado, inclusive em uma conta desativada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public UsuarioResposta cadastrar(
            @Valid @RequestBody UsuarioCadastroEntrada entrada) {
        return usuarios.cadastrar(entrada);
    }

    // <-------------------LISTAGEM------------------->

    /**
     * Lista todas as contas cadastradas.
     *
     * @return usuários ativos e desativados
     * @since 1.0
     */
    @GetMapping
    @Operation(summary = "Listar usuários", description = "Exige administrador. "
            + "Lista contas ativas e desativadas, sem expor senhas ou hashes. Não exige token CSRF.")
    @ApiResponse(responseCode = "200", description = "Lista de usuários; pode estar vazia.")
    public List<UsuarioResposta> listar() {
        return usuarios.listar();
    }

    // <-------------------EDIÇÃO------------------->

    /**
     * Atualiza os dados editáveis de uma conta.
     *
     * @param id identificador do usuário
     * @param entrada novos dados da conta
     * @return dados atualizados do usuário
     * @since 1.0
     */
    @PutMapping("/{id}")
    @Operation(summary = "Editar usuário", description = "Exige administrador e CSRF válido. "
            + "Atualiza nome, e-mail e perfil; não altera senha nem situação da conta. "
            + "O último administrador ativo não pode perder esse perfil. "
            + "Vínculos como responsável ou coordenador impedem mudanças incompatíveis de perfil.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Dados atualizados do usuário."),
        @ApiResponse(responseCode = "400", description = "Dados inválidos, último administrador ativo ou PERFIL_COM_VINCULOS.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Usuário não encontrado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "409", description = "E-mail utilizado por outra conta.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public UsuarioResposta editar(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioEdicaoEntrada entrada) {
        return usuarios.editar(id, entrada);
    }

    // <-------------------DESATIVAÇÃO------------------->

    /**
     * Desativa uma conta sem excluir seu registro.
     *
     * @param id identificador do usuário
     * @return dados da conta após a desativação
     * @since 1.0
     */
    @PatchMapping("/{id}/desativar")
    @Operation(summary = "Desativar usuário", description = "Exige administrador e CSRF válido. "
            + "Mantém o registro no banco e impede novos acessos protegidos da conta. "
            + "Não recebe corpo. O último administrador ativo não pode ser desativado.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Conta com ativo igual a false."),
        @ApiResponse(responseCode = "400", description = "Identificador inválido ou tentativa de desativar o último administrador ativo.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Usuário não encontrado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public UsuarioResposta desativar(@PathVariable Long id) {
        return usuarios.desativar(id);
    }

    // <-------------------REATIVAÇÃO------------------->

    /**
     * Reativa uma conta anteriormente desativada.
     *
     * @param id identificador do usuário
     * @return dados da conta após a reativação
     * @since 1.0
     */
    @PatchMapping("/{id}/reativar")
    @Operation(summary = "Reativar usuário", description = "Exige administrador e CSRF válido. "
            + "Torna a conta ativa novamente. Não recebe corpo e não restaura uma sessão já encerrada.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Conta com ativo igual a true."),
        @ApiResponse(responseCode = "400", description = "Identificador inválido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Usuário não encontrado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public UsuarioResposta reativar(@PathVariable Long id) {
        return usuarios.reativar(id);
    }
}
