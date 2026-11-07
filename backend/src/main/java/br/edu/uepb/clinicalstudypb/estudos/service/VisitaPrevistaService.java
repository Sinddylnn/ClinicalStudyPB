package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.api.AtividadePrevistaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.AtividadePrevistaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaPrevistaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaPrevistaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.AtividadePrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------GESTÃO DE VISITAS PREVISTAS------------------->
/**
 * Implementa as operações das visitas previstas e suas atividades.
 *
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
@Service
public class VisitaPrevistaService {

    private final EstudoRepository estudos;
    private final ProtocoloRepository protocolos;
    private final VisitaPrevistaRepository visitas;
    private final AtividadePrevistaRepository atividades;

    public VisitaPrevistaService(
            EstudoRepository estudos,
            ProtocoloRepository protocolos,
            VisitaPrevistaRepository visitas,
            AtividadePrevistaRepository atividades) {
        this.estudos = estudos;
        this.protocolos = protocolos;
        this.visitas = visitas;
        this.atividades = atividades;
    }

    // <-------------------CADASTRO DE VISITA------------------->

    @Transactional
    public VisitaPrevistaResposta cadastrarVisita(
            Long estudoId,
            VisitaPrevistaCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {

        Estudo estudo = bloquearEstudoProprio(estudoId, autenticado);
        validarPlanejamento(estudo);

        Protocolo protocolo = protocolos.findByEstudoId(estudoId)
                .orElseGet(() -> protocolos.save(new Protocolo(estudo, false)));

        if (visitas.existsByProtocoloIdAndOrdem(
                protocolo.getId(),
                entrada.ordem())) {

            throw new RegraNegocioException(
                    "ORDEM_VISITA_DUPLICADA",
                    "Já existe uma visita prevista com essa ordem."
            );
        }

        VisitaPrevista visita = new VisitaPrevista(
                protocolo,
                entrada.nome(),
                entrada.descricao(),
                entrada.ordem()
        );

        visita = visitas.save(visita);

        return VisitaPrevistaResposta.de(visita, List.of());
    }

    // <-------------------CADASTRO DE ATIVIDADE------------------->

    @Transactional
    public AtividadePrevistaResposta cadastrarAtividade(
            Long estudoId,
            Long visitaId,
            AtividadePrevistaCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {

        Estudo estudo = bloquearEstudoProprio(estudoId, autenticado);
        validarPlanejamento(estudo);

        Protocolo protocolo = protocolos.findByEstudoId(estudoId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita prevista não encontrada."
                ));

        VisitaPrevista visita = visitas
                .findByIdAndProtocoloId(visitaId, protocolo.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita prevista não encontrada."
                ));

        AtividadePrevista atividade = new AtividadePrevista(
                visita,
                entrada.descricao()
        );

        return AtividadePrevistaResposta.de(
                atividades.save(atividade)
        );
    }

    // <-------------------LISTAGEM------------------->

    @Transactional(readOnly = true)
    public List<VisitaPrevistaResposta> listar(
            Long estudoId,
            UsuarioAutenticado autenticado) {

        consultaPermitida(estudoId, autenticado)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));

        return protocolos.findByEstudoId(estudoId)
                .map(protocolo -> visitas
                        .findByProtocoloIdOrderByOrdemAsc(protocolo.getId())
                        .stream()
                        .map(visita -> VisitaPrevistaResposta.de(
                                visita,
                                atividades
                                        .findByVisitaPrevistaIdOrderByIdAsc(visita.getId())
                                        .stream()
                                        .map(AtividadePrevistaResposta::de)
                                        .toList()
                        ))
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
                    "As visitas previstas só podem ser alteradas enquanto o estudo estiver em planejamento."
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

    // <-------------------EDIÇÃO E REMOÇÃO------------------->

    /** Edita uma visita sem trocar seu vínculo ou suas atividades. */
    @Transactional
    public VisitaPrevistaResposta editarVisita(Long estudoId, Long visitaId,
            VisitaPrevistaCadastroEntrada entrada, UsuarioAutenticado autenticado) {
        validarPlanejamento(bloquearEstudoProprio(estudoId, autenticado));
        VisitaPrevista visita = localizarVisita(estudoId, visitaId);
        // A própria visita pode continuar usando a ordem atual
        if (visitas.existsByProtocoloIdAndOrdemAndIdNot(visita.getProtocolo().getId(), entrada.ordem(), visitaId)) {
            throw new RegraNegocioException("ORDEM_VISITA_DUPLICADA", "Já existe uma visita prevista com essa ordem.");
        }
        visita.editar(entrada.nome(), entrada.descricao(), entrada.ordem());
        return VisitaPrevistaResposta.de(visita, atividades.findByVisitaPrevistaIdOrderByIdAsc(visitaId)
                .stream().map(AtividadePrevistaResposta::de).toList());
    }

    /** Remove a visita e suas atividades na mesma transação. */
    @Transactional
    public void removerVisita(Long estudoId, Long visitaId, UsuarioAutenticado autenticado) {
        validarPlanejamento(bloquearEstudoProprio(estudoId, autenticado));
        // A chave estrangeira da V6 remove as atividades junto com a visita
        visitas.delete(localizarVisita(estudoId, visitaId));
    }

    /** Edita a atividade apenas dentro da visita e do estudo informados. */
    @Transactional
    public AtividadePrevistaResposta editarAtividade(Long estudoId, Long visitaId, Long atividadeId,
            AtividadePrevistaCadastroEntrada entrada, UsuarioAutenticado autenticado) {
        validarPlanejamento(bloquearEstudoProprio(estudoId, autenticado));
        localizarVisita(estudoId, visitaId);
        AtividadePrevista atividade = localizarAtividade(visitaId, atividadeId);
        atividade.editar(entrada.descricao());
        return AtividadePrevistaResposta.de(atividade);
    }

    /** Remove a atividade após conferir toda a cadeia de vínculos. */
    @Transactional
    public void removerAtividade(Long estudoId, Long visitaId, Long atividadeId, UsuarioAutenticado autenticado) {
        validarPlanejamento(bloquearEstudoProprio(estudoId, autenticado));
        localizarVisita(estudoId, visitaId);
        atividades.delete(localizarAtividade(visitaId, atividadeId));
    }

    private VisitaPrevista localizarVisita(Long estudoId, Long visitaId) {
        return protocolos.findByEstudoId(estudoId)
                .flatMap(p -> visitas.findByIdAndProtocoloId(visitaId, p.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Visita prevista não encontrada."));
    }

    private AtividadePrevista localizarAtividade(Long visitaId, Long atividadeId) {
        return atividades.findByIdAndVisitaPrevistaId(atividadeId, visitaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Atividade prevista não encontrada."));
    }
}
