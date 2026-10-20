package br.edu.uepb.clinicalstudypb.compartilhado.erro;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

// <-------------------CONTRATO DE ERRO DA API------------------->
/**
 * Transporta os dados de um erro para a resposta JSON da API.
 *
 * <p>O mapa de campos é omitido da resposta quando está vazio.</p>
 *
 * @author Georis
 * @version 1.0
 * @param codigo identificador do erro que pode ser reconhecido pelas interfaces
 * @param mensagem explicação do problema para o usuário
 * @param errosCampos mensagens de validação associadas aos campos do formulário
 * @see TratadorErrosApi
 * @since 20/10/2026
 */
@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErroApi(String codigo, String mensagem, Map<String, String> errosCampos) {

    /**
     * Cria um erro que não pertence a um campo específico do formulário.
     *
     * @param codigo identificador do erro
     * @param mensagem explicação do problema para o usuário
     */
    public ErroApi(String codigo, String mensagem) {
        this(codigo, mensagem, Map.of());
    }
}
