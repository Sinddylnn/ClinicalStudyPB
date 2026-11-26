package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.IndicadoresPainelService;
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
 * Disponibiliza os indicadores do painel de um estudo.
 *
 * @author Luiz
 * @version 1.0
 * @since 26/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/indicadores")
@Tag(name = "Painel de indicadores")
@SecurityRequirement(name = "sessao")
public class IndicadoresPainelController {

    private final IndicadoresPainelService indicadores;

    /**
     * Inicializa o controller com o serviço de indicadores.
     *
     * @param indicadores serviço responsável pelas contagens
     */
    public IndicadoresPainelController(IndicadoresPainelService indicadores) {
        this.indicadores = indicadores;
    }

    /**
     * Consulta os indicadores de um estudo acessível ao usuário.
     *
     * @param estudoId identificador do estudo
     * @param autenticado usuário autenticado
     * @return indicadores do estudo
     * @since 1.0
     */
    @GetMapping
    @Operation(
            summary = "Consultar indicadores do estudo",
            description = "Consulta permitida ao pesquisador responsável "
                    + "ou ao coordenador vinculado ao estudo. "
                    + "Retorna as contagens de candidatos, participantes "
                    + "e visitas. Visitas agendadas são consideradas "
                    + "pendentes independentemente da data."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200",
                description = "Indicadores consultados com sucesso",
                content = @Content(schema = @Schema(
                        implementation = IndicadoresPainelResposta.class))),
        @ApiResponse(responseCode = "401",
                description = "Sessão ausente ou inválida",
                content = @Content(schema = @Schema(
                        implementation = ErroApi.class))),
        @ApiResponse(responseCode = "403",
                description = "Perfil sem permissão",
                content = @Content(schema = @Schema(
                        implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "Estudo inexistente ou fora do vínculo autorizado",
                content = @Content(schema = @Schema(
                        implementation = ErroApi.class)))
    })
    public IndicadoresPainelResposta consultar(
            @PathVariable Long estudoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return indicadores.consultar(estudoId, autenticado);
    }
}
