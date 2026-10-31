package br.edu.uepb.clinicalstudypb.estudos;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

// <-------------------PROTOCOLO: BASE DE PERSISTÊNCIA------------------->
/**
 * Reúne a configuração de critérios e visitas de um único estudo.
 *
 * <p>Os cadastros serão implementados nos serviços próprios. Eles deverão bloquear o
 * estudo e conferir PLANEJAMENTO antes de alterar o protocolo ou seus itens.</p>
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
@Entity
@Table(name = "protocolos")
public class Protocolo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estudo_id", nullable = false, unique = true)
    private Estudo estudo;

    @Column(name = "sem_criterios_exclusao", nullable = false)
    private boolean semCriteriosExclusao;

    /** Construtor protegido utilizado pelo JPA. */
    protected Protocolo() {
    }

    /**
     * Cria o registro a partir de dados validados pelo serviço responsável.
     *
     * @param estudo estudo ao qual o protocolo pertence
     * @param semCriteriosExclusao declaração explícita de ausência de exclusões
     */
    public Protocolo(Estudo estudo, boolean semCriteriosExclusao) {
        this.estudo = estudo;
        this.semCriteriosExclusao = semCriteriosExclusao;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Estudo getEstudo() {
        return estudo;
    }

    public boolean isSemCriteriosExclusao() {
        return semCriteriosExclusao;
    }
}
