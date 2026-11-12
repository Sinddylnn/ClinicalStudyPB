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

// <-------------------VISITA AGENDADA DO PARTICIPANTE------------------->
/**
 * Registra uma ocorrência de visita prevista para uma participação.
 *
 * @author Georis
 * @version 1.0
 * @since 11/11/2026
 */
@Entity
@Table(name = "visitas_agendadas")
public class VisitaAgendada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participacao_id", nullable = false)
    private Participacao participacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visita_prevista_id", nullable = false)
    private VisitaPrevista visitaPrevista;

    @Column(name = "data_hora", nullable = false)
    private Instant dataHora;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SituacaoVisita situacao = SituacaoVisita.AGENDADA;

    @Column(length = 500)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registrado_por_id")
    private Usuario registradoPor;

    @Column(name = "registrado_em")
    private Instant registradoEm;

    protected VisitaAgendada() {
    }

    /**
     * Cria uma ocorrência agendada de uma visita prevista para uma participação.
     *
     * @param participacao participação incluída no estudo
     * @param visitaPrevista modelo da visita no protocolo do estudo
     * @param dataHora data e hora planejadas
     */
    public VisitaAgendada(Participacao participacao, VisitaPrevista visitaPrevista, Instant dataHora) {
        this.participacao = participacao;
        this.visitaPrevista = visitaPrevista;
        this.dataHora = dataHora;
        this.situacao = SituacaoVisita.AGENDADA;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Participacao getParticipacao() {
        return participacao;
    }

    public VisitaPrevista getVisitaPrevista() {
        return visitaPrevista;
    }

    public Instant getDataHora() {
        return dataHora;
    }

    public SituacaoVisita getSituacao() {
        return situacao;
    }

    public String getMotivo() {
        return motivo;
    }

    public Usuario getRegistradoPor() {
        return registradoPor;
    }

    public Instant getRegistradoEm() {
        return registradoEm;
    }

    /**
     * Atualiza a data e hora de uma visita agendada.
     *
     * @param dataHora nova data e hora, previamente validada pelo serviço
     */
    public void reagendar(Instant dataHora) {
        this.dataHora = dataHora;
    }

    /**
     * Registra a situação final da visita e os dados de auditoria.
     *
     * @param situacao situação registrada
     * @param motivo motivo do cancelamento ou da ausência, quando aplicável
     * @param registradoPor usuário que registrou a situação
     * @param registradoEm instante do registro
     */
    public void registrarSituacao(
            SituacaoVisita situacao, String motivo, Usuario registradoPor, Instant registradoEm) {
        this.situacao = situacao;
        this.motivo = motivo == null ? null : motivo.strip();
        this.registradoPor = registradoPor;
        this.registradoEm = registradoEm;
    }
}
