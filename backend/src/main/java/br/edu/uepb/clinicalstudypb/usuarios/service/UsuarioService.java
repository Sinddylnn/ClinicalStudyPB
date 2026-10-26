package br.edu.uepb.clinicalstudypb.usuarios.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.api.UsuarioCadastroEntrada;
import br.edu.uepb.clinicalstudypb.usuarios.api.UsuarioEdicaoEntrada;
import br.edu.uepb.clinicalstudypb.usuarios.api.UsuarioResposta;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------GESTÃO DE USUÁRIOS------------------->
/**
 * Implementa as operações e regras de negócio da gestão de usuários.
 *
 * <p>Centraliza cadastro, listagem, edição, desativação e reativação,
 * mantendo as regras de e-mail único, vínculos de estudos e proteção do último administrador ativo.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final EstudoRepository estudos;

    /**
     * Recebe as dependências utilizadas na gestão de usuários.
     *
     * @param usuarios repositório utilizado para acessar as contas persistidas
     * @param passwordEncoder codificador utilizado para armazenar senhas com segurança
     * @param estudos consultas dos vínculos que precisam ser preservados na edição
     */
    public UsuarioService(
            UsuarioRepository usuarios,
            PasswordEncoder passwordEncoder,
            EstudoRepository estudos) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.estudos = estudos;
    }

    // <-------------------CADASTRO------------------->

    /**
     * Cadastra uma nova conta ativa no sistema.
     *
     * @param entrada dados informados para a criação do usuário
     * @return dados públicos da conta cadastrada
     * @throws ConflitoException quando o e-mail já pertence a outro usuário
     * @throws RegraNegocioException quando a senha ultrapassa o limite do BCrypt
     * @since 1.0
     */
    @Transactional
    public UsuarioResposta cadastrar(UsuarioCadastroEntrada entrada) {
        validarTamanhoSenha(entrada.senha());
        String email = normalizarEmail(entrada.email());

        validarEmailDisponivel(email, null);

        Usuario usuario = new Usuario(
                entrada.nome().trim(),
                email,
                passwordEncoder.encode(entrada.senha()),
                entrada.perfil()
        );

        Usuario usuarioSalvo = usuarios.save(usuario);

        return UsuarioResposta.de(usuarioSalvo);
    }

    // <-------------------LISTAGEM------------------->

    /**
     * Lista todas as contas cadastradas, incluindo as desativadas.
     *
     * @return usuários cadastrados no sistema
     * @since 1.0
     */
    @Transactional(readOnly = true)
    public List<UsuarioResposta> listar() {
        return usuarios.findAll()
                .stream()
                .map(UsuarioResposta::de)
                .toList();
    }

    // <-------------------EDIÇÃO------------------->

    /**
     * Atualiza os dados editáveis de um usuário existente.
     *
     * @param id identificador do usuário que será alterado
     * @param entrada novos dados da conta
     * @return dados atualizados do usuário
     * @throws ConflitoException quando o e-mail já pertence a outra conta
     * @throws RegraNegocioException quando a alteração retiraria o perfil
     *         do último administrador ativo ou tornaria vínculos incompatíveis
     * @since 1.0
     */
    @Transactional
    public UsuarioResposta editar(Long id, UsuarioEdicaoEntrada entrada) {
        bloquearAdministradoresAtivos();
        // O mesmo bloqueio é usado ao vincular contas aos estudos
        Usuario usuario = usuarios.bloquearPorIds(List.of(id)).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Usuário não encontrado."));
        String email = normalizarEmail(entrada.email());

        validarEmailDisponivel(email, id);
        validarAlteracaoDoUltimoAdministrador(usuario, entrada.perfil());
        validarPerfilComVinculos(usuario, entrada.perfil());

        usuario.atualizar(
                entrada.nome().trim(),
                email,
                entrada.perfil()
        );

        return UsuarioResposta.de(usuario);
    }

    // <-------------------DESATIVAÇÃO------------------->

    /**
     * Desativa uma conta sem remover seu registro do banco.
     *
     * @param id identificador do usuário que será desativado
     * @return dados da conta após a desativação
     * @throws RegraNegocioException quando a operação tentaria desativar
     *         o último administrador ativo
     * @since 1.0
     */
    @Transactional
    public UsuarioResposta desativar(Long id) {
        bloquearAdministradoresAtivos();
        Usuario usuario = buscarUsuario(id);

        validarDesativacaoDoUltimoAdministrador(usuario);

        usuario.desativar();

        return UsuarioResposta.de(usuario);
    }

    // <-------------------REATIVAÇÃO------------------->

    /**
     * Reativa uma conta anteriormente desativada.
     *
     * @param id identificador do usuário que será reativado
     * @return dados da conta após a reativação
     * @since 1.0
     */
    @Transactional
    public UsuarioResposta reativar(Long id) {
        Usuario usuario = buscarUsuario(id);

        usuario.reativar();

        return UsuarioResposta.de(usuario);
    }

    // <-------------------REGRAS AUXILIARES------------------->

    /**
     * Impede alterar o perfil quando os estudos ainda dependem dele.
     *
     * @param usuario conta que está sendo editada
     * @param novoPerfil perfil solicitado pelo administrador
     * @throws RegraNegocioException quando existem vínculos incompatíveis
     * @since 1.0
     */
    private void validarPerfilComVinculos(Usuario usuario, PerfilUsuario novoPerfil) {
        if (usuario.getPerfil() == novoPerfil) {
            return;
        }
        boolean responsavelIncompativel = novoPerfil != PerfilUsuario.PESQUISADOR
                && estudos.existsByResponsavelId(usuario.getId());
        boolean coordenadorIncompativel = novoPerfil != PerfilUsuario.COORDENADOR
                && estudos.existsByCoordenadorId(usuario.getId());
        if (responsavelIncompativel || coordenadorIncompativel) {
            throw new RegraNegocioException("PERFIL_COM_VINCULOS",
                    "Não é possível alterar o perfil enquanto houver vínculos incompatíveis com estudos.");
        }
    }

    /**
     * Recusa senhas que o BCrypt não consegue codificar integralmente.
     *
     * @param senha senha recebida e já verificada como não vazia pelo controller
     * @throws RegraNegocioException quando a senha ultrapassa 72 bytes em UTF-8
     * @since 1.0
     */
    private void validarTamanhoSenha(String senha) {
        // Acentos podem ocupar mais de um byte, por isso não basta contar caracteres
        if (senha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new RegraNegocioException(
                    "SENHA_MUITO_LONGA",
                    "A senha deve ter no máximo 72 bytes em UTF-8."
            );
        }
    }

    /**
     * Serializa alterações que poderiam deixar o sistema sem administradores ativos.
     *
     * <p>O bloqueio pertence à transação e acontece antes de carregar a conta-alvo.
     * Assim, duas remoções simultâneas não decidem com a mesma contagem antiga.</p>
     *
     * @since 1.0
     */
    private void bloquearAdministradoresAtivos() {
        usuarios.bloquearAtivosPorPerfil(PerfilUsuario.ADMINISTRADOR);
    }

    /**
     * Localiza um usuário pelo identificador.
     *
     * @param id identificador procurado
     * @return usuário encontrado
     * @throws ResponseStatusException quando o usuário não existe
     * @since 1.0
     */
    private Usuario buscarUsuario(Long id) {
        return usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Usuário não encontrado."
                ));
    }

    /**
     * Impede que duas contas utilizem o mesmo e-mail.
     *
     * @param email e-mail normalizado que será utilizado
     * @param idUsuarioAtual identificador da conta em edição ou {@code null} no cadastro
     * @throws ConflitoException quando o e-mail pertence a outra conta
     * @since 1.0
     */
    private void validarEmailDisponivel(String email, Long idUsuarioAtual) {
        usuarios.buscarPorEmail(email).ifPresent(usuarioEncontrado -> {
            boolean pertenceAoUsuarioAtual =
                    idUsuarioAtual != null
                            && usuarioEncontrado.getId().equals(idUsuarioAtual);

            if (!pertenceAoUsuarioAtual) {
                throw new ConflitoException(
                        "EMAIL_JA_CADASTRADO",
                        "Já existe um usuário cadastrado com este e-mail."
                );
            }
        });
    }

    /**
     * Impede que o último administrador ativo perca esse perfil.
     *
     * @param usuario usuário que está sendo editado
     * @param novoPerfil perfil solicitado na edição
     * @throws RegraNegocioException quando a alteração deixaria o sistema
     *         sem administradores ativos
     * @since 1.0
     */
    private void validarAlteracaoDoUltimoAdministrador(
            Usuario usuario,
            PerfilUsuario novoPerfil) {

        boolean removendoPerfilAdministrador =
                usuario.isAtivo()
                        && usuario.getPerfil() == PerfilUsuario.ADMINISTRADOR
                        && novoPerfil != PerfilUsuario.ADMINISTRADOR;

        if (removendoPerfilAdministrador
                && quantidadeAdministradoresAtivos() <= 1) {
            throw new RegraNegocioException(
                    "ULTIMO_ADMINISTRADOR",
                    "O perfil do último administrador ativo não pode ser alterado."
            );
        }
    }

    /**
     * Impede a desativação do último administrador ativo.
     *
     * @param usuario usuário que será desativado
     * @throws RegraNegocioException quando a operação deixaria o sistema
     *         sem administradores ativos
     * @since 1.0
     */
    private void validarDesativacaoDoUltimoAdministrador(Usuario usuario) {
        boolean administradorAtivo =
                usuario.isAtivo()
                        && usuario.getPerfil() == PerfilUsuario.ADMINISTRADOR;

        if (administradorAtivo && quantidadeAdministradoresAtivos() <= 1) {
            throw new RegraNegocioException(
                    "ULTIMO_ADMINISTRADOR",
                    "O último administrador ativo não pode ser desativado."
            );
        }
    }

    /**
     * Consulta a quantidade atual de administradores ativos.
     *
     * @return número de contas ativas com perfil de administrador
     * @since 1.0
     */
    private long quantidadeAdministradoresAtivos() {
        return usuarios.countByPerfilAndAtivoTrue(
                PerfilUsuario.ADMINISTRADOR
        );
    }

    /**
     * Padroniza o e-mail antes das consultas e da persistência.
     *
     * @param email e-mail recebido pela API
     * @return e-mail sem espaços externos e convertido para letras minúsculas
     * @since 1.0
     */
    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
