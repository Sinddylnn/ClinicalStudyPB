package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.EstudoService;
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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// <-------------------GESTÃO DE ESTUDOS------------------->
/**
 * Expõe as operações de cadastro e consulta dos estudos.
 *
 * <p>O pesquisador cadastra estudos dos quais se torna responsável.
 * Pesquisadores consultam seus próprios estudos e coordenadores podem
 * consultar somente os estudos aos quais estão vinculados.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 25/10/2026
 */
@RestController
@RequestMapping("/estudos")
@Tag(name = "Estudos", description = "Cadastro e consulta dos estudos clínicos.")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou conta desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil sem permissão ou CSRF inválido em uma alteração.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class EstudoController {

    private final EstudoService estudos;

    /**
     * Recebe o serviço responsável pelas regras de gestão dos estudos.
     *
     * @param estudos serviço de gestão dos estudos
     */
    public EstudoController(EstudoService estudos) {
        this.estudos = estudos;
    }

    // <-------------------CADASTRO------------------->

    /**
     * Cadastra um estudo para o pesquisador autenticado.
     *
     * @param entrada dados informados no cadastro
     * @param usuarioAutenticado identidade do pesquisador conectado
     * @return dados do estudo cadastrado
     * @since 1.0
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Cadastrar estudo",
            description = "Exige pesquisador e CSRF válido. "
                    + "O pesquisador autenticado é definido automaticamente como responsável. "
                    + "O estudo é criado inicialmente no estado PLANEJAMENTO. "
                    + "coordenadorId é opcional; quando informado, deve indicar um coordenador ativo.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Estudo cadastrado com sucesso."),
        @ApiResponse(responseCode = "400",
                description = "Campos inválidos, período inconsistente ou COORDENADOR_INVALIDO.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "Conta responsável ou coordenador informado não encontrado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public EstudoResposta cadastrar(
            @Valid @RequestBody EstudoCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return estudos.cadastrar(entrada, usuarioAutenticado);
    }

    // <-------------------LISTAGEM------------------->

    /**
     * Lista os estudos permitidos para o usuário autenticado.
     *
     * @param usuarioAutenticado identidade do usuário conectado
     * @return estudos disponíveis para o perfil
     * @since 1.0
     */
    @GetMapping
    @Operation(
            summary = "Listar estudos",
            description = "Pesquisadores consultam somente os estudos pelos quais são responsáveis. "
                    + "Coordenadores consultam somente estudos vinculados à própria conta. "
                    + "Sem vínculos, a lista é vazia. Não exige token CSRF."
    )
    @ApiResponse(responseCode = "200", description = "Lista de estudos permitidos para o perfil; pode estar vazia.")
    public List<EstudoResposta> listar(
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return estudos.listar(usuarioAutenticado);
    }

    // <-------------------COORDENADORES DISPONÍVEIS------------------->

    /**
     * Oferece os coordenadores ativos para a escolha do pesquisador.
     *
     * @return somente identificadores e nomes, sem dados administrativos
     * @since 1.0
     */
    @GetMapping("/coordenadores")
    @Operation(summary = "Listar coordenadores disponíveis",
            description = "Exige pesquisador. Lista somente ID e nome de contas ativas com perfil "
                    + "COORDENADOR para preencher a seleção no cadastro ou na atribuição posterior.")
    @ApiResponse(responseCode = "200", description = "Coordenadores ativos; pode ser uma lista vazia.")
    public List<CoordenadorResposta> listarCoordenadores() {
        return estudos.listarCoordenadores();
    }

    // <-------------------ATRIBUIÇÃO OU SUBSTITUIÇÃO DO COORDENADOR------------------->

    /**
     * Define o coordenador de um estudo do pesquisador autenticado.
     *
     * @param id identificador do estudo
     * @param entrada coordenador ativo escolhido
     * @param usuarioAutenticado pesquisador responsável conectado
     * @return estudo com o vínculo atualizado
     * @since 1.0
     */
    @PutMapping("/{id}/coordenador")
    @Operation(summary = "Atribuir coordenador ao estudo",
            description = "Exige pesquisador responsável pelo estudo e CSRF válido. "
                    + "Atribui ou substitui um único coordenador ativo. "
                    + "Não remove o vínculo e não altera o responsável ou o estado do estudo.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Coordenador atribuído; retorna o estudo atualizado."),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou COORDENADOR_INVALIDO.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Estudo inexistente ou de outro pesquisador; conta inexistente.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public EstudoResposta atribuirCoordenador(@PathVariable Long id,
            @Valid @RequestBody CoordenadorEntrada entrada,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {
        return estudos.atribuirCoordenador(id, entrada.coordenadorId(), usuarioAutenticado);
    }
}
