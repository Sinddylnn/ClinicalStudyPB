package br.edu.uepb.clinicalstudypb.compartilhado.erro;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// <-------------------TESTES DO CONTRATO HTTP DE ERROS------------------->
/**
 * Verifica o contrato de erros usando a aplicação real e requisições simuladas.
 *
 * <p>Os cenários não precisam de PostgreSQL nem de uma porta HTTP aberta.</p>
 *
 * @author Georis
 * @version 1.0
 * @see TratadorErrosApi
 * @since 20/10/2026
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TratadorErrosApiTest.ControllerDeTeste.class)
class TratadorErrosApiTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * Confere a rejeição de um campo obrigatório preenchido apenas com espaços.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void rejeitaCampoObrigatorioVazioComMensagemDoCampo() throws Exception {
        mockMvc.perform(post("/__teste/validacao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("VALIDACAO_INVALIDA"))
                .andExpect(jsonPath("$.errosCampos.nome").value("Informe o nome."));
    }

    /**
     * Confere que dados válidos são aceitos sem acionar o tratamento de erros.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void aceitaEntradaValidaSemAcionarTratamentoDeErro() throws Exception {
        mockMvc.perform(post("/__teste/validacao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Pessoa fictícia\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Pessoa fictícia"));
    }

    /**
     * Confere a resposta para JSON malformado sem divulgar detalhes de sua leitura.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void padronizaJsonMalformadoSemExporDetalhesDoParser() throws Exception {
        mockMvc.perform(post("/__teste/validacao")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"))
                .andExpect(jsonPath("$.mensagem").value("Confira o formato e os dados da requisição."))
                .andExpect(jsonPath("$.errosCampos").doesNotExist())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    /**
     * Confere a preservação do código e da mensagem de uma regra de negócio.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void preservaCodigoEMensagemDeRegraDeNegocio() throws Exception {
        mockMvc.perform(get("/__teste/regra"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REGRA_DE_TESTE"))
                .andExpect(jsonPath("$.mensagem").value("Operação recusada no cenário de teste."));
    }

    /**
     * Confere a resposta HTTP 404 no formato de erro da API.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void padronizaEnderecoInexistente() throws Exception {
        mockMvc.perform(get("/rota-inexistente"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));
    }

    /**
     * Confere a resposta HTTP 405 para um método não aceito pelo endereço.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void preservaStatusDeMetodoNaoPermitido() throws Exception {
        mockMvc.perform(get("/__teste/validacao"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.codigo").value("METODO_NAO_PERMITIDO"));
    }

    /**
     * Confere a rejeição de conteúdo em texto quando a entrada esperada é JSON.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void rejeitaTipoDeConteudoNaoSuportado() throws Exception {
        mockMvc.perform(post("/__teste/validacao")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("Pessoa fictícia"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.codigo").value("CONTEUDO_NAO_SUPORTADO"));
    }

    /**
     * Confere que a resposta HTTP 500 não expõe a mensagem interna da exceção.
     *
     * @throws Exception se ocorrer uma falha ao executar a requisição simulada
     * @since 1.0
     */
    @Test
    void naoExpoeMensagemInternaEmFalhaInesperada() throws Exception {
        mockMvc.perform(get("/__teste/falha"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.codigo").value("ERRO_INTERNO"))
                .andExpect(jsonPath("$.mensagem").value("Ocorreu um erro interno. Tente novamente."))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    // <-------------------CENÁRIOS EXCLUSIVOS DOS TESTES------------------->
    /**
     * Disponibiliza rotas exclusivas para provocar os cenários dos testes.
     *
     * <p>Estas rotas não entram no JAR nem são funcionalidades do sistema.</p>
     *
     * @author Georis
     * @version 1.0
     * @since 20/10/2026
     */
    @RestController
    static class ControllerDeTeste {

        /**
         * Devolve a entrada recebida após a validação executada pelo Spring.
         *
         * @param entrada dados enviados na requisição de teste
         * @return os mesmos dados quando a validação é bem-sucedida
         * @see EntradaDeTeste
         * @since 1.0
         */
        @PostMapping("/__teste/validacao")
        EntradaDeTeste validar(@Valid @RequestBody EntradaDeTeste entrada) {
            return entrada;
        }

        /**
         * Provoca uma recusa de regra de negócio para verificar o tratamento HTTP.
         *
         * @throws RegraNegocioException sempre, para produzir o cenário de teste
         * @since 1.0
         */
        @GetMapping("/__teste/regra")
        void recusarRegra() {
            throw new RegraNegocioException(
                    "REGRA_DE_TESTE", "Operação recusada no cenário de teste.");
        }

        /**
         * Provoca uma falha interna para verificar a proteção da resposta.
         *
         * @throws IllegalStateException sempre, para produzir o cenário de teste
         * @since 1.0
         */
        @GetMapping("/__teste/falha")
        void provocarFalha() {
            throw new IllegalStateException("Detalhe interno que não deve chegar ao cliente.");
        }
    }

    /**
     * Representa uma entrada mínima para verificar a validação dos campos.
     *
     * @author Georis
     * @version 1.0
     * @param nome campo obrigatório usado nos cenários de validação
     * @since 20/10/2026
     */
    record EntradaDeTeste(@NotBlank(message = "Informe o nome.") String nome) {
    }
}
