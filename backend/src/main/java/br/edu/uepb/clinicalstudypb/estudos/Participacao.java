package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

// <-------------------PARTICIPACAO: BASE DE PERSISTÊNCIA------------------->
/**
 * Preserva a inclusão histórica de uma conta de participante em um estudo.
 *
 * <p>Base para RF11: a criação pela aplicação deverá validar elegibilidade, consentimento,
 * conta ativa, vagas e estado. Não há endpoint de inclusão nesta entrega. Uma retirada
 * futura preservará este registro para a contagem histórica.</p>
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
@Entity
@Table(name = "participacoes")
public class Participacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estudo_id", nullable = false)
    private Estudo estudo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participante_id", nullable = false)
    private Usuario participante;

    // Registros anteriores à V9 podem não ter candidato associado
    @jakarta.persistence.OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidato_id", unique = true)
    private Candidato candidato;

    @Column(name = "data_inclusao", nullable = false)
    private Instant dataInclusao;

    /** Construtor protegido utilizado pelo JPA. */
    protected Participacao() {
    }

    /**
     * Mantém a construção de registros legados, anteriores ao vínculo com candidato.
     * Novas inclusões do RF11 devem usar o construtor que recebe Candidato.
     *
     * @param estudo estudo da inclusão
     * @param participante conta de participante vinculada
     * @param dataInclusao instante da inclusão
     */
    public Participacao(Estudo estudo, Usuario participante, Instant dataInclusao) {
        this.estudo = estudo;
        this.participante = participante;
        this.dataInclusao = dataInclusao;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Estudo getEstudo() {
        return estudo;
    }

    public Usuario getParticipante() {
        return participante;
    }

    public Instant getDataInclusao() {
        return dataInclusao;
    }

    // <-------------------VÍNCULO COM O RECRUTAMENTO------------------->

    /**
     * Vincula a inclusão ao candidato cuja avaliação deve ser preservada.
     * O serviço do RF11 precisa validar consentimento, elegibilidade, conta e vagas.
     *
     * @param candidato candidato incluído, já validado pelo serviço
     * @param participante conta associada à inclusão
     * @param dataInclusao instante do registro
     */
    public Participacao(Candidato candidato, Usuario participante, Instant dataInclusao) {
        this(java.util.Objects.requireNonNull(candidato).getEstudo(), participante, dataInclusao);
        this.candidato = candidato;
    }

    public Candidato getCandidato() {
        return candidato;
    }
}
