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

    // <-------------------Coordenador vinculado ao estudo------------------->

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coordenador_id")
    private Usuario coordenador;

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

    @Column(name = "justificativa_encerramento", length = 500)
    private String justificativaEncerramento;

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

    public Usuario getCoordenador() {
        return coordenador;
    }

    /**
     * Atribui ou substitui o coordenador previamente validado pelo serviço.
     *
     * @param coordenador conta ativa com perfil de coordenador
     * @since 1.0
     */
    public void atribuirCoordenador(Usuario coordenador) {
        if (estado == EstadoEstudo.ENCERRADO) {
            throw new RegraNegocioException("ESTUDO_ENCERRADO",
                    "Não é permitido alterar o coordenador de um estudo encerrado.");
        }
        this.coordenador = java.util.Objects.requireNonNull(coordenador);
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

    // <-------------------MUDANÇA DE ESTADO E JUSTIFICATIVA------------------->

    /**
     * Registra a mudança após o serviço conferir protocolo, inclusões e permissões.
     *
     * <p>Valida o caminho e a justificativa antes de modificar qualquer campo.
     * Não oferece um setter genérico que permita voltar ou reabrir o estudo.</p>
     *
     * @param destino próximo estado
     * @param justificativa motivo do encerramento, obrigatório se antecipado
     * @throws RegraNegocioException quando a transição ou a justificativa é inválida
     * @since 1.0
     */
    public void alterarEstado(EstadoEstudo destino, String justificativa) {
        if (!estado.permiteTransicaoPara(destino)) {
            throw new RegraNegocioException("TRANSICAO_ESTADO_INVALIDA",
                    "Não é permitido mudar de " + estado + " para " + destino + ".");
        }
        String motivo = justificativa == null ? null : justificativa.strip();
        if (motivo != null && motivo.isEmpty()) {
            motivo = null;
        }
        if (motivo != null && motivo.length() > 500) {
            throw new RegraNegocioException("JUSTIFICATIVA_INVALIDA",
                    "A justificativa deve ter no máximo 500 caracteres.");
        }
        if (destino == EstadoEstudo.ENCERRADO && estado != EstadoEstudo.EXECUCAO && motivo == null) {
            throw new RegraNegocioException("JUSTIFICATIVA_OBRIGATORIA",
                    "Informe a justificativa para encerrar o estudo antes da execução.");
        }
        if (destino != EstadoEstudo.ENCERRADO && motivo != null) {
            throw new RegraNegocioException("JUSTIFICATIVA_INVALIDA",
                    "A justificativa de encerramento só deve ser informada ao encerrar o estudo.");
        }
        // Só altera os campos depois que todas as validações passaram
        this.estado = destino;
        this.justificativaEncerramento = motivo;
    }

    public String getJustificativaEncerramento() {
        return justificativaEncerramento;
    }
}
