package br.edu.uepb.clinicalstudypb.compartilhado.erro;

import java.util.Map;
import java.util.TreeMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

// <-------------------TRATAMENTO CENTRALIZADO DE ERROS------------------->
/**
 * Padroniza as respostas de erro dos controllers usando o contrato {@link ErroApi}.
 *
 * <p>Trata validações, regras de negócio e falhas HTTP para que os módulos
 * utilizem o mesmo formato de resposta. Falhas inesperadas recebem uma mensagem
 * genérica, sem expor detalhes internos ao cliente.</p>
 *
 * @author Georis
 * @version 1.0
 * @see ErroApi
 * @see RegraNegocioException
 * @since 20/10/2026
 */
@RestControllerAdvice
public class TratadorErrosApi extends ResponseEntityExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(TratadorErrosApi.class);

    // <-------------------VALIDAÇÃO DOS CAMPOS DO DTO------------------->
    /**
     * Agrupa as mensagens de validação pelos campos do DTO e padroniza a resposta.
     *
     * @param exception falha de validação com os erros dos campos
     * @param headers cabeçalhos definidos pelo Spring para a resposta
     * @param status código HTTP definido para a falha de validação
     * @param request requisição que originou o erro
     * @return resposta com as mensagens de validação ou {@code null} se já enviada
     * @see ErroApi
     * @since 1.0
     */
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        Map<String, String> errosCampos = new TreeMap<>();
        // Acumula as mensagens quando mais de uma validação falha no mesmo campo
        exception.getBindingResult().getFieldErrors().forEach(erro ->
                errosCampos.merge(
                        erro.getField(),
                        erro.getDefaultMessage() == null ? "Valor inválido." : erro.getDefaultMessage(),
                        (primeira, proxima) -> primeira + " " + proxima));

        ErroApi erro = new ErroApi(
                "VALIDACAO_INVALIDA", "Confira os campos informados.", errosCampos);
        return handleExceptionInternal(exception, erro, headers, status, request);
    }

    // <-------------------REGRAS DOS SERVIÇOS------------------->
    /**
     * Converte uma regra de negócio não atendida em uma resposta HTTP 400.
     *
     * @param exception exceção com o código e a mensagem definidos pelo serviço
     * @return resposta com o motivo da recusa
     * @see RegraNegocioException
     * @since 1.0
     */
    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<ErroApi> tratarRegraNegocio(RegraNegocioException exception) {
        return ResponseEntity.badRequest()
                .body(new ErroApi(exception.getCodigo(), exception.getMessage()));
    }

      /**
     * Converte um conflito com o estado atual dos dados em uma resposta HTTP 409.
     *
     * @param exception exceção com o código e a mensagem do conflito
     * @return resposta com o motivo do conflito
     * @see ConflitoException
     * @since 1.0
     */
    @ExceptionHandler(ConflitoException.class)
    public ResponseEntity<ErroApi> tratarConflito(ConflitoException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErroApi(exception.getCodigo(), exception.getMessage()));
    }

    // <-------------------SEGURANÇA NOS CONTROLLERS E SERVIÇOS------------------->
    /**
     * Recusa o login sem revelar se o e-mail existe ou se a conta está desativada.
     *
     * @param exception falha identificada pelo mecanismo de autenticação
     * @return resposta HTTP 401 com mensagem genérica de credenciais
     * @since 1.0
     */
    @ExceptionHandler({BadCredentialsException.class, AccountStatusException.class})
    public ResponseEntity<ErroApi> tratarAutenticacao(AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErroApi("CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos."));
    }

    /**
     * Preserva o HTTP 403 quando a autorização é verificada dentro de um método.
     *
     * @param exception recusa de uma operação protegida
     * @return resposta com a indicação de acesso negado
     * @since 1.0
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErroApi> tratarAcessoNegado(AccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErroApi("ACESSO_NEGADO", "Seu perfil não permite esta operação."));
    }

    // <-------------------ERROS HTTP DO SPRING MVC------------------->
    /**
     * Preserva um erro já padronizado ou adapta o erro HTTP ao contrato da API.
     *
     * @param exception falha tratada pelo Spring MVC
     * @param body corpo de resposta já preparado, quando disponível
     * @param headers cabeçalhos da resposta
     * @param status código HTTP que deve ser preservado
     * @param request requisição que originou o erro
     * @return resposta padronizada ou {@code null} se a resposta já foi enviada
     * @see ErroApi
     * @since 1.0
     */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception,
            Object body,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {
        // Mantém erros de campos já construídos e padroniza os demais erros HTTP
        Object resposta = body instanceof ErroApi ? body : criarErroHttp(status);
        return super.handleExceptionInternal(exception, resposta, headers, status, request);
    }

    /**
     * Seleciona uma mensagem apropriada ao código HTTP sem expor detalhes internos.
     *
     * @param status código HTTP da falha
     * @return código e mensagem de erro para a interface
     * @since 1.0
     */
    private ErroApi criarErroHttp(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> new ErroApi("REQUISICAO_INVALIDA",
                    "Confira o formato e os dados da requisição.");
            case 404 -> new ErroApi("RECURSO_NAO_ENCONTRADO",
                    "O recurso solicitado não foi encontrado.");
            case 405 -> new ErroApi("METODO_NAO_PERMITIDO",
                    "O método HTTP não é permitido para este endereço.");
            case 415 -> new ErroApi("CONTEUDO_NAO_SUPORTADO",
                    "O formato do conteúdo enviado não é suportado.");
            default -> new ErroApi("ERRO_HTTP", "Não foi possível atender à requisição.");
        };
    }

    // <-------------------FALHAS INESPERADAS------------------->
    /**
     * Registra uma falha inesperada no servidor e devolve uma resposta HTTP 500.
     *
     * @param exception falha capturada durante o atendimento da requisição
     * @return resposta genérica sem os detalhes internos da exceção
     * @since 1.0
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroApi> tratarErroInesperado(Exception exception) {
        // Detalhes ficam no log do servidor e nunca são devolvidos ao navegador
        LOG.error("Falha inesperada ao atender uma requisição.", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErroApi("ERRO_INTERNO", "Ocorreu um erro interno. Tente novamente."));
    }
}
