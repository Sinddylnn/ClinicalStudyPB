package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

// <-------------------AVALIAÇÃO DE ELEGIBILIDADE------------------->
@Entity
@Table(name = "avaliacoes_elegibilidade")
public class AvaliacaoElegibilidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidato_id", nullable = false, unique = true)
    private Candidato candidato;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "avaliado_por_id", nullable = false)
    private Usuario avaliadoPor;

    @Column(name = "avaliado_em", nullable = false)
    private LocalDateTime avaliadoEm;

    protected AvaliacaoElegibilidade() {
    }

    public AvaliacaoElegibilidade(Candidato candidato, Usuario avaliadoPor) {
        this.candidato = candidato;
        this.avaliadoPor = avaliadoPor;
        this.avaliadoEm = LocalDateTime.now();
    }

    // Atualiza quem realizou a última avaliação.
    public void atualizarRegistro(Usuario avaliadoPor) {
        this.avaliadoPor = avaliadoPor;
        this.avaliadoEm = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Candidato getCandidato() {
        return candidato;
    }

    public Usuario getAvaliadoPor() {
        return avaliadoPor;
    }

    public LocalDateTime getAvaliadoEm() {
        return avaliadoEm;
    }
}
