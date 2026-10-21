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
 * <p>Cada estudo possui um pesquisador responsável, período previsto,
 * limite de participantes e um estado que acompanha sua evolução
 * dentro do sistema.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 21/10/2026
 */
@Entity
@Table(name = "estudos")
public class Estudo {

    // <-------------------Identificação------------------->

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // <-------------------Informações principais do estudo------------------->

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(nullable = false, length = 2000)
    private String objetivo;

    // <-------------------Pesquisador responsável------------------->

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "responsavel_id", nullable = false)
    private Usuario responsavel;

    // <-------------------Período previsto------------------->

    @Column(name = "data_inicio", nullable = false)
    private LocalDate dataInicio;

    @Column(name = "data_fim", nullable = false)
    private LocalDate dataFim;

    // <-------------------Participantes e situação do estudo------------------->

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
     *
     * @param titulo título que identifica o estudo
     * @param objetivo descrição do objetivo do estudo
     * @param responsavel usuário pesquisador responsável pelo estudo
     * @param dataInicio data prevista de início
     * @param dataFim data prevista de término
     * @param limiteParticipantes quantidade máxima de participantes
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

    // <-------------------Métodos de acesso------------------->

    /**
     * Consulta a identificação do estudo no banco.
     *
     * @return identificador gerado ao persistir o estudo, ou {@code null} antes disso
     * @since 1.0
     */
    public Long getId() {
        return id;
    }

    /**
     * Consulta o título usado para identificar o estudo.
     *
     * @return título cadastrado
     * @since 1.0
     */
    public String getTitulo() {
        return titulo;
    }

    /**
     * Consulta a finalidade registrada para o estudo.
     *
     * @return descrição do objetivo
     * @since 1.0
     */
    public String getObjetivo() {
        return objetivo;
    }

    /**
     * Consulta o usuário vinculado como responsável pelo estudo.
     *
     * @return pesquisador responsável
     * @since 1.0
     */
    public Usuario getResponsavel() {
        return responsavel;
    }

    /**
     * Consulta o início previsto para o estudo.
     *
     * @return data prevista de início
     * @since 1.0
     */
    public LocalDate getDataInicio() {
        return dataInicio;
    }

    /**
     * Consulta o término previsto para o estudo.
     *
     * @return data prevista de término
     * @since 1.0
     */
    public LocalDate getDataFim() {
        return dataFim;
    }

    /**
     * Consulta a capacidade de participantes definida para o estudo.
     *
     * @return quantidade máxima de participantes
     * @since 1.0
     */
    public Integer getLimiteParticipantes() {
        return limiteParticipantes;
    }

    /**
     * Consulta a etapa atual do estudo.
     *
     * @return estado do estudo, inicialmente {@link EstadoEstudo#PLANEJAMENTO}
     * @since 1.0
     */
    public EstadoEstudo getEstado() {
        return estado;
    }
}
