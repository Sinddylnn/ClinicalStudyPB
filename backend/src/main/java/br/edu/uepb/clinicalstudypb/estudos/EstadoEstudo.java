package br.edu.uepb.clinicalstudypb.estudos;

/**
 * Define os estados possíveis de um estudo no sistema.
 *
 * <p>O estudo inicia em PLANEJAMENTO e pode avançar conforme
 * as regras de negócio definidas para cada etapa.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 21/10/2026
 */
public enum     EstadoEstudo {

    PLANEJAMENTO,
    RECRUTAMENTO,
    EXECUCAO,
    ENCERRADO;

    // <-------------------CAMINHOS PERMITIDOS ENTRE ESTADOS------------------->

    /**
     * Confere o caminho da transição, sem substituir as condições de negócio do serviço.
     *
     * @param destino estado solicitado
     * @return {@code true} somente para os cinco caminhos definidos no Kickoff
     * @since 1.0
     */
    public boolean permiteTransicaoPara(EstadoEstudo destino) {
        if (destino == null) {
            return false;
        }
        return switch (this) {
            case PLANEJAMENTO -> destino == RECRUTAMENTO || destino == ENCERRADO;
            case RECRUTAMENTO -> destino == EXECUCAO || destino == ENCERRADO;
            case EXECUCAO -> destino == ENCERRADO;
            case ENCERRADO -> false;
        };
    }
}
