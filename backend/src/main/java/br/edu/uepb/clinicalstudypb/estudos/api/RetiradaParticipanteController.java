package br.edu.uepb.clinicalstudypb.estudos.api;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.RetiradaParticipanteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

// <-------------------RETIRADA DE PARTICIPANTES NA API------------------->
/**
 * Expõe o registro da retirada de um participante do estudo.
 *
 * @author Georis
 * @version 1.0
 * @since 16/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/participacoes/{participacaoId}/retirada")
@Tag(name = "Retirada de participantes")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou conta desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil sem permissão ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class RetiradaParticipanteController {

    private final RetiradaParticipanteService retiradas;

    /**
     * Recebe o serviço responsável pela retirada.
     *
     * @param retiradas serviço de retirada de participantes
     */
    public RetiradaParticipanteController(RetiradaParticipanteService retiradas) {
        this.retiradas = retiradas;
    }

    /**
     * Registra a retirada de uma participação do estudo.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param entrada motivo da retirada
     * @param autenticado coordenador conectado
     * @return dados da retirada registrada
     */
    @PostMapping
    @Operation(
            summary = "Registrar retirada de participante",
            description = "Exige coordenador vinculado ao estudo e CSRF válido. "
                    + "O estudo deve estar em RECRUTAMENTO ou EXECUCAO e a participação deve estar ATIVA. "
                    + "A retirada é irreversível: marca a participação como RETIRADA e cancela as visitas "
                    + "AGENDADA, preservando visitas finalizadas e resultados. A vaga não é liberada.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Retirada registrada com sucesso."),
        @ApiResponse(responseCode = "400",
                description = "Motivo inválido, ESTADO_ESTUDO_INVALIDO ou PARTICIPACAO_JA_RETIRADA.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "Estudo ou participação inexistente ou fora do vínculo da rota.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public RetiradaResposta registrar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @Valid @RequestBody RetiradaEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return retiradas.registrar(estudoId, participacaoId, entrada, autenticado);
    }
}
