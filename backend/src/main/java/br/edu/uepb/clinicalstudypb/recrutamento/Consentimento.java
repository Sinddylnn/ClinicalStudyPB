package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import jakarta.persistence.*;
import java.time.Instant;

// <-------------------HISTÓRICO DO CONSENTIMENTO SIMULADO------------------->
/**
 * Preserva cada resposta do candidato com o coordenador e o instante do registro.
 * Uma correção cria outro registro, mantendo o anterior para consulta.
 *
 * @author Georis
 */
@Entity
@Table(name = "consentimentos")
public class Consentimento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidato_id", nullable = false)
    private Candidato candidato;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RespostaConsentimento resposta;

    @Column(length = 500)
    private String observacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "registrado_por_id", nullable = false)
    private Usuario registradoPor;

    @Column(name = "registrado_em", nullable = false)
    private Instant registradoEm;

    /** Construtor utilizado pelo JPA. */
    protected Consentimento() { }

    /** Registra dados validados pelo serviço, sem permitir edição do histórico. */
    public Consentimento(Candidato candidato, RespostaConsentimento resposta, String observacao,
            Usuario registradoPor, Instant registradoEm) {
        this.candidato = candidato;
        this.resposta = resposta;
        this.observacao = observacao;
        this.registradoPor = registradoPor;
        this.registradoEm = registradoEm;
    }

    // <-------------------CONSULTA DOS DADOS------------------->
    public Long getId() { return id; }
    public Candidato getCandidato() { return candidato; }
    public RespostaConsentimento getResposta() { return resposta; }
    public String getObservacao() { return observacao; }
    public Usuario getRegistradoPor() { return registradoPor; }
    public Instant getRegistradoEm() { return registradoEm; }
}
