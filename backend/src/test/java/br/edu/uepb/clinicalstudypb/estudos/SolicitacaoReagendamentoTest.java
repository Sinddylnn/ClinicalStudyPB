package br.edu.uepb.clinicalstudypb.estudos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.Test;

// <-------------------TRANSIÇÕES DO PEDIDO DE REAGENDAMENTO------------------->
/**
 * Confere as transições de situação do pedido de reagendamento, sem banco de dados
 *
 * @author Georis
 * @version 1.0
 * @since 26/11/2026
 */
class SolicitacaoReagendamentoTest {

    private static final Instant AGORA = Instant.parse("2026-11-26T12:00:00Z");
    private static final Instant DATA_VISITA = AGORA.plus(2, ChronoUnit.DAYS);
    private static final Instant DATA_DESEJADA = AGORA.plus(5, ChronoUnit.DAYS);

    private final Usuario coordenador =
            new Usuario("Coordenador", "coordenador@example.test", "hash-ficticio", PerfilUsuario.COORDENADOR);

    // O construtor da visita não valida vínculos; basta a data, que o pedido copia como original
    private final VisitaAgendada visita = new VisitaAgendada(null, null, DATA_VISITA);

    /**
     * Cria um pedido pendente para a visita usada nos testes
     *
     * @param motivo motivo opcional do pedido
     * @return pedido de reagendamento
     * @since 1.0
     */
    private SolicitacaoReagendamento novoPedido(String motivo) {
        return new SolicitacaoReagendamento(visita, DATA_DESEJADA, motivo, AGORA);
    }

    /**
     * Confere o código de negócio retornado por uma ação inválida
     *
     * @param codigo código esperado
     * @param acao ação que deve falhar
     * @since 1.0
     */
    private static void rejeitaComCodigo(String codigo, ThrowingCallable acao) {
        assertThatThrownBy(acao).isInstanceOfSatisfying(RegraNegocioException.class,
                e -> assertThat(e.getCodigo()).isEqualTo(codigo));
    }

