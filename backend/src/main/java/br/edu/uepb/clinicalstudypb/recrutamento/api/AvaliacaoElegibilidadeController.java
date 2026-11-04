package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.recrutamento.service.AvaliacaoElegibilidadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// <-------------------AVALIAÇÃO DE ELEGIBILIDADE------------------->
@RestController
@RequestMapping("/estudos/{estudoId}/candidatos/{candidatoId}/elegibilidade")
@Tag(
        name = "Elegibilidade",
        description = "Consulta e avaliação dos critérios de elegibilidade dos candidatos."
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
public class AvaliacaoElegibilidadeController {

    private final AvaliacaoElegibilidadeService avaliacoes;

    public AvaliacaoElegibilidadeController(
            AvaliacaoElegibilidadeService avaliacoes) {
        this.avaliacoes = avaliacoes;
    }

    // <-------------------CONSULTAR AVALIAÇÃO------------------->

    @GetMapping
    @Operation(
            summary = "Consultar avaliação de elegibilidade",
            description = "Consulta os critérios, as respostas e a situação "
                    + "de elegibilidade de um candidato vinculado ao estudo."
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Avaliação consultada com sucesso."
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo ou candidato não encontrado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public AvaliacaoElegibilidadeResposta consultar(
            @PathVariable Long estudoId,
            @PathVariable Long candidatoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return avaliacoes.obter(estudoId, candidatoId, autenticado);
    }

    // <-------------------SALVAR AVALIAÇÃO------------------->

    @PutMapping
    @Operation(
            summary = "Salvar avaliação de elegibilidade",
            description = "Registra as respostas dos critérios e calcula "
                    + "a situação de elegibilidade do candidato. "
                    + "Operação exclusiva do coordenador vinculado, "
                    + "durante o recrutamento.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Avaliação salva com sucesso."
        ),
        @ApiResponse(
                responseCode = "400",
                description = "Respostas inválidas ou estudo fora de recrutamento.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        ),
        @ApiResponse(
                responseCode = "404",
                description = "Estudo ou candidato não encontrado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))
        )
    })
    public AvaliacaoElegibilidadeResposta salvar(
            @PathVariable Long estudoId,
            @PathVariable Long candidatoId,
            @Valid @RequestBody AvaliacaoElegibilidadeEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return avaliacoes.salvar(
                estudoId,
                candidatoId,
                entrada,
                autenticado
        );
    }
}
