package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

// <-------------------GESTÃO DE ESTUDOS------------------->
/**
 * Implementa as operações e regras de negócio do cadastro de estudos.
 *
 * <p>O pesquisador autenticado é definido como responsável pelo estudo.
 * Pesquisadores consultam apenas seus próprios estudos, enquanto coordenadores
 * podem consultar todos os estudos cadastrados.</p>
 *
 * @author Luiz
 * @version 1.0
 * @since 25/10/2026
 */
@Service
public class EstudoService {

    private final EstudoRepository estudos;
    private final UsuarioRepository usuarios;

    /**
     * Recebe os repositórios utilizados na gestão dos estudos.
     *
     * @param estudos repositório utilizado para acessar os estudos
     * @param usuarios repositório utilizado para localizar o pesquisador responsável
     */
    public EstudoService(
            EstudoRepository estudos,
            UsuarioRepository usuarios) {
        this.estudos = estudos;
        this.usuarios = usuarios;
    }

    // <-------------------CADASTRO------------------->

    /**
     * Cadastra um estudo vinculado ao pesquisador autenticado.
     *
     * @param entrada dados informados no cadastro
     * @param usuarioAutenticado identidade do pesquisador conectado
     * @return dados do estudo cadastrado
     * @throws RegraNegocioException quando a data final é anterior à data inicial
     * @throws ResponseStatusException quando a conta autenticada não é encontrada
     * @since 1.0
     */
    @Transactional
    public EstudoResposta cadastrar(
            EstudoCadastroEntrada entrada,
            UsuarioAutenticado usuarioAutenticado) {

        validarDatas(entrada);

        Usuario responsavel = usuarios.findById(usuarioAutenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Usuário responsável não encontrado."
                ));

        Estudo estudo = new Estudo(
                entrada.titulo().trim(),
                entrada.objetivo().trim(),
                responsavel,
                entrada.dataInicio(),
                entrada.dataFim(),
                entrada.limiteParticipantes()
        );

        return EstudoResposta.de(estudos.save(estudo));
    }

    // <-------------------LISTAGEM------------------->

    /**
     * Lista os estudos permitidos para o perfil autenticado.
     *
     * @param usuarioAutenticado identidade do usuário conectado
     * @return estudos disponíveis para o perfil
     * @throws AccessDeniedException quando o perfil não pode consultar estudos
     * @since 1.0
     */
    @Transactional(readOnly = true)
    public List<EstudoResposta> listar(UsuarioAutenticado usuarioAutenticado) {

        List<Estudo> estudosPermitidos;

        if (usuarioAutenticado.getPerfil() == PerfilUsuario.PESQUISADOR) {
            estudosPermitidos =
                    estudos.findByResponsavelId(usuarioAutenticado.getId());
        } else if (usuarioAutenticado.getPerfil() == PerfilUsuario.COORDENADOR) {
            estudosPermitidos = estudos.findAll();
        } else {
            throw new AccessDeniedException(
                    "Seu perfil não permite consultar estudos."
            );
        }

        return estudosPermitidos.stream()
                .map(EstudoResposta::de)
                .toList();
    }

    // <-------------------REGRAS AUXILIARES------------------->

    /**
     * Garante que o término previsto não seja anterior ao início do estudo.
     *
     * @param entrada dados do cadastro que contêm o período previsto
     * @throws RegraNegocioException quando a data final é anterior à inicial
     * @since 1.0
     */
    private void validarDatas(EstudoCadastroEntrada entrada) {
        if (entrada.dataFim().isBefore(entrada.dataInicio())) {
            throw new RegraNegocioException(
                    "DATA_INVALIDA",
                    "A data final deve ser igual ou posterior à inicial."
            );
        }
    }
}