    /**
     * Confere que o pedido copia a data da visita e normaliza os dados iniciais
     *
     * @since 1.0
     */
    @Test
    void criaPedidoPendenteCopiandoADataAtualDaVisita() {
        SolicitacaoReagendamento pedido = novoPedido("  Consulta médica  ");

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.PENDENTE);
        assertThat(pedido.getDataHoraOriginal()).isEqualTo(DATA_VISITA);
        assertThat(pedido.getDataHoraDesejada()).isEqualTo(DATA_DESEJADA);
        assertThat(pedido.getMotivo()).isEqualTo("Consulta médica");
        assertThat(pedido.getRespondidaPor()).isNull();
        assertThat(pedido.getEncerradaEm()).isNull();
    }

    /**
     * Confere que motivo nulo ou composto só por espaços é tratado como ausente
     *
     * @since 1.0
     */
    @Test
    void motivoNuloOuSoComEspacosViraAusente() {
        assertThat(novoPedido(null).getMotivo()).isNull();
        assertThat(novoPedido("   ").getMotivo()).isNull();
    }

    /**
     * Confere que aprovar registra o responsável, a data aprovada e o encerramento
     *
     * @since 1.0
     */
    @Test
    void aprovarRegistraResponsavelDataAprovadaEEncerramento() {
        SolicitacaoReagendamento pedido = novoPedido(null);
        Instant dataAprovada = AGORA.plus(6, ChronoUnit.DAYS);

        pedido.aprovar(coordenador, dataAprovada, AGORA.plusSeconds(60));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.APROVADA);
        assertThat(pedido.getDataHoraAprovada()).isEqualTo(dataAprovada);
        assertThat(pedido.getRespondidaPor()).isSameAs(coordenador);
        assertThat(pedido.getEncerradaEm()).isEqualTo(AGORA.plusSeconds(60));
        assertThat(pedido.getJustificativaRecusa()).isNull();
    }

    /**
     * Confere que recusar normaliza a justificativa e não define data aprovada
     *
     * @since 1.0
     */
    @Test
    void recusarRegistraJustificativaSemEspacosNasPontas() {
        SolicitacaoReagendamento pedido = novoPedido(null);

        pedido.recusar(coordenador, "  Agenda cheia nessa data  ", AGORA.plusSeconds(60));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.RECUSADA);
        assertThat(pedido.getJustificativaRecusa()).isEqualTo("Agenda cheia nessa data");
        assertThat(pedido.getDataHoraAprovada()).isNull();
        assertThat(pedido.getRespondidaPor()).isSameAs(coordenador);
    }

    /**
     * Confere que justificativas inválidas não alteram a situação pendente
     *
     * @since 1.0
     */
    @Test
    void recusarComJustificativaInvalidaMantemOPedidoPendente() {
        SolicitacaoReagendamento pedido = novoPedido(null);

        for (String invalida : new String[]{null, "", "   ", "x".repeat(501)}) {
            rejeitaComCodigo("JUSTIFICATIVA_RECUSA_INVALIDA",
                    () -> pedido.recusar(coordenador, invalida, AGORA.plusSeconds(60)));
        }

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.PENDENTE);
        assertThat(pedido.getRespondidaPor()).isNull();
        assertThat(pedido.getEncerradaEm()).isNull();
    }

    /**
     * Confere que uma justificativa de 500 caracteres é aceita
     *
     * @since 1.0
     */
    @Test
    void recusarAceitaJustificativaNoLimiteDe500Caracteres() {
        SolicitacaoReagendamento pedido = novoPedido(null);

        pedido.recusar(coordenador, "x".repeat(500), AGORA.plusSeconds(60));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.RECUSADA);
    }

    /**
     * Confere que um pedido aprovado não recebe nova resposta ou cancelamento
     *
     * @since 1.0
     */
    @Test
    void pedidoAprovadoNaoRecebeNovaResposta() {
        SolicitacaoReagendamento pedido = novoPedido(null);
        pedido.aprovar(coordenador, DATA_DESEJADA, AGORA.plusSeconds(60));

        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE",
                () -> pedido.aprovar(coordenador, DATA_DESEJADA, AGORA.plusSeconds(120)));
        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE",
                () -> pedido.recusar(coordenador, "Agenda cheia", AGORA.plusSeconds(120)));
        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE", () -> pedido.cancelar(AGORA.plusSeconds(120)));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.APROVADA);
        assertThat(pedido.getEncerradaEm()).isEqualTo(AGORA.plusSeconds(60));
    }

    /**
     * Confere que um pedido recusado não pode ser aprovado ou cancelado
     *
     * @since 1.0
     */
    @Test
    void pedidoRecusadoNaoPodeSerAprovadoNemCancelado() {
        SolicitacaoReagendamento pedido = novoPedido(null);
        pedido.recusar(coordenador, "Agenda cheia", AGORA.plusSeconds(60));

        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE",
                () -> pedido.aprovar(coordenador, DATA_DESEJADA, AGORA.plusSeconds(120)));
        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE", () -> pedido.cancelar(AGORA.plusSeconds(120)));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.RECUSADA);
    }

    /**
     * Confere que cancelar não registra responsável e impede novas respostas
     *
     * @since 1.0
     */
    @Test
    void cancelarNaoRegistraResponsavelEImpedeNovaResposta() {
        SolicitacaoReagendamento pedido = novoPedido(null);

        pedido.cancelar(AGORA.plusSeconds(60));

        assertThat(pedido.getSituacao()).isEqualTo(SituacaoSolicitacao.CANCELADA);
        assertThat(pedido.getRespondidaPor()).isNull();
        assertThat(pedido.getEncerradaEm()).isEqualTo(AGORA.plusSeconds(60));
        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE",
                () -> pedido.aprovar(coordenador, DATA_DESEJADA, AGORA.plusSeconds(120)));
        rejeitaComCodigo("SOLICITACAO_NAO_PENDENTE",
                () -> pedido.recusar(coordenador, "Agenda cheia", AGORA.plusSeconds(120)));
    }
}
