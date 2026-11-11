package br.edu.uepb.clinicalstudypb.estudos;

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

// <-------------------HISTÓRICO DE CORREÇÕES DA VISITA------------------->
/**
 * Preserva a correção de situação de uma visita já registrada.
 *
 * @author Georis
 * @version 1.0
 * @since 11/11/2026
 */
@Entity
@Table(name = "correcao_visita")
public class CorrecaoVisita {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visita_agendada_id", nullable = false)
    private VisitaAgendada visitaAgendada;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao_anterior", nullable = false, length = 20)
    private SituacaoVisita situacaoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "situacao_nova", nullable = false, length = 20)
    private SituacaoVisita situacaoNova;

    @Column(nullable = false, length = 500)
    private String justificativa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "corrigida_por_id", nullable = false)
    private Usuario corrigidaPor;

    @Column(name = "corrigida_em", nullable = false)
    private Instant corrigidaEm;

    protected CorrecaoVisita() {
    }

    /**
     * Registra a mudança de uma situação final para outra.
     *
     * @param visitaAgendada visita corrigida
     * @param situacaoAnterior situação antes da correção
     * @param situacaoNova situação definida pela correção
     * @param justificativa motivo da correção
     * @param corrigidaPor usuário que corrigiu o registro
     * @param corrigidaEm instante da correção
     */
    public CorrecaoVisita(
            VisitaAgendada visitaAgendada,
            SituacaoVisita situacaoAnterior,
            SituacaoVisita situacaoNova,
            String justificativa,
            Usuario corrigidaPor,
            Instant corrigidaEm) {
        this.visitaAgendada = visitaAgendada;
        this.situacaoAnterior = situacaoAnterior;
        this.situacaoNova = situacaoNova;
        this.justificativa = justificativa == null ? null : justificativa.strip();
        this.corrigidaPor = corrigidaPor;
        this.corrigidaEm = corrigidaEm;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public VisitaAgendada getVisitaAgendada() {
        return visitaAgendada;
    }

    public SituacaoVisita getSituacaoAnterior() {
        return situacaoAnterior;
    }

    public SituacaoVisita getSituacaoNova() {
        return situacaoNova;
    }

    public String getJustificativa() {
        return justificativa;
    }

    public Usuario getCorrigidaPor() {
        return corrigidaPor;
    }

    public Instant getCorrigidaEm() {
        return corrigidaEm;
    }
}
