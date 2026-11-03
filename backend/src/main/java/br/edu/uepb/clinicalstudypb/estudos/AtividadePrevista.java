package br.edu.uepb.clinicalstudypb.estudos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

// <-------------------ATIVIDADEPREVISTA: BASE DE PERSISTÊNCIA------------------->
/**
 * Descreve uma atividade do modelo de visita; não armazena resultados ou comparecimento.
 *
 * <p>Os cadastros serão implementados nos serviços próprios. Eles deverão bloquear o
 * estudo e conferir PLANEJAMENTO antes de alterar o protocolo ou seus itens.</p>
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
@Entity
@Table(name = "atividades_previstas")
public class AtividadePrevista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visita_prevista_id", nullable = false)
    private VisitaPrevista visitaPrevista;

    @Column(nullable = false, length = 1000)
    private String descricao;

    /** Construtor protegido utilizado pelo JPA. */
    protected AtividadePrevista() {
    }

    /**
     * Cria o registro a partir de dados validados pelo serviço responsável.
     *
     * @param visitaPrevista visita prevista à qual pertence
     * @param descricao descrição da atividade
     */
    public AtividadePrevista(VisitaPrevista visitaPrevista, String descricao) {
        this.visitaPrevista = visitaPrevista;
        this.descricao = descricao == null ? null : descricao.strip();
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public VisitaPrevista getVisitaPrevista() {
        return visitaPrevista;
    }

    public String getDescricao() {
        return descricao;
    }
}
