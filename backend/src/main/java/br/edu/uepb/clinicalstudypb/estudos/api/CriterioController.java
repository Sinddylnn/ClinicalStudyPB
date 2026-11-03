package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.CriterioService;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// <-------------------CRITÉRIOS DOS ESTUDOS------------------->
/**
 * Expõe as operações de configuração dos critérios dos estudos.
 *
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/criterios")
@Tag(name = "Critérios", description = "Configuração dos critérios de inclusão e exclusão dos estudos.")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Sessão ausente ou expirada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil sem permissão ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class CriterioController {

    private final CriterioService criterios;

    public CriterioController(CriterioService criterios) {
        this.criterios = criterios;
    }

    // <-------------------CADASTRO------------------->

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Cadastrar critério",
            description = "Cadastra um critério de inclusão ou exclusão no protocolo de um estudo "
                    + "do pesquisador autenticado. O estudo deve estar em planejamento.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Critério cadastrado com sucesso."),
        @ApiResponse(responseCode = "400",
                description = "Dados inválidos ou estudo fora do estado de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "Estudo inexistente ou pertencente a outro pesquisador.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public CriterioResposta cadastrar(
            @PathVariable Long estudoId,
            @Valid @RequestBody CriterioCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return criterios.cadastrar(estudoId, entrada, usuarioAutenticado);
    }

    // <-------------------LISTAGEM------------------->

    @GetMapping
    @Operation(
            summary = "Listar critérios",
            description = "Lista os critérios cadastrados no protocolo de um estudo "
                    + "do pesquisador autenticado."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200",
                description = "Critérios cadastrados; pode retornar uma lista vazia."),
        @ApiResponse(responseCode = "404",
                description = "Estudo inexistente ou pertencente a outro pesquisador.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public List<CriterioResposta> listar(
            @PathVariable Long estudoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return criterios.listar(estudoId, usuarioAutenticado);
    }
}
