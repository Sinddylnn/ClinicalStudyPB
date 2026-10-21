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
public enum EstadoEstudo {

    PLANEJAMENTO,
    RECRUTAMENTO,
    EXECUCAO,
    ENCERRADO
}
