package br.edu.uepb.clinicalstudypb.estudos.api;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Disponibiliza os endpoints de agendamento e
 * reagendamento de visitas dos participantes.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/participacoes/{participacaoId}/visitas")
@Tag(name = "Visitas agendadas")
@SecurityRequirement(name = "sessao")
public class VisitaAgendadaController {

    private final VisitaAgendadaService visitas;

    /**
    * Inicializa o controller com o serviço de visitas.
    *
    * @param visitas serviço responsável pelas visitas agendadas
    */
    public VisitaAgendadaController(VisitaAgendadaService visitas) {
        this.visitas = visitas;
    }

    // <-------AGENDAMENTO DE VISITAS------->
    /**
     * Recebe uma solicitação de agendamento de visita.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param entrada dados para o agendamento
     * @param autenticado usuário autenticado
     * @return dados da visita agendada
     * @since 1.0
     */
    @Parameter(ref = "#/components/parameters/TokenCsrf")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Visita agendada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou regra de negócio não atendida"),
        @ApiResponse(responseCode = "401", description = "Usuário não autenticado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado"),
        @ApiResponse(responseCode = "404", description = "Estudo, participação ou visita não encontrada"),
        @ApiResponse(responseCode = "409", description = "Agendamento duplicado")
    })

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Agendar visita de participante")
    public VisitaAgendadaResposta agendar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @Valid @RequestBody VisitaAgendadaCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return visitas.agendar(
                estudoId,
                participacaoId,
                entrada,
                autenticado);
    }

    // <-------REAGENDAMENTO DE VISITAS------->
    /**
     * Recebe uma solicitação para alterar a data de uma visita.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita agendada
     * @param entrada dados do reagendamento
     * @param autenticado usuário autenticado
     * @return dados atualizados da visita
     * @since 1.0
     */
    @Parameter(ref = "#/components/parameters/TokenCsrf")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Visita reagendada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou regra de negócio não atendida"),
        @ApiResponse(responseCode = "401", description = "Usuário não autenticado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado"),
        @ApiResponse(responseCode = "404", description = "Visita agendada não encontrada"),
    })

    // Altera a data de uma visita agendada
    @PutMapping("/{visitaAgendadaId}")
    @Operation(summary = "Reagendar visita de participante")
    public VisitaAgendadaResposta reagendar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @PathVariable Long visitaAgendadaId,
            @Valid @RequestBody VisitaAgendadaReagendamentoEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return visitas.reagendar(
                estudoId,
                participacaoId,
                visitaAgendadaId,
                entrada,
                autenticado);
    }
}
