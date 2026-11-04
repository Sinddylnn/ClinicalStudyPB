package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.estudos.Criterio;
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

// <-------------------RESPOSTA DE ELEGIBILIDADE------------------->
@Entity
@Table(name = "respostas_elegibilidade")
public class RespostaElegibilidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "avaliacao_id", nullable = false)
    private AvaliacaoElegibilidade avaliacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criterio_id", nullable = false)
    private Criterio criterio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private RespostaCriterio resposta;

    protected RespostaElegibilidade() {
    }

    public RespostaElegibilidade(
            AvaliacaoElegibilidade avaliacao,
            Criterio criterio,
            RespostaCriterio resposta) {

        this.avaliacao = avaliacao;
        this.criterio = criterio;
        this.resposta = resposta;
    }

    public void atualizarResposta(RespostaCriterio resposta) {
        this.resposta = resposta;
    }

    public Long getId() {
        return id;
    }

    public AvaliacaoElegibilidade getAvaliacao() {
        return avaliacao;
    }

    public Criterio getCriterio() {
        return criterio;
    }

    public RespostaCriterio getResposta() {
        return resposta;
    }
}
