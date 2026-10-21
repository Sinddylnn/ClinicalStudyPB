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

import java.time.LocalDate;

/**
 * Representa um estudo clínico cadastrado no ClinicalStudyPB.
 *
 * Cada estudo possui um pesquisador responsável, período previsto,
 * limite de participantes e um estado que acompanha sua evolução
 * dentro do sistema.
 */
@Entity
@Table(name = "estudos")
public class Estudo {

    // Identificação

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Informações principais do estudo

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 2000)
    private String objetivo;

    // Pesquisador responsável

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsavel_id", nullable = false)
    private Usuario responsavel;

    // Período previsto

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    // Participantes e situação do estudo

    @Column(name = "limite_participantes", nullable = false)
    private Integer limiteParticipantes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoEstudo estado = EstadoEstudo.PLANEJAMENTO;

    /**
     * Construtor protegido exigido pelo JPA.
     */
    protected Estudo() {
    }

    /**
     * Cria um novo estudo no estado inicial de planejamento.
     */
    public Estudo(
            String titulo,
            String objetivo,
            Usuario responsavel,
            LocalDate dataInicio,
            LocalDate dataFim,
            Integer limiteParticipantes) {

        this.titulo = titulo;
        this.objetivo = objetivo;
        this.responsavel = responsavel;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
        this.limiteParticipantes = limiteParticipantes;
        this.estado = EstadoEstudo.PLANEJAMENTO;
    }

    // Métodos de acesso

    public Long getId() {
        return id;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getObjetivo() {
        return objetivo;
    }

    public Usuario getResponsavel() {
        return responsavel;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public LocalDate getDataFim() {
        return dataFim;
    }

    public Integer getLimiteParticipantes() {
        return limiteParticipantes;
    }

    public EstadoEstudo getEstado() {
        return estado;
    }
}