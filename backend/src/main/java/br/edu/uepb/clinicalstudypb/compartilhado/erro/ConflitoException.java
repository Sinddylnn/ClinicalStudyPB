package br.edu.uepb.clinicalstudypb.compartilhado.erro;

/**
 * Indica que uma operação entra em conflito com um registro já existente.
 *
 * <p>É utilizada quando a requisição é válida, mas não pode ser concluída
 * devido ao estado atual dos dados.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
public class ConflitoException extends RuntimeException {

    private final String codigo;

    /**
     * Registra o conflito para o tratamento centralizado de erros.
     *
     * @param codigo identificador do conflito
     * @param mensagem explicação que pode ser apresentada ao usuário
     */
    public ConflitoException(String codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    /**
     * Retorna o identificador utilizado na resposta da API.
     *
     * @return código do conflito identificado
     * @since 1.0
     */
    public String getCodigo() {
        return codigo;
    }
}