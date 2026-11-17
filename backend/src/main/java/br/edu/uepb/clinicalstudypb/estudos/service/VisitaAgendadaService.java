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
import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.api.ParticipacaoResumoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaReagendamentoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.VisitaAgendadaSituacaoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.CorrecaoVisitaEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.CorrecaoVisitaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaPrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.CorrecaoVisitaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
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
    private final CorrecaoVisitaRepository correcoes;
    private final ResultadoAtividadeRepository resultados;
    private static final ZoneId ZONA = ZoneId.of("America/Recife");


    /**
     * Inicializa o serviço com os repositórios necessários.
     *
     * @param estudos repositório de estudos
     * @param participacoes repositório de participações
     * @param visitasPrevistas repositório de visitas previstas
     * @param visitasAgendadas repositório de visitas agendadas
     * @param correcoes repositório de correções das visitas
     * @param resultados repositório de resultados das atividades
     */
    public VisitaAgendadaService(
            EstudoRepository estudos,
            ParticipacaoRepository participacoes,
            VisitaPrevistaRepository visitasPrevistas,
            VisitaAgendadaRepository visitasAgendadas,
            CorrecaoVisitaRepository correcoes,
            ResultadoAtividadeRepository resultados) {
        this.estudos = estudos;
        this.participacoes = participacoes;
        this.visitasPrevistas = visitasPrevistas;
        this.visitasAgendadas = visitasAgendadas;
        this.correcoes = correcoes;
        this.resultados = resultados;
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


    // <-------REGISTRO DE SITUACAO DE VISITAS------->
    /**
     * Registra a realização, ausência ou cancelamento de uma visita.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita
     * @param entrada situação e motivo do registro
     * @param autenticado usuário autenticado
     * @return dados atualizados da visita
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se algum vínculo não for encontrado
     * @throws RegraNegocioException se o registro não for permitido
     * @since 1.0
     */
    @Transactional
    public VisitaAgendadaResposta registrarSituacao(
            Long estudoId,
            Long participacaoId,
            Long visitaAgendadaId,
            VisitaAgendadaSituacaoEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem registrar visitas.");
        }

        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite registrar visitas.");
        }

        VisitaAgendada visita = visitasAgendadas.findById(visitaAgendadaId)
                .filter(v -> Objects.equals(
                        v.getParticipacao().getId(), participacaoId))
                .filter(v -> Objects.equals(
                        v.getParticipacao().getEstudo().getId(), estudoId))
                .filter(v -> Objects.equals(
                        v.getVisitaPrevista().getProtocolo()
                                .getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita agendada não encontrada."));

        if (visita.getParticipacao().getSituacao()
                != SituacaoParticipacao.ATIVA) {
            throw new RegraNegocioException(
                    "PARTICIPACAO_INVALIDA",
                    "Não é possível registrar visita de participante retirado.");
        }

        if (visita.getSituacao() != SituacaoVisita.AGENDADA) {
            throw new RegraNegocioException(
                    "TRANSICAO_VISITA_INVALIDA",
                    "Apenas visitas agendadas podem ser registradas.");
        }

        SituacaoVisita situacao = entrada.situacao();
        String motivo = entrada.motivo();

        if (situacao == null || situacao == SituacaoVisita.AGENDADA) {
            throw new RegraNegocioException(
                    "TRANSICAO_VISITA_INVALIDA",
                    "Informe uma situação final válida.");
        }

        if (motivo != null && motivo.length() > 500) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "O motivo deve ter no máximo 500 caracteres.");
        }

        if (situacao == SituacaoVisita.CANCELADA) {
            if (motivo == null) {
                throw new RegraNegocioException(
                        "VALIDACAO_INVALIDA",
                        "Informe o motivo do cancelamento.");
            }
        } else {
            LocalDate diaVisita = visita.getDataHora()
                    .atZone(ZONA).toLocalDate();

            if (diaVisita.isAfter(LocalDate.now(ZONA))) {
                throw new RegraNegocioException(
                        "TRANSICAO_VISITA_INVALIDA",
                        "A visita ainda não pode ser registrada.");
            }

            if (situacao == SituacaoVisita.REALIZADA && motivo != null) {
                throw new RegraNegocioException(
                        "VALIDACAO_INVALIDA",
                        "Uma visita realizada não deve ter motivo.");
            }
        }

        visita.registrarSituacao(
                situacao, motivo, estudo.getCoordenador(), Instant.now());

        return VisitaAgendadaResposta.de(
                visitasAgendadas.save(visita));
    }


    // <-------CORRECAO DE SITUACAO DE VISITAS------->
    /**
     * Corrige a situação final de uma visita e registra o histórico.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita
     * @param entrada dados da correção
     * @param autenticado usuário autenticado
     * @return dados da correção registrada
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se algum vínculo não for encontrado
     * @throws RegraNegocioException se a correção não for permitida
     * @since 1.0
     */
    @Transactional
    public CorrecaoVisitaResposta corrigirSituacao(
            Long estudoId,
            Long participacaoId,
            Long visitaAgendadaId,
            CorrecaoVisitaEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem corrigir visitas.");
        }

        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite corrigir visitas.");
        }

        VisitaAgendada visita = visitasAgendadas.findById(visitaAgendadaId)
                .filter(v -> Objects.equals(
                        v.getParticipacao().getId(), participacaoId))
                .filter(v -> Objects.equals(
                        v.getParticipacao().getEstudo().getId(), estudoId))
                .filter(v -> Objects.equals(
                        v.getVisitaPrevista().getProtocolo()
                                .getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Visita agendada não encontrada."));

        if (visita.getParticipacao().getSituacao()
                != SituacaoParticipacao.ATIVA) {
            throw new RegraNegocioException(
                    "PARTICIPACAO_INVALIDA",
                    "Não é possível corrigir visita de participante retirado.");
        }

        SituacaoVisita anterior = visita.getSituacao();
        SituacaoVisita nova = entrada.situacao();
        String motivoAnterior = visita.getMotivo();
        String motivoNovo = entrada.motivo();
        String justificativa = entrada.justificativa();

        if (anterior == SituacaoVisita.AGENDADA
                || nova == null
                || nova == SituacaoVisita.AGENDADA
                || nova == anterior) {
            throw new RegraNegocioException(
                    "TRANSICAO_VISITA_INVALIDA",
                    "A correção deve alterar uma situação final para outra.");
        }

        if (justificativa == null || justificativa.isBlank()
                || justificativa.length() > 500) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Informe uma justificativa de até 500 caracteres.");
        }

        if (motivoNovo != null && motivoNovo.length() > 500) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "O motivo deve ter no máximo 500 caracteres.");
        }

        if (nova == SituacaoVisita.CANCELADA && motivoNovo == null) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Informe o motivo do cancelamento.");
        }

        if (nova == SituacaoVisita.REALIZADA && motivoNovo != null) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Uma visita realizada não deve ter motivo.");
        }

        if (nova == SituacaoVisita.REALIZADA
                || nova == SituacaoVisita.AUSENTE) {
            LocalDate diaVisita = visita.getDataHora()
                    .atZone(ZONA).toLocalDate();

            if (diaVisita.isAfter(LocalDate.now(ZONA))) {
                throw new RegraNegocioException(
                        "TRANSICAO_VISITA_INVALIDA",
                        "A visita ainda não pode ser registrada.");
            }
        }

        if (resultados.existsByVisitaAgendada_Id(visitaAgendadaId)) {
            throw new RegraNegocioException(
                    "CORRECAO_BLOQUEADA",
                    "A visita possui resultados registrados.");
        }

        Instant agora = Instant.now();

        CorrecaoVisita correcao = new CorrecaoVisita(
                visita,
                anterior,
                nova,
                justificativa,
                motivoAnterior,
                motivoNovo,
                estudo.getCoordenador(),
                agora);

        visita.registrarSituacao(
                nova, motivoNovo, estudo.getCoordenador(), agora);

        visitasAgendadas.save(visita);

        return CorrecaoVisitaResposta.de(correcoes.save(correcao));
    }



    // <-------CONSULTA DE PARTICIPACOES------->
    /**
     * Lista as participações de um estudo vinculado ao coordenador
     * ou ao pesquisador responsável, incluindo ativos e retirados.
     *
     * @param estudoId identificador do estudo
     * @param autenticado usuário autenticado
     * @return lista de participações do estudo
     * @throws AccessDeniedException se o perfil não tiver permissão
     * @throws ResponseStatusException se o estudo não for encontrado
     * @since 1.0
     */
    @Transactional(readOnly = true)
    public List<ParticipacaoResumoResposta> listarParticipacoes(
            Long estudoId, UsuarioAutenticado autenticado) {

        if (autenticado == null) {
            throw new AccessDeniedException(
                    "Usuário sem permissão para consultar participações.");
        }

        var consulta = switch (autenticado.getPerfil()) {
            case PESQUISADOR -> estudos.findByIdAndResponsavelId(
                    estudoId, autenticado.getId());

            case COORDENADOR -> estudos.findByIdAndCoordenadorId(
                    estudoId, autenticado.getId());

            default -> throw new AccessDeniedException(
                    "Apenas pesquisadores responsáveis e coordenadores "
                            + "podem consultar as participações.");
        };

        consulta.orElseThrow(() -> new ResponseStatusException(
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
