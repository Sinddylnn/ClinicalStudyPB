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
 * <p>Cada usuário possui um perfil de acesso e pode ser ativado
 * ou desativado sem que seu registro seja excluído do banco.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 21/10/2026
 */
@Entity
@Table(name = "usuarios")
public class Usuario {

    // <-------------------Identificação------------------->

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // <-------------------Dados pessoais e de acesso------------------->

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

    // <-------------------Perfil e situação da conta------------------->

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
     *
     * @param nome nome do usuário
     * @param email endereço de e-mail usado para identificar o acesso
     * @param senhaHash hash da senha previamente calculado
     * @param perfil perfil de acesso atribuído ao usuário
     */
    public Usuario(String nome, String email, String senhaHash, PerfilUsuario perfil) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.perfil = perfil;
        this.ativo = true;
    }

    // <-------------------Alterações da conta------------------->

    /**
     * Atualiza os dados editáveis do usuário.
     *
     * @param nome nome atualizado do usuário
     * @param email endereço de e-mail atualizado
     * @param perfil perfil de acesso atualizado
     * @since 1.0
     */
    public void atualizar(String nome, String email, PerfilUsuario perfil) {
        this.nome = nome;
        this.email = email;
        this.perfil = perfil;
    }

    /**
     * Desativa a conta sem excluir seu registro do banco.
     *
     * @since 1.0
     */
    public void desativar() {
        this.ativo = false;
    }

    /**
     * Reativa uma conta anteriormente desativada.
     *
     * @since 1.0
     */
    public void reativar() {
        this.ativo = true;
    }

    // <-------------------Métodos de acesso------------------->

    /**
     * Consulta a identificação do usuário no banco.
     *
     * @return identificador gerado ao persistir o usuário, ou {@code null} antes disso
     * @since 1.0
     */
    public Long getId() {
        return id;
    }

    /**
     * Consulta o nome cadastrado para o usuário.
     *
     * @return nome do usuário
     * @since 1.0
     */
    public String getNome() {
        return nome;
    }

    /**
     * Consulta o e-mail associado ao acesso do usuário.
     *
     * @return endereço de e-mail cadastrado
     * @since 1.0
     */
    public String getEmail() {
        return email;
    }

    /**
     * Disponibiliza o hash armazenado para a verificação da senha.
     *
     * @return hash da senha, sem recuperar a senha em texto puro
     * @since 1.0
     */
    public String getSenhaHash() {
        return senhaHash;
    }

    /**
     * Consulta o perfil atribuído ao usuário.
     *
     * @return perfil utilizado nas regras de autorização
     * @since 1.0
     */
    public PerfilUsuario getPerfil() {
        return perfil;
    }

    /**
     * Consulta a situação da conta sem depender da exclusão do registro.
     *
     * @return {@code true} se a conta estiver ativa; {@code false} se estiver desativada
     * @since 1.0
     */
    public boolean isAtivo() {
        return ativo;
    }
}
