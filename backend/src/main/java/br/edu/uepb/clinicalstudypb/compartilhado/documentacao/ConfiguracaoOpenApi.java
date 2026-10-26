package br.edu.uepb.clinicalstudypb.compartilhado.documentacao;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityScheme;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// <-------------------CONTRATO PÚBLICO DA API------------------->
/**
 * Descreve a API e complementa a documentação do logout atendido por um filtro.
 *
 * <p>Esta configuração documenta o comportamento existente; não cria endpoints
 * de negócio nem substitui as regras de segurança.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 23/10/2026
 */
@Configuration
public class ConfiguracaoOpenApi {

    /**
     * Define a identificação da API e os elementos reutilizados pelas operações.
     *
     * @return contrato inicial, complementado pelo springdoc a partir dos controllers
     * @since 1.0
     */
    @Bean
    public OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info().title("ClinicalStudyPB API").version("1.0")
                        .description("Sistema acadêmico com dados fictícios. "
                                + "O contrato mostra as operações já implementadas. "
                                + "Para autenticar, consulte GET /auth/csrf e envie seu token no login. "
                                + "Após o login, consulte um novo token antes de outras alterações. "
                                + "O navegador administra o cookie HttpOnly; não o preencha manualmente no Swagger."))
                .components(new Components()
                        .addSecuritySchemes("sessao", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE)
                                .name("JSESSIONID")
                                .description("Cookie HttpOnly enviado automaticamente pelo navegador. "
                                        + "A identidade é estabelecida por POST /auth/login; "
                                        + "não há token Bearer neste contrato."))
                        .addParameters("TokenCsrf", new Parameter()
                                .name("X-CSRF-TOKEN").in("header").required(true)
                                .description("Copie o token de GET /auth/csrf, usando a mesma sessão. "
                                        + "Depois de um login bem-sucedido, obtenha um novo token.")
                                .schema(new StringSchema())));
    }

    // <-------------------OPERAÇÃO EXECUTADA PELO SPRING SECURITY------------------->
    /**
     * Inclui o logout real no contrato, pois ele não possui método em um controller.
     *
     * @return complemento da documentação sem acrescentar uma nova rota à aplicação
     * @since 1.0
     */
    @Bean
    public OpenApiCustomizer documentarLogout() {
        return api -> api.path("/auth/logout", new PathItem().post(new Operation()
                .operationId("logout").tags(List.of("Autenticação"))
                .summary("Encerrar a sessão")
                .description("Invalida a sessão no servidor e remove o cookie JSESSIONID. "
                        + "Não recebe corpo e exige CSRF válido. Também pode encerrar uma sessão "
                        + "ainda não autenticada, desde que o token seja válido.")
                .parameters(List.of(new Parameter().$ref("#/components/parameters/TokenCsrf")))
                .responses(new ApiResponses()
                        .addApiResponse("204", new ApiResponse().description("Sessão encerrada, sem corpo."))
                        .addApiResponse("403", new ApiResponse().description("CSRF ausente ou inválido.")
                                .content(new Content().addMediaType("application/json", new MediaType()
                                        .schema(new Schema<>().$ref("#/components/schemas/ErroApi"))))))));
    }
}
