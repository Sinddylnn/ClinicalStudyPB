package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaPrevistaService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// <-------------------VISITAS PREVISTAS------------------->
/**
 * Expõe as operações de configuração das visitas previstas e suas atividades.
 *
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/visitas")
@Tag(
        name = "Visitas previstas",
        description = "Configuração das visitas previstas e atividades do protocolo."
)
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(
            responseCode = "401",
            description = "Sessão ausente, expirada ou conta desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))
    ),
    @ApiResponse(
            responseCode = "403",
            description = "Perfil sem permissão ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))
    )
})
public class VisitaPrevistaController {

    private final VisitaPrevistaService visitas;

    public VisitaPrevistaController(VisitaPrevistaService visitas) {
        this.visitas = visitas;
    }

    // <-------------------CADASTRO DE VISITA------------------->

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Cadastrar visita prevista",
            description = "Cadastra uma visita prevista no protocolo de um estudo "
                    + "do pesquisador responsável. O estudo deve estar em planejamento.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Visita prevista cadastrada com sucesso."
        ),
        @ApiResponse(
                responseCode = "400",
                description = "Dados inválidos, ordem duplicada ou estudo fora de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo inexistente ou pertencente a outro pesquisador.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public VisitaPrevistaResposta cadastrarVisita(
            @PathVariable Long estudoId,
            @Valid @RequestBody VisitaPrevistaCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return visitas.cadastrarVisita(
                estudoId,
                entrada,
                usuarioAutenticado
        );
    }

    // <-------------------CADASTRO DE ATIVIDADE------------------->

    @PostMapping("/{visitaId}/atividades")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Cadastrar atividade prevista",
            description = "Adiciona uma atividade a uma visita prevista do protocolo. "
                    + "O estudo deve estar em planejamento.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "Atividade cadastrada com sucesso."
        ),
        @ApiResponse(
                responseCode = "400",
                description = "Dados inválidos ou estudo fora de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo ou visita prevista não encontrada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public AtividadePrevistaResposta cadastrarAtividade(
            @PathVariable Long estudoId,
            @PathVariable Long visitaId,
            @Valid @RequestBody AtividadePrevistaCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return visitas.cadastrarAtividade(
                estudoId,
                visitaId,
                entrada,
                usuarioAutenticado
        );
    }

    // <-------------------LISTAGEM------------------->

    @GetMapping
    @Operation(
            summary = "Listar visitas previstas",
            description = "Lista as visitas previstas do protocolo, em ordem, "
                    + "incluindo as atividades de cada visita."
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Visitas previstas cadastradas; pode retornar lista vazia."
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo inexistente ou pertencente a outro pesquisador.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public List<VisitaPrevistaResposta> listar(
            @PathVariable Long estudoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado usuarioAutenticado) {

        return visitas.listar(estudoId, usuarioAutenticado);
    }

    // <-------------------EDIÇÃO E REMOÇÃO DE VISITA------------------->

    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Dados inválidos, inconsistência ou estudo fora de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Registro inexistente ou fora do vínculo permitido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    @PutMapping("/{visitaId}")
    @Operation(summary = "Editar visita prevista", description = "Somente o responsável, durante o planejamento.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    public VisitaPrevistaResposta editarVisita(@PathVariable Long estudoId, @PathVariable Long visitaId,
            @Valid @RequestBody VisitaPrevistaCadastroEntrada entrada,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return visitas.editarVisita(estudoId, visitaId, entrada, autenticado);
    }

    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Dados inválidos, inconsistência ou estudo fora de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Registro inexistente ou fora do vínculo permitido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    @DeleteMapping("/{visitaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remover visita prevista",
            description = "Somente o responsável, durante o planejamento. A remoção da visita também remove suas atividades.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    public void removerVisita(@PathVariable Long estudoId, @PathVariable Long visitaId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        visitas.removerVisita(estudoId, visitaId, autenticado);
    }

    // <-------------------EDIÇÃO E REMOÇÃO DE ATIVIDADE------------------->

    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Dados inválidos, inconsistência ou estudo fora de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Registro inexistente ou fora do vínculo permitido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    @PutMapping("/{visitaId}/atividades/{atividadeId}")
    @Operation(summary = "Editar atividade prevista", description = "Somente o responsável, durante o planejamento.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    public AtividadePrevistaResposta editarAtividade(@PathVariable Long estudoId, @PathVariable Long visitaId, @PathVariable Long atividadeId,
            @Valid @RequestBody AtividadePrevistaCadastroEntrada entrada,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return visitas.editarAtividade(estudoId, visitaId, atividadeId, entrada, autenticado);
    }

    @ApiResponses({
        @ApiResponse(responseCode = "400", description = "Dados inválidos, inconsistência ou estudo fora de planejamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Registro inexistente ou fora do vínculo permitido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    @DeleteMapping("/{visitaId}/atividades/{atividadeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remover atividade prevista",
            description = "Somente o responsável, durante o planejamento. A remoção da visita também remove suas atividades.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    public void removerAtividade(@PathVariable Long estudoId, @PathVariable Long visitaId, @PathVariable Long atividadeId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        visitas.removerAtividade(estudoId, visitaId, atividadeId, autenticado);
    }
}
