package br.edu.uepb.clinicalstudypb.usuarios;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Representa um usuário cadastrado no ClinicalStudyPB.
 *
 * Cada usuário possui um perfil de acesso e pode ser ativado
 * ou desativado sem que seu registro seja excluído do banco.
 */
@Entity
@Table(name = "usuarios")
public class Usuario {

    // Identificação

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Dados pessoais e de acesso

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    /**
     * Armazena somente o hash da senha.
     * A senha em texto puro não deve ser persistida.
     */
    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    // Perfil e situação da conta

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PerfilUsuario perfil;

    @Column(nullable = false)
    private boolean ativo = true;

    /**
     * Construtor protegido exigido pelo JPA.
     */
    protected Usuario() {
    }

    /**
     * Cria um novo usuário ativo.
     */
    public Usuario(String nome, String email, String senhaHash, PerfilUsuario perfil) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.perfil = perfil;
        this.ativo = true;
    }

    // Métodos de acesso

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public PerfilUsuario getPerfil() {
        return perfil;
    }

    public boolean isAtivo() {
        return ativo;
    }
}