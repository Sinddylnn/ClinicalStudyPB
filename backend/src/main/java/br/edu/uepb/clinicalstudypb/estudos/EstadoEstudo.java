package br.edu.uepb.clinicalstudypb.estudos;

/**
 * Define os estados possíveis de um estudo no sistema.
 *
 * O estudo inicia em PLANEJAMENTO e pode avançar conforme
 * as regras de negócio definidas para cada etapa.
 */
public enum EstadoEstudo {

    PLANEJAMENTO,
    RECRUTAMENTO,
    EXECUCAO,
    ENCERRADO
}