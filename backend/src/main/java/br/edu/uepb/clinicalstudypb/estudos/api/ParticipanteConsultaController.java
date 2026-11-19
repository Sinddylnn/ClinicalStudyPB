package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.ParticipanteConsultaService;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// <-------------------CONSULTAS DO APLICATIVO DO PARTICIPANTE------------------->
/**
 * Expõe as consultas do participante, identificado pela sessão e sem id na URL.
 *
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
@RestController
@RequestMapping("/participante")
@Tag(name = "Participante (aplicativo)",
        description = "Consultas do participante autenticado, usadas pelo aplicativo mobile.")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou conta desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil diferente de participante.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class ParticipanteConsultaController {

    private final ParticipanteConsultaService consultas;

    /**
     * Recebe o serviço das consultas do participante.
     *
     * @param consultas serviço responsável pelas consultas
     */
    public ParticipanteConsultaController(ParticipanteConsultaService consultas) {
        this.consultas = consultas;
    }

    // <-------------------ESTUDOS------------------->

    /**
     * Lista os estudos da conta autenticada.
     *
     * @param autenticado participante conectado
     * @return estudos em que está ou esteve incluído
     */
    @GetMapping("/estudos")
    @Operation(summary = "Listar estudos do participante",
            description = "Retorna os estudos em que a conta está incluída, inclusive os retirados, "
                    + "identificados por situacaoParticipacao RETIRADA.")
    @ApiResponse(responseCode = "200", description = "Estudos da conta; pode ser lista vazia.")
    public List<ParticipanteEstudoResposta> listarEstudos(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return consultas.listarEstudos(autenticado);
    }

    // <-------------------PRÓXIMAS VISITAS------------------->

    /**
     * Lista as próximas visitas da conta autenticada.
     *
     * @param estudoId estudo opcional
     * @param autenticado participante conectado
     * @return visitas AGENDADA de hoje em diante
     */
    @GetMapping("/visitas/proximas")
    @Operation(summary = "Listar próximas visitas do participante",
            description = "Retorna visitas AGENDADA de hoje em diante, em ordem crescente de data, "
                    + "sem motivos nem resultados. estudoId é opcional e validado contra as participações.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Próximas visitas; pode ser lista vazia."),
        @ApiResponse(responseCode = "400", description = "Parâmetro estudoId inválido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Estudo sem participação da conta autenticada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public List<ProximaVisitaParticipanteResposta> listarProximas(
            @Parameter(description = "Filtra por um estudo em que a conta está incluída.")
            @RequestParam(required = false) Long estudoId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return consultas.listarProximasVisitas(estudoId, autenticado);
    }

    // <-------------------HISTÓRICO DE COMPARECIMENTO------------------->

    /**
     * Lista o histórico de comparecimento da conta autenticada.
     *
     * @param estudoId estudo opcional
     * @param autenticado participante conectado
     * @return visitas realizadas, ausentes e canceladas
     */
    @GetMapping("/visitas/historico")
    @Operation(summary = "Listar histórico de comparecimento do participante",
            description = "Retorna visitas REALIZADA, AUSENTE e CANCELADA, da mais recente para a mais antiga, "
                    + "sem motivos, justificativas nem resultados. estudoId é opcional e validado contra as participações.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Histórico; pode ser lista vazia."),
        @ApiResponse(responseCode = "400", description = "Parâmetro estudoId inválido.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404", description = "Estudo sem participação da conta autenticada.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public List<HistoricoVisitaParticipanteResposta> listarHistorico(
            @Parameter(description = "Filtra por um estudo em que a conta está incluída.")
            @RequestParam(required = false) Long estudoId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return consultas.listarHistorico(estudoId, autenticado);
    }
}
