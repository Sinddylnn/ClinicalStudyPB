package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;

// <-------------------PEDIDO DE REAGENDAMENTO DO PARTICIPANTE------------------->
/**
 * Registra o pedido do participante para mudar a data de uma visita agendada.
 *
 * <p>O pedido não altera a visita: a data só muda quando o coordenador aprova, e essa
 * troca é feita pelo serviço na mesma visita, sem criar outra. Os serviços conferem o
 * estado atual da visita antes de chamar {@link #aprovar}, {@link #recusar} ou
 * {@link #cancelar}.</p>
 * @author Georis
 * @version 1.0
 * @since 25/11/2026
 */
@Entity
@Table(name = "solicitacoes_reagendamento")
public class SolicitacaoReagendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visita_agendada_id", nullable = false)
    private VisitaAgendada visitaAgendada;

    @Column(name = "data_hora_original", nullable = false)
    private Instant dataHoraOriginal;

    @Column(name = "data_hora_desejada", nullable = false)
    private Instant dataHoraDesejada;

    @Column(length = 500)
    private String motivo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SituacaoSolicitacao situacao = SituacaoSolicitacao.PENDENTE;

    @Column(name = "solicitada_em", nullable = false)
    private Instant solicitadaEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "respondida_por_id")
    private Usuario respondidaPor;

    @Column(name = "encerrada_em")
    private Instant encerradaEm;

    @Column(name = "data_hora_aprovada")
    private Instant dataHoraAprovada;

    @Column(name = "justificativa_recusa", length = 500)
    private String justificativaRecusa;

    /** Construtor protegido utilizado pelo JPA. */
    protected SolicitacaoReagendamento() {
    }

    /**
     * Cria o pedido PENDENTE a partir de dados já validados pelo serviço.
     *
     * <p>A data atual da visita é copiada para {@code dataHoraOriginal}. Um motivo só com
     * espaços é tratado como ausente, pois o campo é opcional.</p>
     *
     * @param visitaAgendada visita futura e AGENDADA da participação do solicitante
     * @param dataHoraDesejada nova data e hora desejadas pelo participante
     * @param motivo motivo opcional, de até 500 caracteres
     * @param solicitadaEm instante em que o pedido foi feito
     */
    public SolicitacaoReagendamento(
            VisitaAgendada visitaAgendada, Instant dataHoraDesejada, String motivo, Instant solicitadaEm) {
        this.visitaAgendada = Objects.requireNonNull(visitaAgendada);
        this.dataHoraOriginal = visitaAgendada.getDataHora();
        this.dataHoraDesejada = Objects.requireNonNull(dataHoraDesejada);
        this.motivo = textoOpcional(motivo);
        this.solicitadaEm = Objects.requireNonNull(solicitadaEm);
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public VisitaAgendada getVisitaAgendada() {
        return visitaAgendada;
    }

    public Instant getDataHoraOriginal() {
        return dataHoraOriginal;
    }

    public Instant getDataHoraDesejada() {
        return dataHoraDesejada;
    }

    public String getMotivo() {
        return motivo;
    }

    public SituacaoSolicitacao getSituacao() {
        return situacao;
    }

    public Instant getSolicitadaEm() {
        return solicitadaEm;
    }

    public Usuario getRespondidaPor() {
        return respondidaPor;
    }

    public Instant getEncerradaEm() {
        return encerradaEm;
    }

    public Instant getDataHoraAprovada() {
        return dataHoraAprovada;
    }

    public String getJustificativaRecusa() {
        return justificativaRecusa;
    }

    // <-------------------RESPOSTA DO COORDENADOR------------------->

    /**
     * Aprova o pedido registrando a data definida pelo coordenador.
     *
     * <p>Não altera a visita: o serviço troca a data dela e limpa a confirmação de presença
     * na mesma transação.</p>
     *
     * @param responsavel coordenador vinculado ao estudo
     * @param dataHoraAprovada nova data e hora, que pode diferir da desejada
     * @param encerradaEm instante da resposta
     */
    public void aprovar(Usuario responsavel, Instant dataHoraAprovada, Instant encerradaEm) {
        exigirPendente();
        this.dataHoraAprovada = Objects.requireNonNull(dataHoraAprovada);
        this.respondidaPor = Objects.requireNonNull(responsavel);
        this.encerradaEm = Objects.requireNonNull(encerradaEm);
        this.situacao = SituacaoSolicitacao.APROVADA;
    }

    /**
     * Recusa o pedido; a visita mantém a data atual.
     *
     * @param responsavel coordenador vinculado ao estudo
     * @param justificativa explicação obrigatória, de 1 a 500 caracteres
     * @param encerradaEm instante da resposta
     */
    public void recusar(Usuario responsavel, String justificativa, Instant encerradaEm) {
        exigirPendente();
        String justificativaNormalizada = justificativa == null ? null : justificativa.strip();
        if (justificativaNormalizada == null || justificativaNormalizada.isEmpty()
                || justificativaNormalizada.length() > 500) {
            throw new RegraNegocioException("JUSTIFICATIVA_RECUSA_INVALIDA",
                    "A justificativa deve ter entre 1 e 500 caracteres.");
        }
        this.justificativaRecusa = justificativaNormalizada;
        this.respondidaPor = Objects.requireNonNull(responsavel);
        this.encerradaEm = Objects.requireNonNull(encerradaEm);
        this.situacao = SituacaoSolicitacao.RECUSADA;
    }

    // <-------------------CANCELAMENTO AUTOMÁTICO------------------->

    /**
     * Cancela o pedido sem resposta do coordenador, por exemplo na retirada do participante.
     *
     * @param encerradaEm instante do cancelamento
     */
    public void cancelar(Instant encerradaEm) {
        exigirPendente();
        this.encerradaEm = Objects.requireNonNull(encerradaEm);
        this.situacao = SituacaoSolicitacao.CANCELADA;
    }

    // <-------------------REGRAS INTERNAS------------------->

    // somente pedidos pendentes podem receber resposta ou cancelamento
    private void exigirPendente() {
        if (situacao != SituacaoSolicitacao.PENDENTE) {
            throw new RegraNegocioException("SOLICITACAO_NAO_PENDENTE",
                    "O pedido já foi respondido ou cancelado.");
        }
    }

    // texto opcional: espaços das pontas retirados e valor vazio tratado como ausente
    private static String textoOpcional(String texto) {
        if (texto == null) {
            return null;
        }
        String normalizado = texto.strip();
        return normalizado.isEmpty() ? null : normalizado;
    }
}
