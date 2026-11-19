package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.HistoricoParticipacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Disponibiliza a consulta do histórico completo de uma participação.
 *
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/participacoes/{participacaoId}/historico")
@Tag(name = "Histórico de participações")
@SecurityRequirement(name = "sessao")
public class HistoricoParticipacaoController {

    private final HistoricoParticipacaoService historico;

    /**
     * Inicializa o controller com o serviço responsável pelo histórico.
     *
     * @param historico serviço de consulta do histórico completo
     */
    public HistoricoParticipacaoController(HistoricoParticipacaoService historico) {
        this.historico = historico;
    }

    /**
     * Consulta visitas, resultados, correções e eventual retirada da participação.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param autenticado usuário autenticado
     * @return histórico completo em ordem cronológica
     * @since 1.0
     */
    @GetMapping
    @Operation(
            summary = "Consultar histórico completo de uma participação",
            description = "Consulta permitida ao pesquisador responsável ou ao coordenador vinculado ao estudo. "
                    + "Inclui visitas, resultados, correções e eventual retirada em ordem cronológica. "
                    + "Permite consultar estudos encerrados e participações retiradas."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Histórico consultado com sucesso",
                content = @Content(schema = @Schema(implementation = HistoricoParticipacaoResposta.class))),
        @ApiResponse(responseCode = "401", description = "Sessão ausente ou inválida",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "403", description = "Perfil sem permissão",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Estudo ou participação inexistente ou fora do vínculo autorizado",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public HistoricoParticipacaoResposta consultar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return historico.consultar(estudoId, participacaoId, autenticado);
    }
}
