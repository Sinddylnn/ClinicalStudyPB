package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.api.CriterioCadastroEntrada;
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

        Criterio criterio = new Criterio(
                protocolo,
                entrada.tipo(),
                entrada.descricao()
        );

        return CriterioResposta.de(criterios.save(criterio));
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

        estudos.findByIdAndResponsavelId(estudoId, autenticado.getId())
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
}
