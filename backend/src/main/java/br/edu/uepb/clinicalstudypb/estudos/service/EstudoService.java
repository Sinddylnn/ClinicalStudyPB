package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.CoordenadorResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import java.util.List;
import java.util.ArrayList;
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
 * consultam somente os estudos aos quais estão vinculados.</p>
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
     * @throws RegraNegocioException quando o período ou o coordenador é inválido
     * @throws ResponseStatusException quando uma conta informada não é encontrada
     * @throws AccessDeniedException quando a conta responsável não é pesquisador ativo
     * @since 1.0
     */
    @Transactional
    public EstudoResposta cadastrar(
            EstudoCadastroEntrada entrada,
            UsuarioAutenticado usuarioAutenticado) {

        validarDatas(entrada);

        List<Usuario> contas = bloquearContas(usuarioAutenticado, entrada.coordenadorId());
        Usuario responsavel = localizarConta(contas, usuarioAutenticado.getId());
        validarPesquisador(responsavel);

        Estudo estudo = new Estudo(
                entrada.titulo().trim(),
                entrada.objetivo().trim(),
                responsavel,
                entrada.dataInicio(),
                entrada.dataFim(),
                entrada.limiteParticipantes()
        );

        if (entrada.coordenadorId() != null) {
            estudo.atribuirCoordenador(validarCoordenador(contas, entrada.coordenadorId()));
        }

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
                    estudos.findByResponsavelIdOrderByIdDesc(usuarioAutenticado.getId());
        } else if (usuarioAutenticado.getPerfil() == PerfilUsuario.COORDENADOR) {
            estudosPermitidos = estudos.findByCoordenadorIdOrderByIdDesc(usuarioAutenticado.getId());
        } else {
            throw new AccessDeniedException(
                    "Seu perfil não permite consultar estudos."
            );
        }

        return estudosPermitidos.stream()
                .map(EstudoResposta::de)
                .toList();
    }

    // <-------------------ESCOLHA E ATRIBUIÇÃO DO COORDENADOR------------------->

    /**
     * Lista opções de coordenadores ativos sem expor a gestão administrativa de contas.
     *
     * @return identificadores e nomes disponíveis para a seleção pelo pesquisador
     * @since 1.0
     */
    @Transactional(readOnly = true)
    public List<CoordenadorResposta> listarCoordenadores() {
        return usuarios.findByPerfilAndAtivoTrueOrderByNomeAscIdAsc(PerfilUsuario.COORDENADOR)
                .stream().map(u -> new CoordenadorResposta(u.getId(), u.getNome())).toList();
    }

    /**
     * Atribui ou substitui o coordenador de um estudo do pesquisador autenticado.
     *
     * @param estudoId identificador do estudo próprio
     * @param coordenadorId identificador do novo coordenador ativo
     * @param usuarioAutenticado identidade do pesquisador conectado
     * @return estudo com o vínculo atualizado
     * @throws ResponseStatusException quando o estudo é inexistente, alheio ou a conta não existe
     * @throws RegraNegocioException quando a conta escolhida não é coordenador ativo
     * @throws AccessDeniedException quando o responsável não é pesquisador ativo
     * @since 1.0
     */
    @Transactional
    public EstudoResposta atribuirCoordenador(Long estudoId, Long coordenadorId,
            UsuarioAutenticado usuarioAutenticado) {
        Estudo estudo = estudos.findByIdAndResponsavelId(estudoId, usuarioAutenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."));
        List<Usuario> contas = bloquearContas(usuarioAutenticado, coordenadorId);
        validarPesquisador(localizarConta(contas, usuarioAutenticado.getId()));
        estudo.atribuirCoordenador(validarCoordenador(contas, coordenadorId));
        return EstudoResposta.de(estudo);
    }

    // <-------------------REGRAS AUXILIARES------------------->

    /**
     * Coordena a criação de vínculos com a edição concorrente dos perfis das contas.
     *
     * @param autenticado pesquisador que executa a operação
     * @param coordenadorId coordenador opcional
     * @return contas bloqueadas na transação atual
     * @throws AccessDeniedException quando o perfil autenticado não é pesquisador
     * @since 1.0
     */
    private List<Usuario> bloquearContas(UsuarioAutenticado autenticado, Long coordenadorId) {
        if (autenticado.getPerfil() != PerfilUsuario.PESQUISADOR) {
            throw new AccessDeniedException("Somente pesquisadores atribuem responsáveis e coordenadores.");
        }
        List<Long> ids = new ArrayList<>();
        ids.add(autenticado.getId());
        if (coordenadorId != null) {
            ids.add(coordenadorId);
        }
        return usuarios.bloquearPorIds(ids);
    }

    /**
     * Localiza uma das contas lidas dentro da transação protegida.
     *
     * @param contas contas encontradas
     * @param id identificador procurado
     * @return conta correspondente
     * @throws ResponseStatusException quando a conta não existe
     * @since 1.0
     */
    private Usuario localizarConta(List<Usuario> contas, Long id) {
        return contas.stream().filter(u -> u.getId().equals(id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Conta não encontrada."));
    }

    /**
     * Reconfere o pesquisador após obter o bloqueio da conta.
     *
     * @param usuario conta responsável pelo estudo
     * @throws AccessDeniedException quando a conta deixou de ser pesquisador ativo
     * @since 1.0
     */
    private void validarPesquisador(Usuario usuario) {
        if (!usuario.isAtivo() || usuario.getPerfil() != PerfilUsuario.PESQUISADOR) {
            throw new AccessDeniedException("A conta responsável deve ser um pesquisador ativo.");
        }
    }

    /**
     * Confere a existência, o perfil e a situação da conta escolhida.
     *
     * @param contas contas encontradas na transação
     * @param id identificador do coordenador
     * @return coordenador apto a receber o vínculo
     * @throws ResponseStatusException quando a conta não existe
     * @throws RegraNegocioException quando a conta não é coordenador ativo
     * @since 1.0
     */
    private Usuario validarCoordenador(List<Usuario> contas, Long id) {
        Usuario coordenador = localizarConta(contas, id);
        if (!coordenador.isAtivo() || coordenador.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new RegraNegocioException("COORDENADOR_INVALIDO",
                    "Escolha uma conta ativa com perfil de coordenador.");
        }
        return coordenador;
    }

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
