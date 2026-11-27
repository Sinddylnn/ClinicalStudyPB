package br.edu.uepb.clinicalstudypb.estudos;

// <-------------------SITUAÇÃO DOS PEDIDOS DO PARTICIPANTE------------------->
/**
 * Situação de um pedido feito pelo participante pelo aplicativo.
 *
 * <p>O reagendamento usa {@code PENDENTE}, {@code APROVADA}, {@code RECUSADA} e
 * {@code CANCELADA}. A retirada voluntária usa apenas {@code PENDENTE} e
 * {@code CONCLUIDA}, pois não existe recusa. Cada tabela restringe as situações
 * válidas com uma restrição CHECK.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 25/11/2026
 */
public enum SituacaoSolicitacao {
    PENDENTE,
    APROVADA,
    RECUSADA,
    CONCLUIDA,
    CANCELADA
}
