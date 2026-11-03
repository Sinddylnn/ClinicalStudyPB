package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import br.edu.uepb.clinicalstudypb.estudos.api.CriterioCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.CriterioExclusaoConfiguracaoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.CriterioExclusaoConfiguracaoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.CriterioResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.CriterioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------GESTÃO DE CRITÉRIOS------------------->
/**
 * Implementa as operações relacionadas aos critérios do protocolo de um estudo.
 *
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
@Service
public class CriterioService {

    private final EstudoRepository estudos;
    private final ProtocoloRepository protocolos;
    private final CriterioRepository criterios;

    public CriterioService(
            EstudoRepository estudos,
            ProtocoloRepository protocolos,
            CriterioRepository criterios) {
        this.estudos = estudos;
        this.protocolos = protocolos;
        this.criterios = criterios;
    }

    // <-------------------CADASTRO------------------->

    /**
     * Cadastra um critério no protocolo de um estudo do pesquisador autenticado.
     *
     * @param estudoId identificador do estudo
     * @param entrada dados do critério
     * @param autenticado pesquisador conectado
     * @return critério cadastrado
     */
    @Transactional
    public CriterioResposta cadastrar(
            Long estudoId,
            CriterioCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {

        Estudo estudo = bloquearEstudoProprio(estudoId, autenticado);
        validarPlanejamento(estudo);

        Protocolo protocolo = protocolos.findByEstudoId(estudoId)
                .orElseGet(() -> protocolos.save(new Protocolo(estudo, false)));

        validarExclusao(protocolo, entrada.tipo());

        Criterio criterio = new Criterio(
                protocolo,
                entrada.tipo(),
                entrada.descricao()
        );

        return CriterioResposta.de(criterios.save(criterio));
    }

    // <-------------------CONFIGURAÇÃO DE EXCLUSÃO------------------->

    /**
     * Define se o protocolo não possui critérios de exclusão.
     *
     * @param estudoId identificador do estudo
     * @param entrada configuração informada
     * @param autenticado pesquisador conectado
     * @return configuração atualizada
     */
    @Transactional
    public CriterioExclusaoConfiguracaoResposta configurarExclusao(
            Long estudoId,
            CriterioExclusaoConfiguracaoEntrada entrada,
            UsuarioAutenticado autenticado) {

        Estudo estudo = bloquearEstudoProprio(estudoId, autenticado);
        validarPlanejamento(estudo);

        Protocolo protocolo = protocolos.findByEstudoId(estudoId)
                .orElseGet(() -> protocolos.save(new Protocolo(estudo, false)));

        boolean possuiExclusoes = criterios.existsByProtocoloIdAndTipo(
                protocolo.getId(),
                TipoCriterio.EXCLUSAO
        );

        if (entrada.semCriteriosExclusao() && possuiExclusoes) {
            throw new RegraNegocioException(
                    "CRITERIOS_EXCLUSAO_INCONSISTENTES",
                    "O estudo possui critérios de exclusão cadastrados."
            );
        }

        protocolo.definirSemCriteriosExclusao(
                entrada.semCriteriosExclusao()
        );

        protocolos.save(protocolo);

        return new CriterioExclusaoConfiguracaoResposta(
                protocolo.isSemCriteriosExclusao()
        );
    }

    // <-------------------LISTAGEM------------------->

    /**
     * Lista os critérios cadastrados no protocolo do estudo.
     *
     * @param estudoId identificador do estudo
     * @param autenticado pesquisador conectado
     * @return critérios cadastrados
     */
    @Transactional(readOnly = true)
    public List<CriterioResposta> listar(
            Long estudoId,
            UsuarioAutenticado autenticado) {

        consultaPermitida(estudoId, autenticado)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));

        return protocolos.findByEstudoId(estudoId)
                .map(protocolo -> criterios
                        .findByProtocoloIdOrderByIdAsc(protocolo.getId())
                        .stream()
                        .map(CriterioResposta::de)
                        .toList())
                .orElseGet(List::of);
    }

    // <-------------------REGRAS AUXILIARES------------------->

    private Estudo bloquearEstudoProprio(
            Long estudoId,
            UsuarioAutenticado autenticado) {

        return estudos
                .bloquearPorIdEResponsavelId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));
    }

    private void validarPlanejamento(Estudo estudo) {
        if (estudo.getEstado() != EstadoEstudo.PLANEJAMENTO) {
            throw new RegraNegocioException(
                    "ESTUDO_FORA_PLANEJAMENTO",
                    "Os critérios só podem ser alterados enquanto o estudo estiver em planejamento."
            );
        }
    }

    /** Restringe a consulta ao responsável ou ao coordenador vinculado. */
    private java.util.Optional<Estudo> consultaPermitida(Long estudoId, UsuarioAutenticado autenticado) {
        return switch (autenticado.getPerfil()) {
            case PESQUISADOR -> estudos.findByIdAndResponsavelId(estudoId, autenticado.getId());
            case COORDENADOR -> estudos.findByIdAndCoordenadorId(estudoId, autenticado.getId());
            default -> java.util.Optional.empty();
        };
    }

    // <-------------------CONSULTA DA DECLARAÇÃO------------------->

    /** Consulta a declaração sem criar um protocolo durante a leitura. */
    @Transactional(readOnly = true)
    public CriterioExclusaoConfiguracaoResposta consultarExclusao(Long estudoId, UsuarioAutenticado autenticado) {
        consultaPermitida(estudoId, autenticado)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudo não encontrado."));
        return new CriterioExclusaoConfiguracaoResposta(protocolos.findByEstudoId(estudoId)
                .map(Protocolo::isSemCriteriosExclusao).orElse(false));
    }

    // <-------------------EDIÇÃO E REMOÇÃO------------------->

    /** Edita o critério mantendo as mesmas regras de vínculo e planejamento do cadastro. */
    @Transactional
    public CriterioResposta editar(Long estudoId, Long criterioId, CriterioCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {
        Estudo estudo = bloquearEstudoProprio(estudoId, autenticado);
        validarPlanejamento(estudo);
        Criterio criterio = localizarCriterio(estudoId, criterioId);
        validarExclusao(criterio.getProtocolo(), entrada.tipo());
        criterio.editar(entrada.tipo(), entrada.descricao());
        return CriterioResposta.de(criterio);
    }

    /** Remove o critério sem transformar a lista vazia em uma declaração de ausência. */
    @Transactional
    public void remover(Long estudoId, Long criterioId, UsuarioAutenticado autenticado) {
        Estudo estudo = bloquearEstudoProprio(estudoId, autenticado);
        validarPlanejamento(estudo);
        criterios.delete(localizarCriterio(estudoId, criterioId));
    }

    private Criterio localizarCriterio(Long estudoId, Long criterioId) {
        return protocolos.findByEstudoId(estudoId)
                .flatMap(p -> criterios.findByIdAndProtocoloId(criterioId, p.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Critério não encontrado."));
    }

    private void validarExclusao(Protocolo protocolo, TipoCriterio tipo) {
        // A declaração só muda por uma escolha explícita do pesquisador
        if (tipo == TipoCriterio.EXCLUSAO && protocolo.isSemCriteriosExclusao()) {
            throw new RegraNegocioException("CRITERIOS_EXCLUSAO_INCONSISTENTES",
                    "Desmarque a ausência de critérios de exclusão antes de cadastrar ou editar uma exclusão.");
        }
    }
}
