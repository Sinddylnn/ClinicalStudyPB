package br.edu.uepb.clinicalstudypb.estudos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import org.junit.jupiter.api.Test;

// <-------------------TRANSIÇÕES DO PEDIDO DE RETIRADA------------------->
/**
 * Confere as transições de situação do pedido de retirada, sem banco de dados
 *
 * @author Georis
 * @version 1.0
 * @since 26/11/2026
 */
class SolicitacaoRetiradaTest {

    private static final Instant AGORA = Instant.parse("2026-11-26T12:00:00Z");

    private final Usuario coordenador =
            new Usuario("Coordenador", "coordenador@example.test", "hash-ficticio", PerfilUsuario.COORDENADOR);

    // O construtor legado não valida vínculos; o tipo explícito resolve a sobrecarga com Candidato
    private final Participacao participacao = new Participacao((Estudo) null, null, AGORA);

    /**
     * Confere a situação e os dados iniciais de um pedido sem motivo
     *
     * @since 1.0
     */
    @Test
    void criaPedidoPendenteSemMotivo() {
        SolicitacaoRetirada pedido = new SolicitacaoRetirada(participacao, null, AGORA);

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.PENDENTE);
        assertThat(pedido.getMotivo()).isNull();
        assertThat(pedido.getRespondidaPor()).isNull();
        assertThat(pedido.getEncerradaEm()).isNull();
    }

    /**
     * Confere a normalização do motivo opcional
     *
     * @since 1.0
     */
    @Test
    void normalizaMotivoOpcional() {
        assertThat(new SolicitacaoRetirada(participacao, "  Mudança de cidade  ", AGORA).getMotivo())
                .isEqualTo("Mudança de cidade");
        assertThat(new SolicitacaoRetirada(participacao, "   ", AGORA).getMotivo()).isNull();
    }

    /**
     * Confere que concluir registra o responsável e o instante de encerramento
     *
     * @since 1.0
     */
    @Test
    void concluirRegistraResponsavelEEncerramento() {
        SolicitacaoRetirada pedido = new SolicitacaoRetirada(participacao, null, AGORA);

        pedido.concluir(coordenador, AGORA.plusSeconds(60));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.CONCLUIDA);
        assertThat(pedido.getRespondidaPor()).isSameAs(coordenador);
        assertThat(pedido.getEncerradaEm()).isEqualTo(AGORA.plusSeconds(60));
    }

    /**
     * Confere que um pedido concluído não pode ser concluído novamente e preserva a primeira resposta
     *
     * @since 1.0
     */
    @Test
    void pedidoConcluidoNaoPodeSerConcluidoDeNovo() {
        SolicitacaoRetirada pedido = new SolicitacaoRetirada(participacao, null, AGORA);
        Instant encerramentoOriginal = AGORA.plusSeconds(60);
        pedido.concluir(coordenador, encerramentoOriginal);

        assertThatThrownBy(() -> pedido.concluir(coordenador, AGORA.plusSeconds(120)))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        e -> assertThat(e.getCodigo()).isEqualTo("SOLICITACAO_NAO_PENDENTE"));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.CONCLUIDA);
        assertThat(pedido.getRespondidaPor()).isSameAs(coordenador);
        assertThat(pedido.getEncerradaEm()).isEqualTo(encerramentoOriginal);
    }
}
