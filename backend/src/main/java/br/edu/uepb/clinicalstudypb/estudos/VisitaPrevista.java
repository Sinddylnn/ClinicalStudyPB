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

// <-------------------VISITAPREVISTA: BASE DE PERSISTÊNCIA------------------->
/**
 * Representa um modelo de visita do protocolo, sem participante ou agendamento.
 *
 * <p>Os cadastros serão implementados nos serviços próprios. Eles deverão bloquear o
 * estudo e conferir PLANEJAMENTO antes de alterar o protocolo ou seus itens.</p>
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
@Entity
@Table(name = "visitas_previstas")
public class VisitaPrevista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "protocolo_id", nullable = false)
    private Protocolo protocolo;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(length = 1000)
    private String descricao;

    @Column(nullable = false)
    private Integer ordem;

    /** Construtor protegido utilizado pelo JPA. */
    protected VisitaPrevista() {
    }

    /**
     * Cria o registro a partir de dados validados pelo serviço responsável.
     *
     * @param protocolo protocolo ao qual a visita pertence
     * @param nome nome apresentado na configuração
     * @param descricao descrição opcional
     * @param ordem posição positiva, única no protocolo
     */
    public VisitaPrevista(Protocolo protocolo, String nome, String descricao, Integer ordem) {
        this.protocolo = protocolo;
        this.nome = nome == null ? null : nome.strip();
        this.descricao = descricao == null ? null : descricao.strip();
        this.ordem = ordem;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Protocolo getProtocolo() {
        return protocolo;
    }

    public String getNome() {
        return nome;
    }

    public String getDescricao() {
        return descricao;
    }

    public Integer getOrdem() {
        return ordem;
    }
}
