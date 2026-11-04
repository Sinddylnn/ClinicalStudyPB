package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.recrutamento.service.ConsentimentoInclusaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

// <-------------------CONSENTIMENTO E INCLUSÃO NA API------------------->
/** Expõe os registros simulados e a inclusão com as condições do RF10 e do RF11. */
@RestController
@RequestMapping("/estudos/{estudoId}/candidatos/{candidatoId}")
@Tag(name = "Consentimento e inclusão")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "400", description = "Dados ou condições inválidas: estado, avaliação, consentimento ou conta.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "401", description = "Sessão ausente, expirada ou desativada.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil sem permissão ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "404", description = "Estudo ou candidato inexistente ou fora do vínculo permitido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class ConsentimentoInclusaoController {
    private final ConsentimentoInclusaoService servico;

    public ConsentimentoInclusaoController(ConsentimentoInclusaoService servico) {
        this.servico = servico;
    }

    // <-------------------CONSENTIMENTO------------------->

    /** Consulta o registro atual ou a situação pendente do candidato. */
    @GetMapping("/consentimento")
    @Operation(summary = "Consultar consentimento simulado",
            description = "Leitura pelo pesquisador responsável ou coordenador vinculado, inclusive após inclusão.")
    public RegistroConsentimentoResposta obterConsentimento(@PathVariable Long estudoId, @PathVariable Long candidatoId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return servico.obterConsentimento(estudoId, candidatoId, autenticado);
    }

    /** Registra a resposta e preserva as correções anteriores no histórico. */
    @PutMapping("/consentimento")
    @Operation(summary = "Registrar ou corrigir consentimento simulado",
            description = "Coordenador vinculado, durante recrutamento, após registrar avaliação e antes da inclusão. "
                    + "Aceita ACEITOU ou RECUSOU. Cada correção preserva o registro anterior.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    public RegistroConsentimentoResposta registrarConsentimento(@PathVariable Long estudoId, @PathVariable Long candidatoId,
            @Valid @RequestBody ConsentimentoEntrada entrada,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return servico.registrarConsentimento(estudoId, candidatoId, entrada, autenticado);
    }

    /** Lista a trilha das respostas sem permitir alterações nos registros antigos. */
    @GetMapping("/consentimento/historico")
    @Operation(summary = "Consultar histórico de consentimento",
            description = "Pesquisador responsável ou coordenador vinculado; registros do mais recente para o mais antigo.")
    public List<HistoricoConsentimentoResposta> historico(@PathVariable Long estudoId, @PathVariable Long candidatoId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return servico.historico(estudoId, candidatoId, autenticado);
    }

    // <-------------------INCLUSÃO------------------->

    /** Mostra as condições e a conta ativa cujo e-mail corresponde ao candidato. */
    @GetMapping("/inclusao")
    @Operation(summary = "Consultar condições de inclusão",
            description = "Pesquisador responsável ou coordenador vinculado. A consulta não reserva vaga.")
    public DadosInclusaoResposta obterInclusao(@PathVariable Long estudoId, @PathVariable Long candidatoId,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return servico.obterInclusao(estudoId, candidatoId, autenticado);
    }

    /** Inclui somente após reconferir todas as condições na mesma transação. */
    @PostMapping("/inclusao")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Incluir candidato como participante",
            description = "Coordenador vinculado. Exige recrutamento, avaliação completa e elegível, aceite registrado, "
                    + "conta ativa de participante com e-mail correspondente, ausência de inclusão anterior e vaga.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf"))
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Inclusão persistida; devolve candidato com dataInclusao."),
        @ApiResponse(responseCode = "409", description = "INCLUSAO_DUPLICADA ou LIMITE_ATINGIDO.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public CandidatoResposta incluir(@PathVariable Long estudoId, @PathVariable Long candidatoId,
            @Valid @RequestBody InclusaoEntrada entrada,
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado autenticado) {
        return servico.incluir(estudoId, candidatoId, entrada, autenticado);
    }
}
