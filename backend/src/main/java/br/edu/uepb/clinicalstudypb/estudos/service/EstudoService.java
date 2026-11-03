package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import br.edu.uepb.clinicalstudypb.estudos.api.AlteracaoEstadoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.EstudoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.CoordenadorResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.CriterioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
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
    private final ProtocoloRepository protocolos;
    private final CriterioRepository criterios;
    private final VisitaPrevistaRepository visitas;
    private final ParticipacaoRepository participacoes;

    /**
     * Recebe os repositórios utilizados na gestão dos estudos.
     *
     * @param estudos repositório utilizado para acessar os estudos
     * @param usuarios repositório utilizado para localizar o pesquisador responsável
     * @param protocolos configuração persistida de cada estudo
     * @param criterios critérios de inclusão e exclusão do protocolo
     * @param visitas modelos de visita e suas pendências de configuração
     * @param participacoes inclusões históricas do estudo
     */
    public EstudoService(
            EstudoRepository estudos,
            UsuarioRepository usuarios,
            ProtocoloRepository protocolos,
            CriterioRepository criterios,
            VisitaPrevistaRepository visitas,
            ParticipacaoRepository participacoes) {
        this.estudos = estudos;
        this.usuarios = usuarios;
        this.protocolos = protocolos;
        this.criterios = criterios;
        this.visitas = visitas;
        this.participacoes = participacoes;
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
     * @throws RegraNegocioException quando o estudo está encerrado ou o coordenador é inválido
     * @throws AccessDeniedException quando o responsável não é pesquisador ativo
     * @since 1.0
     */
    @Transactional
    public EstudoResposta atribuirCoordenador(Long estudoId, Long coordenadorId,
            UsuarioAutenticado usuarioAutenticado) {
        // Bloqueia primeiro as contas e depois o estudo, sempre na mesma ordem
        List<Usuario> contas = bloquearContas(usuarioAutenticado, coordenadorId);
        validarPesquisador(localizarConta(contas, usuarioAutenticado.getId()));
        Estudo estudo = bloquearEstudoProprio(estudoId, usuarioAutenticado);
        estudo.atribuirCoordenador(validarCoordenador(contas, coordenadorId));
        return EstudoResposta.de(estudo);
    }

    // <-------------------MUDANÇAS DE ESTADO DO ESTUDO------------------->

    /**
     * Confere as condições atuais e grava a transição dentro da mesma transação.
     *
     * <p>Os serviços futuros de configuração e inclusão devem bloquear este mesmo
     * estudo antes de validar seu estado e gravar. A participação é histórica:
     * uma retirada não deverá removê-la da contagem.</p>
     *
     * @param estudoId identificador do estudo próprio
     * @param entrada estado solicitado e justificativa de encerramento
     * @param usuarioAutenticado pesquisador responsável conectado
     * @return estudo com estado e justificativa atualizados
     * @throws AccessDeniedException quando a conta não é pesquisador ativo
     * @throws ResponseStatusException quando o estudo não existe ou pertence a outro pesquisador
     * @throws RegraNegocioException quando a transição ou alguma condição não é atendida
     * @since 1.0
     */
    @Transactional
    public EstudoResposta alterarEstado(Long estudoId, AlteracaoEstadoEntrada entrada,
            UsuarioAutenticado usuarioAutenticado) {
        // Mantém o perfil do responsável e o estado do estudo estáveis até terminar a operação
        List<Usuario> contas = bloquearContas(usuarioAutenticado, null);
        validarPesquisador(localizarConta(contas, usuarioAutenticado.getId()));
        Estudo estudo = bloquearEstudoProprio(estudoId, usuarioAutenticado);
        EstadoEstudo destino = entrada.estado();
        if (!estudo.getEstado().permiteTransicaoPara(destino)) {
            throw new RegraNegocioException("TRANSICAO_ESTADO_INVALIDA",
                    "Não é permitido mudar de " + estudo.getEstado() + " para " + destino + ".");
        }

        // O caminho pode ser permitido, mas ainda precisa atender às condições no banco
        switch (destino) {
            case RECRUTAMENTO -> validarAberturaRecrutamento(estudo);
            case EXECUCAO -> {
                if (!participacoes.existsByEstudoId(estudoId)) {
                    throw new RegraNegocioException("ESTUDO_SEM_PARTICIPANTES",
                            "Inclua pelo menos um participante antes de iniciar a execução.");
                }
            }
            case ENCERRADO -> validarEncerramento(estudo);
            default -> throw new RegraNegocioException("TRANSICAO_ESTADO_INVALIDA",
                    "Não é permitido retornar ao planejamento.");
        }

        estudo.alterarEstado(destino, entrada.justificativaEncerramento());
        // O JPA salva a entidade ao concluir a transação, sem precisar chamar save novamente
        return EstudoResposta.de(estudo);
    }

    /**
     * Localiza e bloqueia somente o estudo do responsável autenticado.
     *
     * @param estudoId identificador solicitado
     * @param autenticado pesquisador conectado
     * @return entidade gerenciada com bloqueio até o fim da transação
     * @throws ResponseStatusException quando não há estudo próprio correspondente
     */
    private Estudo bloquearEstudoProprio(Long estudoId, UsuarioAutenticado autenticado) {
        return estudos.bloquearPorIdEResponsavelId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudo não encontrado."));
    }

    /**
     * Verifica o protocolo completo, incluindo atividade em todas as visitas previstas.
     *
     * @param estudo estudo já bloqueado na transação
     * @throws RegraNegocioException quando faltar coordenador ou configuração válida
     */
    private void validarAberturaRecrutamento(Estudo estudo) {
        if (estudo.getCoordenador() == null) {
            throw new RegraNegocioException("COORDENADOR_OBRIGATORIO",
                    "Atribua um coordenador ao estudo antes de iniciar o recrutamento.");
        }
        Protocolo protocolo = protocolos.findByEstudoId(estudo.getId())
                .orElseThrow(() -> new RegraNegocioException("PROTOCOLO_INCOMPLETO",
                        "Cadastre o protocolo antes de iniciar o recrutamento."));
        if (!criterios.existsByProtocoloIdAndTipo(protocolo.getId(), TipoCriterio.INCLUSAO)) {
            throw new RegraNegocioException("PROTOCOLO_INCOMPLETO",
                    "Cadastre pelo menos um critério de inclusão para iniciar o recrutamento.");
        }
        // Uma lista vazia só vale como ausência de exclusões quando isso foi confirmado
        boolean possuiExclusao = criterios.existsByProtocoloIdAndTipo(protocolo.getId(), TipoCriterio.EXCLUSAO);
        if (possuiExclusao && protocolo.isSemCriteriosExclusao()) {
            throw new RegraNegocioException("CRITERIOS_EXCLUSAO_INCONSISTENTES",
                    "Há critérios de exclusão cadastrados e a opção de ausência de exclusões está marcada.");
        }
        if (!possuiExclusao && !protocolo.isSemCriteriosExclusao()) {
            throw new RegraNegocioException("PROTOCOLO_INCOMPLETO",
                    "Cadastre os critérios de exclusão ou confirme que não existem exclusões.");
        }
        if (!visitas.existsByProtocoloId(protocolo.getId())) {
            throw new RegraNegocioException("PROTOCOLO_INCOMPLETO",
                    "Cadastre pelo menos uma visita prevista para iniciar o recrutamento.");
        }
        // Todas as visitas precisam de atividade, não apenas a primeira
        List<String> incompletas = visitas.buscarNomesSemAtividades(protocolo.getId());
        if (!incompletas.isEmpty()) {
            throw new RegraNegocioException("PROTOCOLO_INCOMPLETO",
                    "Cadastre pelo menos uma atividade na visita: " + incompletas.getFirst() + ".");
        }
    }

    /**
     * Impede o encerramento antecipado de estudos que já tiveram inclusões.
     *
     * <p>Na Release 1 ainda não há visitas agendadas nem solicitações. Ao introduzir
     * esses módulos na Release 2, verificar suas pendências reais neste método para
     * EXECUCAO -> ENCERRADO, dentro do mesmo bloqueio. Visitas previstas não são pendências.</p>
     *
     * @param estudo estudo já bloqueado na transação
     * @throws RegraNegocioException quando houver inclusão antes do encerramento antecipado
     */
    private void validarEncerramento(Estudo estudo) {
        // Considera todo o histórico de inclusões, mesmo se houver retirada depois
        if (estudo.getEstado() != EstadoEstudo.EXECUCAO && participacoes.existsByEstudoId(estudo.getId())) {
            throw new RegraNegocioException("ESTUDO_COM_PARTICIPANTES",
                    "O estudo já possui inclusões e não pode ser encerrado antes da execução.");
        }
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
            throw new AccessDeniedException("Somente pesquisadores podem alterar seus estudos.");
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
