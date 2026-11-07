package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.estudos.Estudo;
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
import java.util.Locale;

// <-------------------CANDIDATOS DOS ESTUDOS------------------->
/**
 * Representa um candidato vinculado a um estudo clínico.
 *
 * @author Luiz
 * @version 1.0
 * @since 04/11/2026
 */
@Entity
@Table(name = "candidatos")
public class Candidato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "estudo_id", nullable = false)
    private Estudo estudo;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(nullable = false, length = 254)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SituacaoElegibilidade elegibilidade;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SituacaoConsentimento consentimento;

    @jakarta.persistence.OneToOne(mappedBy = "candidato", fetch = FetchType.LAZY)
    private br.edu.uepb.clinicalstudypb.estudos.Participacao participacao;

    // <-------------------CONSTRUTORES------------------->

    protected Candidato() {
    }

    public Candidato(Estudo estudo, String nome, String email) {
        this.estudo = estudo;
        this.nome = nome.strip();
        this.email = email.strip().toLowerCase(Locale.ROOT);
        this.elegibilidade = SituacaoElegibilidade.NAO_AVALIADO;
        this.consentimento = SituacaoConsentimento.PENDENTE;
    }

    // <-------------------CONSULTA DOS DADOS------------------->

    public Long getId() {
        return id;
    }

    public Estudo getEstudo() {
        return estudo;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public SituacaoElegibilidade getElegibilidade() {
        return elegibilidade;
    }

    public SituacaoConsentimento getConsentimento() {
        return consentimento;
    }

    // Atualiza a situação após avaliar os critérios.
    public void atualizarElegibilidade(SituacaoElegibilidade situacao) {
        this.elegibilidade = java.util.Objects.requireNonNull(situacao);
    }

    // <-------------------CONSENTIMENTO E INCLUSÃO------------------->

    /** Atualiza o resumo do candidato junto do registro histórico de consentimento. */
    public void registrarConsentimento(RespostaConsentimento resposta) {
        this.consentimento = SituacaoConsentimento.valueOf(resposta.name());
    }

    /** Mantém os dois lados do vínculo na memória após uma inclusão validada. */
    public void registrarParticipacao(br.edu.uepb.clinicalstudypb.estudos.Participacao participacao) {
        this.participacao = participacao;
    }

    public br.edu.uepb.clinicalstudypb.estudos.Participacao getParticipacao() {
        return participacao;
    }
}
