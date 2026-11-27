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

// <-------------------PEDIDO DE RETIRADA VOLUNTÁRIA DO PARTICIPANTE------------------->
/**
 * Registra o pedido do participante para sair de um estudo; não processa a retirada sozinho.
 *
 * <p>A retirada em si é feita pelo coordenador com a operação do RF16
 * ({@link Participacao#registrarRetirada}), e só então o pedido passa a {@code CONCLUIDA}.
 * Não existe recusa da retirada voluntária.</p>
 * @author Georis
 * @version 1.0
 * @since 25/11/2026
 */
@Entity
@Table(name = "solicitacoes_retirada")
public class SolicitacaoRetirada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participacao_id", nullable = false)
    private Participacao participacao;

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

    /** Construtor protegido utilizado pelo JPA. */
    protected SolicitacaoRetirada() {
    }

    /**
     * Cria o pedido PENDENTE a partir de dados já validados pelo serviço.
     *
     * <p>O motivo é opcional; um texto só com espaços é tratado como ausente.</p>
     *
     * @param participacao participação ATIVA do solicitante
     * @param motivo motivo opcional, de até 500 caracteres
     * @param solicitadaEm instante em que o pedido foi feito
     */
    public SolicitacaoRetirada(Participacao participacao, String motivo, Instant solicitadaEm) {
        this.participacao = Objects.requireNonNull(participacao);
        this.motivo = motivo == null || motivo.isBlank() ? null : motivo.strip();
        this.solicitadaEm = Objects.requireNonNull(solicitadaEm);
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Participacao getParticipacao() {
        return participacao;
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

    // <-------------------CONCLUSÃO PELA RETIRADA------------------->

    /**
     * Conclui o pedido depois que a retirada foi registrada na participação.
     *
     * @param responsavel coordenador que efetivou a retirada
     * @param encerradaEm instante da conclusão
     */
    public void concluir(Usuario responsavel, Instant encerradaEm) {
        if (situacao != SituacaoSolicitacao.PENDENTE) {
            throw new RegraNegocioException("SOLICITACAO_NAO_PENDENTE",
                    "O pedido já foi concluído.");
        }
        this.respondidaPor = Objects.requireNonNull(responsavel);
        this.encerradaEm = Objects.requireNonNull(encerradaEm);
        this.situacao = SituacaoSolicitacao.CONCLUIDA;
    }
}
