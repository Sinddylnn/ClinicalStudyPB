package br.edu.uepb.clinicalstudypb.compartilhado.erro;

// <-------------------REGRAS DE NEGÓCIO NÃO ATENDIDAS------------------->
/**
 * Indica que uma regra de negócio impede a conclusão de uma operação.
 *
 * <p>Os serviços podem lançar esta exceção para gerar uma resposta HTTP 400.
 * A mensagem deve ser adequada ao usuário, sem SQL, senhas ou detalhes internos.</p>
 *
 * @author Georis
 * @version 1.0
 * @see TratadorErrosApi#tratarRegraNegocio(RegraNegocioException)
 * @since 20/10/2026
 */
public class RegraNegocioException extends RuntimeException {

    private final String codigo;

    /**
     * Registra o motivo da recusa para o tratamento centralizado de erros.
     *
     * @param codigo identificador da regra não atendida
     * @param mensagem explicação que pode ser apresentada ao usuário
     */
    public RegraNegocioException(String codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }
}
