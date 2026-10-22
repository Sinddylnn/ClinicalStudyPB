package br.edu.uepb.clinicalstudypb.compartilhado.seguranca;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ErroApi;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

// <-------------------ERROS DOS FILTROS DE SEGURANÇA------------------->
/**
 * Mantém o contrato JSON de erros também nas recusas anteriores ao controller.
 *
 * @author Georis
 * @version 1.0
 * @since 21/10/2026
 */
@Component
public class RespostaErroSeguranca implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper json;

    /**
     * Utiliza o conversor JSON configurado pelo Spring Boot.
     *
     * @param json conversor dos corpos de resposta
     */
    public RespostaErroSeguranca(ObjectMapper json) {
        this.json = json;
    }

    /**
     * Informa que a operação exige uma sessão autenticada válida.
     *
     * @param request requisição recusada
     * @param response resposta que receberá o erro
     * @param exception motivo interno da recusa
     * @throws IOException se não for possível escrever a resposta
     * @since 1.0
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        escrever(response, 401, new ErroApi("AUTENTICACAO_NECESSARIA",
                "Entre no sistema para realizar esta operação."));
    }

    /**
     * Diferencia a falta de permissão de uma proteção CSRF ausente ou inválida.
     *
     * @param request requisição recusada
     * @param response resposta que receberá o erro
     * @param exception falha de autorização ou de proteção CSRF
     * @throws IOException se não for possível escrever a resposta
     * @since 1.0
     */
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
            AccessDeniedException exception) throws IOException {
        ErroApi erro = exception instanceof CsrfException
                ? new ErroApi("CSRF_INVALIDO", "Atualize a proteção da sessão e tente novamente.")
                : new ErroApi("ACESSO_NEGADO", "Seu perfil não permite esta operação.");
        escrever(response, 403, erro);
    }

    /**
     * Escreve um erro JSON sem redirecionar a interface para uma página HTML.
     *
     * @param response resposta HTTP em construção
     * @param status código HTTP da recusa
     * @param erro informações públicas do erro
     * @throws IOException se não for possível escrever a resposta
     * @since 1.0
     */
    private void escrever(HttpServletResponse response, int status, ErroApi erro) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        json.writeValue(response.getOutputStream(), erro);
    }
}
