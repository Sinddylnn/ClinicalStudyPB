package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

// <-------------------RESULTADO DE ATIVIDADE PREVISTA------------------->
/**
 * Registra o resultado fictício de uma atividade realizada em uma visita.
 *
 * @author Georis
 * @version 1.0
 * @since 11/11/2026
 */
@Entity
@Table(name = "resultado_atividade")
public class ResultadoAtividade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visita_agendada_id", nullable = false)
    private VisitaAgendada visitaAgendada;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "atividade_prevista_id", nullable = false)
    private AtividadePrevista atividadePrevista;

    @Column(nullable = false, length = 1000)
    private String texto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "registrado_por_id", nullable = false)
    private Usuario registradoPor;

    @Column(name = "registrado_em", nullable = false)
    private Instant registradoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atualizado_por_id")
    private Usuario atualizadoPor;

    @Column(name = "atualizado_em")
    private Instant atualizadoEm;

    protected ResultadoAtividade() {
    }

    /**
     * Cria um resultado para uma atividade prevista da visita agendada.
     *
     * @param visitaAgendada visita em que a atividade foi realizada
     * @param atividadePrevista atividade avaliada
     * @param texto resultado fictício informado
     * @param registradoPor usuário que registrou o resultado
     * @param registradoEm instante do registro
     */
    public ResultadoAtividade(
            VisitaAgendada visitaAgendada,
            AtividadePrevista atividadePrevista,
            String texto,
            Usuario registradoPor,
            Instant registradoEm) {
        this.visitaAgendada = visitaAgendada;
        this.atividadePrevista = atividadePrevista;
        this.texto = texto == null ? null : texto.strip();
        this.registradoPor = registradoPor;
        this.registradoEm = registradoEm;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public VisitaAgendada getVisitaAgendada() {
        return visitaAgendada;
    }

    public AtividadePrevista getAtividadePrevista() {
        return atividadePrevista;
    }

    public String getTexto() {
        return texto;
    }

    public Usuario getRegistradoPor() {
        return registradoPor;
    }

    public Instant getRegistradoEm() {
        return registradoEm;
    }

    public Usuario getAtualizadoPor() {
        return atualizadoPor;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }

    /**
     * Atualiza o resultado preservando os dados do registro original.
     *
     * @param texto texto atualizado, previamente validado pelo serviço
     * @param atualizadoPor usuário que realizou a atualização
     * @param atualizadoEm instante da atualização
     */
    public void atualizar(String texto, Usuario atualizadoPor, Instant atualizadoEm) {
        this.texto = texto == null ? null : texto.strip();
        this.atualizadoPor = atualizadoPor;
        this.atualizadoEm = atualizadoEm;
    }
}
