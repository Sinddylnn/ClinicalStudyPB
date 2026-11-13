package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

    // Agenda uma visita
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Agendar visita de participante")
    public VisitaAgendadaResposta agendar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @Valid @RequestBody VisitaAgendadaCadastroEntrada entrada,
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return visitas.agendar(
                estudoId,
                participacaoId,
                entrada,
                autenticado);
    }

    // Altera a data de uma visita agendada
    @PutMapping("/{visitaAgendadaId}")
    @Operation(summary = "Reagendar visita de participante")
    public VisitaAgendadaResposta reagendar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @PathVariable Long visitaAgendadaId,
            @Valid @RequestBody VisitaAgendadaReagendamentoEntrada entrada,
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return visitas.reagendar(
                estudoId,
                participacaoId,
                visitaAgendadaId,
                entrada,
                autenticado);
    }
}
