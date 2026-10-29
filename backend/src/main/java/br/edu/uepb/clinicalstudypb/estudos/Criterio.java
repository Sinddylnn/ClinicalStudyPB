package br.edu.uepb.clinicalstudypb.estudos;

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

// <-------------------CRITERIO: BASE DE PERSISTÊNCIA------------------->
/**
 * Identifica um critério que poderá receber uma resposta na avaliação de elegibilidade.
 *
 * <p>Os cadastros serão implementados nos serviços próprios. Eles deverão bloquear o
 * estudo e conferir PLANEJAMENTO antes de alterar o protocolo ou seus itens.</p>
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
@Entity
@Table(name = "criterios")
public class Criterio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "protocolo_id", nullable = false)
    private Protocolo protocolo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoCriterio tipo;

    @Column(nullable = false, length = 1000)
    private String descricao;

    /** Construtor protegido utilizado pelo JPA. */
    protected Criterio() {
    }

    /**
     * Cria o registro a partir de dados validados pelo serviço responsável.
     *
     * @param protocolo protocolo que define o critério
     * @param tipo inclusão ou exclusão
     * @param descricao texto do critério
     */
    public Criterio(Protocolo protocolo, TipoCriterio tipo, String descricao) {
        this.protocolo = protocolo;
        this.tipo = tipo;
        this.descricao = descricao == null ? null : descricao.strip();
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Protocolo getProtocolo() {
        return protocolo;
    }

    public TipoCriterio getTipo() {
        return tipo;
    }

    public String getDescricao() {
        return descricao;
    }
}
