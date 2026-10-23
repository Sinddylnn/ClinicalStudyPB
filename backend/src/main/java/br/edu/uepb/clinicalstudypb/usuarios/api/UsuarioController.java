package br.edu.uepb.clinicalstudypb.usuarios.api;

import br.edu.uepb.clinicalstudypb.usuarios.service.UsuarioService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// <-------------------GESTÃO DE USUÁRIOS------------------->
/**
 * Expõe as operações administrativas de gestão de usuários.
 *
 * <p>As permissões de acesso às rotas são aplicadas pela configuração
 * de segurança da aplicação.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 23/10/2026
 */
@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService usuarios;

    /**
     * Recebe o serviço responsável pelas regras de gestão de usuários.
     *
     * @param usuarios serviço de gestão das contas
     */
    public UsuarioController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    // <-------------------CADASTRO------------------->

    /**
     * Cadastra uma nova conta de usuário.
     *
     * @param entrada dados da conta que será criada
     * @return dados públicos do usuário cadastrado
     * @since 1.0
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioResposta cadastrar(
            @Valid @RequestBody UsuarioCadastroEntrada entrada) {
        return usuarios.cadastrar(entrada);
    }

    // <-------------------LISTAGEM------------------->

    /**
     * Lista todas as contas cadastradas.
     *
     * @return usuários ativos e desativados
     * @since 1.0
     */
    @GetMapping
    public List<UsuarioResposta> listar() {
        return usuarios.listar();
    }

    // <-------------------EDIÇÃO------------------->

    /**
     * Atualiza os dados editáveis de uma conta.
     *
     * @param id identificador do usuário
     * @param entrada novos dados da conta
     * @return dados atualizados do usuário
     * @since 1.0
     */
    @PutMapping("/{id}")
    public UsuarioResposta editar(
            @PathVariable Long id,
            @Valid @RequestBody UsuarioEdicaoEntrada entrada) {
        return usuarios.editar(id, entrada);
    }

    // <-------------------DESATIVAÇÃO------------------->

    /**
     * Desativa uma conta sem excluir seu registro.
     *
     * @param id identificador do usuário
     * @return dados da conta após a desativação
     * @since 1.0
     */
    @PatchMapping("/{id}/desativar")
    public UsuarioResposta desativar(@PathVariable Long id) {
        return usuarios.desativar(id);
    }

    // <-------------------REATIVAÇÃO------------------->

    /**
     * Reativa uma conta anteriormente desativada.
     *
     * @param id identificador do usuário
     * @return dados da conta após a reativação
     * @since 1.0
     */
    @PatchMapping("/{id}/reativar")
    public UsuarioResposta reativar(@PathVariable Long id) {
        return usuarios.reativar(id);
    }
}