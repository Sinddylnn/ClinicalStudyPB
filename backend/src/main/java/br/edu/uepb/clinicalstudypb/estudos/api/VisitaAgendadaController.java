package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// Agendamento e reagendamento de visitas
@RestController
@RequestMapping("/estudos/{estudoId}/participacoes/{participacaoId}/visitas")
@Tag(name = "Visitas agendadas")
@SecurityRequirement(name = "sessao")
public class VisitaAgendadaController {

    private final VisitaAgendadaService visitas;

    public VisitaAgendadaController(VisitaAgendadaService visitas) {
        this.visitas = visitas;
    }

    @Parameter(ref = "#/components/parameters/TokenCsrf")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Visita agendada com sucesso"),
        @ApiResponse(responseCode = "400", description = "Dados inválidos ou regra de negócio não atendida"),
        @ApiResponse(responseCode = "401", description = "Usuário não autenticado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado"),
        @ApiResponse(responseCode = "404", description = "Estudo, participação ou visita não encontrada"),
        @ApiResponse(responseCode = "409", description = "Agendamento duplicado")
    })

    // Agenda uma visita
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
