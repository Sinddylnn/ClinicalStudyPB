package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoSolicitacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoReagendamento;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.api.ConfirmacaoPresencaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.PedidoReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.SolicitacaoReagendamentoParticipanteResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.SolicitacaoReagendamentoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------AÇÕES DA PARTICIPANTE NAS VISITAS------------------->
/**
 * Confirma presença e recebe pedidos de reagendamento do participante.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
@Service
public class VisitaParticipanteService {

    private final EstudoRepository estudos;
    private final VisitaAgendadaRepository visitasAgendadas;
    private final SolicitacaoReagendamentoRepository solicitacoesReagendamento;

    /**
     * Recebe os repositórios usados pelas ações do participante.
     *
     * @param estudos repositório de estudos
     * @param visitasAgendadas repositório de visitas
     * @param solicitacoesReagendamento repositório de pedidos de reagendamento
     */
    public VisitaParticipanteService(
            EstudoRepository estudos,
            VisitaAgendadaRepository visitasAgendadas,
            SolicitacaoReagendamentoRepository solicitacoesReagendamento) {
        this.estudos = estudos;
        this.visitasAgendadas = visitasAgendadas;
        this.solicitacoesReagendamento = solicitacoesReagendamento;
    }

    /**
     * Confirma a presença em uma visita futura agendada.
     *
     * @param visitaId identificador da visita
     * @param autenticado participante conectado
     * @return dados públicos da confirmação
     * @throws AccessDeniedException se o perfil não for participante
     * @throws ResponseStatusException se o vínculo ou a visita não existir
     * @throws RegraNegocioException se a ação não estiver permitida pelo estado atual
     */
    @Transactional
    public ConfirmacaoPresencaResposta confirmarPresenca(
            Long visitaId, UsuarioAutenticado autenticado) {
        exigirParticipante(autenticado);

        Long estudoId = buscarEstudoIdDaVisita(visitaId, autenticado);

        // A consulta escalar não popula o cache da visita. Bloquear o estudo antes
        // de reler a visita impede que este fluxo confirme um estado já antigo.
        Estudo estudo = estudos.bloquearPorId(estudoId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        VisitaAgendada visita = visitasAgendadas.findById(visitaId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Visita agendada não encontrada."));

        Instant agora = Instant.now();
        validarAcao(visita, estudo, agora);
        visita.confirmarPresenca(agora);
        return ConfirmacaoPresencaResposta.de(visita);
    }

    /**
     * Cria um pedido de reagendamento para uma visita futura agendada.
     *
     * @param visitaId identificador da visita
     * @param entrada nova data e motivo informados pelo participante
     * @param autenticado participante conectado
     * @return dados públicos do pedido criado
     * @throws AccessDeniedException se o perfil não for participante
     * @throws ResponseStatusException se o vínculo ou a visita não existir
     * @throws RegraNegocioException se o estado ou a data não permitirem o pedido
     * @throws ConflitoException se já existir pedido pendente
     */
    @Transactional
    public SolicitacaoReagendamentoParticipanteResposta pedirReagendamento(
            Long visitaId,
            PedidoReagendamentoEntrada entrada,
            UsuarioAutenticado autenticado) {
        exigirParticipante(autenticado);

        Long estudoId = buscarEstudoIdDaVisita(visitaId, autenticado);

        // A consulta escalar não preenche o cache da sessão. Bloquear o estudo antes
        // da relitura serializa o pedido com o estado atual da visita e do estudo.
        Estudo estudo = estudos.bloquearPorId(estudoId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        VisitaAgendada visita = visitasAgendadas.findById(visitaId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Visita agendada não encontrada."));

        Instant agora = Instant.now();
        validarAcao(visita, estudo, agora);
        RegraDataVisita.validar(estudo, entrada.dataHoraDesejada());

        if (solicitacoesReagendamento
                .existsByVisitaAgendadaIdAndSituacao(
                        visitaId, SituacaoSolicitacao.PENDENTE)) {
            throw new ConflitoException(
                    "SOLICITACAO_JA_PENDENTE",
                    "Já existe um pedido de reagendamento pendente para esta visita.");
        }

        SolicitacaoReagendamento pedido = new SolicitacaoReagendamento(
                visita, entrada.dataHoraDesejada(), entrada.motivo(), agora);
        pedido = solicitacoesReagendamento.saveAndFlush(pedido);
        return SolicitacaoReagendamentoParticipanteResposta.de(pedido);
    }

    private Long buscarEstudoIdDaVisita(
            Long visitaId, UsuarioAutenticado autenticado) {
        return visitasAgendadas
                .buscarEstudoIdDaVisitaDoParticipante(visitaId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita agendada não encontrada."));
    }

    private void validarAcao(
            VisitaAgendada visita, Estudo estudo, Instant agora) {
        if (visita.getParticipacao().getSituacao() != SituacaoParticipacao.ATIVA) {
            throw new RegraNegocioException(
                    "PARTICIPACAO_INVALIDA",
                    "A participação não está ativa.");
        }

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite ações nas visitas do participante.");
        }

        if (visita.getSituacao() != SituacaoVisita.AGENDADA
                || !agora.isBefore(visita.getDataHora())) {
            throw new RegraNegocioException(
                    "TRANSICAO_VISITA_INVALIDA",
                    "A visita precisa estar agendada e ser futura.");
        }
    }

    private void exigirParticipante(UsuarioAutenticado autenticado) {
        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.PARTICIPANTE) {
            throw new AccessDeniedException(
                    "Apenas participantes podem usar estas ações.");
        }
    }
}
