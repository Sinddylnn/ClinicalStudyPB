package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.recrutamento.service.CandidatoService;
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

// <-------------------CANDIDATOS DOS ESTUDOS------------------->
/**
 * Expõe as operações de cadastro e consulta de candidatos.
 *
 * @author Luiz
 * @version 1.0
 * @since 04/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/candidatos")
@Tag(
        name = "Candidatos",
        description = "Cadastro e consulta de candidatos vinculados aos estudos."
)
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(
            responseCode = "401",
            description = "Sessão ausente ou expirada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))
    ),
    @ApiResponse(
            responseCode = "403",
            description = "Perfil sem permissão ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))
    )
})
public class CandidatoController {

    private final CandidatoService candidatos;

    public CandidatoController(CandidatoService candidatos) {
        this.candidatos = candidatos;
    }

    // <-------------------CADASTRO------------------->

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Cadastrar candidato",
            description = "Cadastra um candidato em um estudo em recrutamento. "
                    + "A operação é exclusiva do coordenador vinculado.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Candidato cadastrado com sucesso."
        ),
        @ApiResponse(
                responseCode = "400",
                description = "Dados inválidos ou estudo fora de recrutamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo inexistente ou não vinculado ao coordenador.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        ),
        @ApiResponse(
                responseCode = "409",
                description = "E-mail já cadastrado no estudo.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public CandidatoResposta cadastrar(
            @PathVariable Long estudoId,
            @Valid @RequestBody CandidatoCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return candidatos.cadastrar(estudoId, entrada, autenticado);
    }

    // <-------------------LISTAGEM------------------->

    @GetMapping
    @Operation(
            summary = "Listar candidatos",
            description = "Lista os candidatos vinculados ao estudo "
                    + "do coordenador autenticado."
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Candidatos encontrados ou lista vazia."
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo inexistente ou não vinculado ao coordenador.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public List<CandidatoResposta> listar(
            @PathVariable Long estudoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return candidatos.listar(estudoId, autenticado);
    }
}
