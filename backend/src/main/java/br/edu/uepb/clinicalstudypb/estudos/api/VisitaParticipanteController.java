package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaParticipanteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// <-------------------VISITAS DO PARTICIPANTE NA API------------------->
/**
 * Expõe a confirmação de presença e o pedido de reagendamento do participante.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
@RestController
@RequestMapping("/participante/visitas")
@Tag(name = "Participante (aplicativo)",
        description = "Ações e consultas do participante autenticado no aplicativo.")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou conta desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil diferente de participante ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class VisitaParticipanteController {

    private final VisitaParticipanteService visitas;

    /**
     * Recebe o serviço das ações do participante nas visitas.
     *
     * @param visitas serviço responsável pelas ações
     */
    public VisitaParticipanteController(VisitaParticipanteService visitas) {
        this.visitas = visitas;
    }

    /**
     * Confirma presença em uma visita futura agendada.
     *
     * @param visitaId identificador da visita
     * @param autenticado participante conectado
     * @return dados da confirmação
     */
    @PostMapping("/{visitaId}/confirmacao")
    @Operation(
            summary = "Confirmar presença em visita",
            description = "Confirma presença do participante em uma visita própria, futura e AGENDADA. "
                    + "A confirmação não registra comparecimento nem realiza a visita.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Confirmação registrada.",
                content = @Content(schema = @Schema(implementation = ConfirmacaoPresencaResposta.class))),
        @ApiResponse(responseCode = "400",
                description = "PARTICIPACAO_INVALIDA, ESTADO_ESTUDO_INVALIDO ou TRANSICAO_VISITA_INVALIDA.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Visita fora da conta autenticada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public ConfirmacaoPresencaResposta confirmar(
            @PathVariable Long visitaId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return visitas.confirmarPresenca(visitaId, autenticado);
    }

    /**
     * Cria um pedido de reagendamento para uma visita futura agendada.
     *
     * @param visitaId identificador da visita
     * @param entrada nova data e motivo do pedido
     * @param autenticado participante conectado
     * @return pedido criado
     */
    @PostMapping("/{visitaId}/reagendamentos")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Pedir reagendamento de visita",
            description = "Cria um pedido PENDENTE sem alterar a data atual da visita.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Pedido criado.",
                content = @Content(schema = @Schema(
                        implementation = SolicitacaoReagendamentoParticipanteResposta.class))),
        @ApiResponse(responseCode = "400",
                description = "Participação, estudo, visita ou data inválida.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Visita fora da conta autenticada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "409", description = "Já existe pedido pendente.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public SolicitacaoReagendamentoParticipanteResposta reagendar(
            @PathVariable Long visitaId,
            @Valid @RequestBody PedidoReagendamentoEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return visitas.pedirReagendamento(visitaId, entrada, autenticado);
    }
}
