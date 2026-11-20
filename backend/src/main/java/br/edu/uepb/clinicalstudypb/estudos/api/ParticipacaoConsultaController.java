package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// <-------CONSULTA DE PARTICIPACOES------->
/**
 * Disponibiliza a consulta de participações de um estudo.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/participacoes")
@Tag(name = "Participações")
@SecurityRequirement(name = "sessao")
public class ParticipacaoConsultaController {

    private final VisitaAgendadaService visitas;

    // <-------INICIALIZACAO DO CONTROLLER------->
    /**
     * Inicializa o controller com o serviço de visitas.
     *
     * @param visitas serviço responsável pela consulta de participações
     */
    public ParticipacaoConsultaController(VisitaAgendadaService visitas) {
        this.visitas = visitas;
    }


    // <-------LISTAGEM DE PARTICIPACOES------->
    /**
     * Lista as participações de um estudo vinculado ao coordenador
     * ou ao pesquisador responsável, incluindo ativos e retirados.
     *
     * @param estudoId identificador do estudo
     * @param autenticado usuário autenticado
     * @return participações ativas e retiradas do estudo
     * @since 1.0
     */
    @GetMapping
    @Operation(
            summary = "Listar participantes incluídos no estudo",
            description = "Permite a consulta pelo coordenador vinculado "
                    + "ou pelo pesquisador responsável pelo estudo."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Participações listadas com sucesso"),
        @ApiResponse(responseCode = "401", description = "Usuário não autenticado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "403", description = "Perfil sem permissão.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "RECURSO_NAO_ENCONTRADO: estudo inexistente ou fora do vínculo autorizado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public List<ParticipacaoResumoResposta> listar(
            @PathVariable Long estudoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return visitas.listarParticipacoes(estudoId, autenticado);
    }
}
