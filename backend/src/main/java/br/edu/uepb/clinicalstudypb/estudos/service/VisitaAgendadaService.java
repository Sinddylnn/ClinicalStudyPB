package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.*;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaReagendamentoEntrada;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VisitaAgendadaService {

    private final EstudoRepository estudos;
    private final ParticipacaoRepository participacoes;
    private final VisitaPrevistaRepository visitasPrevistas;
    private final VisitaAgendadaRepository visitasAgendadas;

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

    // Agenda uma visita para um participante incluído
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
                    "ESTUDO_FORA_PERIODO",
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
                    "PARTICIPACAO_RETIRADA",
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
                .existsByParticipacao_IdAndVisitaPrevista_IdAndSituacao(
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


    // Altera a data de uma visita ainda agendada
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
                    "ESTUDO_FORA_PERIODO",
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
                    "PARTICIPACAO_RETIRADA",
                    "Não é possível reagendar visita de participante retirado.");
        }

        if (visita.getSituacao() != SituacaoVisita.AGENDADA) {
            throw new ConflitoException(
                    "VISITA_NAO_AGENDADA",
                    "Apenas visitas agendadas podem ser reagendadas.");
        }

        validarData(estudo, entrada.dataHora());

        visita.reagendar(entrada.dataHora());

        return VisitaAgendadaResposta.de(
                visitasAgendadas.save(visita));
    }


    // Confere o dia e o período permitido
    private void validarData(Estudo estudo, Instant dataHora) {

        if (dataHora == null) {
            throw new RegraNegocioException(
                    "DATA_VISITA_INVALIDA",
                    "Informe a data da visita.");
        }

        LocalDate diaVisita = dataHora.atOffset(ZoneOffset.UTC).toLocalDate();
        LocalDate hoje = LocalDate.now(ZoneOffset.UTC);

        if (diaVisita.isBefore(hoje)
                || diaVisita.isBefore(estudo.getDataInicio())
                || diaVisita.isAfter(estudo.getDataFim())) {
            throw new RegraNegocioException(
                    "DATA_VISITA_INVALIDA",
                    "A data da visita está fora do período permitido.");
        }
    }
}
