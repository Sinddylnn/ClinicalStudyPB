package br.edu.uepb.clinicalstudypb.estudos.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.service.ResultadoAtividadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

/**
 * Disponibiliza o cadastro, a edição e a consulta dos resultados fictícios das atividades.
 *
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
@RestController
@RequestMapping("/estudos/{estudoId}/participacoes/{participacaoId}/visitas/{visitaAgendadaId}/resultados")
@Tag(name = "Resultados de atividades")
@SecurityRequirement(name = "sessao")
@ApiResponses({
    @ApiResponse(responseCode = "401", description = "Usuário não autenticado.",
            content = @Content(schema = @Schema(implementation = ErroApi.class))),
    @ApiResponse(responseCode = "403", description = "Perfil sem permissão ou CSRF inválido.",
            content = @Content(schema = @Schema(implementation = ErroApi.class)))
})
public class ResultadoAtividadeController {

    private final ResultadoAtividadeService resultados;

    /**
     * Inicializa o controller com o serviço de resultados.
     *
     * @param resultados serviço de registro e edição de resultados
     */
    public ResultadoAtividadeController(ResultadoAtividadeService resultados) {
        this.resultados = resultados;
    }

    /**
     * Lista os resultados registrados em uma visita.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita
     * @param autenticado usuário autenticado
     * @return resultados registrados, ou lista vazia quando não houver
     * @since 1.0
     */
    @GetMapping
    @Operation(
            summary = "Listar resultados da visita",
            description = "Consulta os resultados de uma visita do estudo vinculado ao coordenador, "
                    + "inclusive quando o estudo está encerrado ou o participante foi retirado."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Resultados encontrados ou lista vazia.",
                content = @Content(array = @ArraySchema(
                        schema = @Schema(implementation = ResultadoAtividadeResposta.class)))),
        @ApiResponse(responseCode = "404", description = "Estudo, participação ou visita fora do vínculo esperado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public List<ResultadoAtividadeResposta> listarResultados(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @PathVariable Long visitaAgendadaId,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return resultados.listarResultados(
                estudoId, participacaoId, visitaAgendadaId, autenticado);
    }

    /**
     * Registra o resultado de uma atividade de visita realizada.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita agendada
     * @param entrada dados da atividade e do resultado
     * @param autenticado usuário autenticado
     * @return dados do resultado registrado
     * @since 1.0
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Registrar resultado de atividade",
            description = "Exige coordenador vinculado ao estudo, participação ativa e visita realizada. "
                    + "Aceita resultados parciais, mas apenas um por atividade em cada visita.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Resultado registrado com sucesso."),
        @ApiResponse(responseCode = "400",
                description = "ESTADO_ESTUDO_INVALIDO, PARTICIPACAO_INVALIDA, RESULTADO_INVALIDO ou VALIDACAO_INVALIDA.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "RECURSO_NAO_ENCONTRADO: estudo, participação ou visita inexistente ou fora do vínculo esperado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "409",
                description = "RESULTADO_JA_REGISTRADO: resultado já registrado para a atividade nesta visita.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public ResultadoAtividadeResposta registrar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @PathVariable Long visitaAgendadaId,
            @Valid @RequestBody ResultadoAtividadeCadastroEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return resultados.registrar(
                estudoId, participacaoId, visitaAgendadaId, entrada, autenticado);
    }

    /**
     * Edita o texto de um resultado pertencente à visita informada.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita agendada
     * @param resultadoId identificador do resultado
     * @param entrada texto atualizado
     * @param autenticado usuário autenticado
     * @return resultado atualizado
     * @since 1.0
     */
    @PutMapping("/{resultadoId}")
    @ResponseStatus(HttpStatus.OK)
    @Operation(
            summary = "Editar resultado de atividade",
            description = "Altera apenas o texto de um resultado já registrado, preservando os dados "
                    + "do registro original e identificando a última atualização.",
            parameters = @Parameter(ref = "#/components/parameters/TokenCsrf")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Resultado editado com sucesso."),
        @ApiResponse(responseCode = "400",
                description = "ESTADO_ESTUDO_INVALIDO, PARTICIPACAO_INVALIDA, RESULTADO_INVALIDO ou VALIDACAO_INVALIDA.",
                content = @Content(schema = @Schema(implementation = ErroApi.class))),
        @ApiResponse(responseCode = "404",
                description = "RECURSO_NAO_ENCONTRADO: estudo, visita ou resultado inexistente ou fora do vínculo esperado.",
                content = @Content(schema = @Schema(implementation = ErroApi.class)))
    })
    public ResultadoAtividadeResposta editar(
            @PathVariable Long estudoId,
            @PathVariable Long participacaoId,
            @PathVariable Long visitaAgendadaId,
            @PathVariable Long resultadoId,
            @Valid @RequestBody ResultadoAtividadeEdicaoEntrada entrada,
            @Parameter(hidden = true)
            @AuthenticationPrincipal UsuarioAutenticado autenticado) {

        return resultados.editar(
                estudoId, participacaoId, visitaAgendadaId, resultadoId, entrada, autenticado);
    }
}
