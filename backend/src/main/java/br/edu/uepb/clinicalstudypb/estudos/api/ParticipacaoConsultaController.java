package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.VisitaAgendadaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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

@RestController
@RequestMapping("/estudos/{estudoId}/participacoes")
@Tag(name = "Participações")
@SecurityRequirement(name = "sessao")
public class ParticipacaoConsultaController {

    private final VisitaAgendadaService visitas;

    public ParticipacaoConsultaController(VisitaAgendadaService visitas) {
        this.visitas = visitas;
    }

    @GetMapping
    @Operation(summary = "Listar participantes incluídos no estudo")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Participações listadas com sucesso"),
        @ApiResponse(responseCode = "401", description = "Usuário não autenticado"),
        @ApiResponse(responseCode = "403", description = "Acesso negado"),
        @ApiResponse(responseCode = "404", description = "Estudo não encontrado")
    })
    public List<ParticipacaoResumoResposta> listar(
            @PathVariable Long estudoId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return visitas.listarParticipacoes(estudoId, autenticado);
    }
}
