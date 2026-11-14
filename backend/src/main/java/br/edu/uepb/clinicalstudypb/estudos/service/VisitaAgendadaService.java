package br.edu.uepb.clinicalstudypb.estudos.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.api.ParticipacaoResumoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;

/**
 * Gerencia o agendamento e reagendamento de visitas
 * e a consulta de participações dos estudos.
 *
 * @author Luiz
 * @version 1.0
 * @since 13/11/2026
 */
@Service
public class VisitaAgendadaService {

    private final EstudoRepository estudos;
    private final ParticipacaoRepository participacoes;
    private final VisitaPrevistaRepository visitasPrevistas;
    private final VisitaAgendadaRepository visitasAgendadas;
    private static final ZoneId ZONA = ZoneId.of("America/Recife");

    /**
    * Inicializa o serviço com os repositórios necessários.
    *
    * @param estudos repositório de estudos
    * @param participacoes repositório de participações
    * @param visitasPrevistas repositório de visitas previstas
    * @param visitasAgendadas repositório de visitas agendadas
    */
    public VisitaAgendadaService(
            EstudoRepository estudos,
            ParticipacaoRepository participacoes,
            VisitaPrevistaRepository visitasPrevistas,
            VisitaAgendadaRepository visitasAgendadas) {
        this.estudos = estudos;
        this.participacoes = participacoes;
        this.visitasPrevistas = visitasPrevistas;
        this.visitasAgendadas = visitasAgendadas;
    }

    // <-------AGENDAMENTO DE VISITAS------->
   /**
    * Agenda uma visita prevista para um participante ativo do estudo.
    *
    * @param estudoId identificador do estudo
    * @param participacaoId identificador da participação
    * @param entrada dados para o agendamento
    * @param autenticado usuário autenticado
    * @return dados da visita agendada
    * @throws AccessDeniedException se o usuário não for coordenador
    * @throws ResponseStatusException se algum vínculo não for encontrado
    * @throws RegraNegocioException se o estado, participação ou data for inválido
    * @throws ConflitoException se já existir um agendamento pendente
    * @since 1.0
    */
    @Transactional
    public VisitaAgendadaResposta agendar(
            Long estudoId,
            Long participacaoId,
            VisitaAgendadaCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem agendar visitas.");
        }

        // Confere o coordenador e bloqueia o estudo
        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        // Confere o estado do estudo
        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite agendamento de visitas.");
        }

        // Confere a participação e seu estudo
        Participacao participacao = participacoes.findById(participacaoId)
                .filter(p -> Objects.equals(
                        p.getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Participação não encontrada."));

        if (participacao.getSituacao() != SituacaoParticipacao.ATIVA) {
            throw new RegraNegocioException(
                    "PARTICIPACAO_INVALIDA",
                    "Não é possível agendar visita para participante retirado.");
        }

        // Confere se a visita pertence ao protocolo do estudo
        VisitaPrevista visitaPrevista = visitasPrevistas
                .findById(entrada.visitaPrevistaId())
                .filter(v -> Objects.equals(
                        v.getProtocolo().getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita prevista não encontrada."));

        // Confere a data do agendamento
        validarData(estudo, entrada.dataHora());

        // Impede agendamento pendente duplicado
        boolean duplicada = visitasAgendadas
                .existsByParticipacaoIdAndVisitaPrevistaIdAndSituacao(
                        participacaoId,
                        visitaPrevista.getId(),
                        SituacaoVisita.AGENDADA);

        if (duplicada) {
            throw new ConflitoException(
                    "VISITA_JA_AGENDADA",
                    "Já existe um agendamento pendente para essa visita.");
        }

        VisitaAgendada visita = new VisitaAgendada(
                participacao,
                visitaPrevista,
                entrada.dataHora());

        return VisitaAgendadaResposta.de(
                visitasAgendadas.save(visita));
    }


    // <-------REAGENDAMENTO DE VISITAS------->
    /**
     * Altera a data de uma visita que ainda está agendada.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita agendada
     * @param entrada dados do reagendamento
     * @param autenticado usuário autenticado
     * @return dados atualizados da visita
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se algum vínculo não for encontrado
     * @throws RegraNegocioException se o reagendamento não for permitido
     * @since 1.0
     */
    @Transactional
    public VisitaAgendadaResposta reagendar(
            Long estudoId,
            Long participacaoId,
            Long visitaAgendadaId,
            VisitaAgendadaReagendamentoEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem reagendar visitas.");
        }

        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite reagendamento de visitas.");
        }

        // Confere se a visita pertence à participação e ao estudo
        VisitaAgendada visita = visitasAgendadas.findById(visitaAgendadaId)
                .filter(v -> Objects.equals(
                        v.getParticipacao().getId(), participacaoId))
                .filter(v -> Objects.equals(
                        v.getParticipacao().getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita agendada não encontrada."));

        if (visita.getParticipacao().getSituacao()
                != SituacaoParticipacao.ATIVA) {
            throw new RegraNegocioException(
                    "PARTICIPACAO_INVALIDA",
                    "Não é possível reagendar visita de participante retirado.");
        }

        if (visita.getSituacao() != SituacaoVisita.AGENDADA) {
            throw new RegraNegocioException(
                "TRANSICAO_VISITA_INVALIDA",
                "Apenas visitas agendadas podem ser reagendadas.");
        }

        validarData(estudo, entrada.dataHora());

        visita.reagendar(entrada.dataHora());

        return VisitaAgendadaResposta.de(
                visitasAgendadas.save(visita));
    }


    // <-------CONSULTA DE PARTICIPACOES------->
    /**
     * Lista as participações de um estudo vinculado ao coordenador,
     * incluindo participantes ativos e retirados.
     *
     * @param estudoId identificador do estudo
     * @param autenticado usuário autenticado
     * @return lista de participações do estudo
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se o estudo não for encontrado
     * @since 1.0
     */
    @Transactional
    public List<ParticipacaoResumoResposta> listarParticipacoes(
            Long estudoId, UsuarioAutenticado autenticado) {
        if (autenticado == null || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem consultar as participações.");
        }
        estudos.bloquearPorIdECoordenadorId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));
        return participacoes.findByEstudoIdOrderByIdAsc(estudoId)
                .stream()
                .map(ParticipacaoResumoResposta::de)
                .toList();
    }

    // <-------VALIDACAO DA DATA------->
    /**
     * Verifica se a data está dentro do período permitido,
     * considerando o fuso horário de Recife.
     *
     * @param estudo estudo com o período permitido
     * @param dataHora data e hora da visita
     * @throws RegraNegocioException se a data for nula ou inválida
     * @since 1.0
     */
    private void validarData(Estudo estudo, Instant dataHora) {

        if (dataHora == null) {
            throw new RegraNegocioException(
                    "DATA_VISITA_INVALIDA",
                    "Informe a data da visita.");
        }

        LocalDate diaVisita = dataHora.atZone(ZONA).toLocalDate();
        LocalDate hoje = LocalDate.now(ZONA);

        if (diaVisita.isBefore(hoje)
                || diaVisita.isBefore(estudo.getDataInicio())
                || diaVisita.isAfter(estudo.getDataFim())) {
            throw new RegraNegocioException(
                    "DATA_VISITA_INVALIDA",
                    "A data da visita está fora do período permitido.");
        }
    }
}
