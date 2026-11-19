package br.edu.uepb.clinicalstudypb.estudos.service;

import java.time.Instant;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeEdicaoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.AtividadePrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;

/**
 * Gerencia o registro e a edição de resultados fictícios das atividades.
 *
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
@Service
public class ResultadoAtividadeService {

    private final EstudoRepository estudos;
    private final VisitaAgendadaRepository visitasAgendadas;
    private final AtividadePrevistaRepository atividadesPrevistas;
    private final ResultadoAtividadeRepository resultados;

    /**
     * Inicializa o serviço com os repositórios necessários.
     *
     * @param estudos repositório de estudos
     * @param visitasAgendadas repositório de visitas agendadas
     * @param atividadesPrevistas repositório de atividades previstas
     * @param resultados repositório de resultados
     */
    public ResultadoAtividadeService(
            EstudoRepository estudos,
            VisitaAgendadaRepository visitasAgendadas,
            AtividadePrevistaRepository atividadesPrevistas,
            ResultadoAtividadeRepository resultados) {
        this.estudos = estudos;
        this.visitasAgendadas = visitasAgendadas;
        this.atividadesPrevistas = atividadesPrevistas;
        this.resultados = resultados;
    }

    /**
     * Registra o resultado de uma atividade de uma visita realizada.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita realizada
     * @param entrada dados do resultado
     * @param autenticado usuário autenticado
     * @return resultado registrado
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se algum vínculo não for encontrado
     * @throws RegraNegocioException se o registro não for permitido
     * @throws ConflitoException se a atividade já possuir resultado
     * @since 1.0
     */
    @Transactional
    public ResultadoAtividadeResposta registrar(
            Long estudoId,
            Long participacaoId,
            Long visitaAgendadaId,
            ResultadoAtividadeCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem registrar resultados.");
        }

        // Confere o coordenador e bloqueia o estudo durante a transação
        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite registrar resultados.");
        }

        // Confere os vínculos da visita com a participação e o estudo
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
                    "Não é possível registrar resultados de participante retirado.");
        }

        if (visita.getSituacao() != SituacaoVisita.REALIZADA) {
            throw new RegraNegocioException(
                    "RESULTADO_INVALIDO",
                    "Apenas visitas realizadas podem receber resultados.");
        }

        // Valida os dados mesmo quando o serviço for chamado diretamente
        if (entrada == null
                || entrada.atividadePrevistaId() == null
                || entrada.atividadePrevistaId() <= 0
                || entrada.texto() == null
                || entrada.texto().strip().isEmpty()
                || entrada.texto().strip().length() > 1000) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Informe uma atividade e um resultado de 1 a 1000 caracteres.");
        }

        // A atividade deve pertencer à visita prevista correspondente
        AtividadePrevista atividade = atividadesPrevistas
                .findByIdAndVisitaPrevistaId(
                        entrada.atividadePrevistaId(),
                        visita.getVisitaPrevista().getId())
                .orElseThrow(() -> new RegraNegocioException(
                        "RESULTADO_INVALIDO",
                        "A atividade não pertence à visita prevista."));

        // Impede cadastrar dois resultados para a mesma atividade
        if (resultados.existsByVisitaAgendada_IdAndAtividadePrevista_Id(
                visitaAgendadaId, atividade.getId())) {
            throw new ConflitoException(
                    "RESULTADO_JA_REGISTRADO",
                    "Já existe um resultado para esta atividade na visita.");
        }

        ResultadoAtividade resultado = new ResultadoAtividade(
                visita,
                atividade,
                entrada.texto(),
                estudo.getCoordenador(),
                Instant.now());

        return ResultadoAtividadeResposta.de(
                resultados.save(resultado));
    }

    /**
     * Edita o texto de um resultado existente, preservando o registro original.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param visitaAgendadaId identificador da visita realizada
     * @param resultadoId identificador do resultado a editar
     * @param entrada novo texto do resultado
     * @param autenticado usuário autenticado
     * @return resultado com o texto atualizado e os dados de auditoria
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se o estudo, a visita ou o resultado não existir no vínculo
     * @throws RegraNegocioException se o estado ou o texto impedir a edição
     * @since 1.0
     */
    @Transactional
    public ResultadoAtividadeResposta editar(
            Long estudoId,
            Long participacaoId,
            Long visitaAgendadaId,
            Long resultadoId,
            ResultadoAtividadeEdicaoEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem editar resultados.");
        }

        // Mantém a mesma ordem de bloqueio das demais operações do estudo.
        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite editar resultados.");
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
                        HttpStatus.NOT_FOUND, "Visita agendada não encontrada."));

        if (visita.getParticipacao().getSituacao() != SituacaoParticipacao.ATIVA) {
            throw new RegraNegocioException(
                    "PARTICIPACAO_INVALIDA",
                    "Não é possível editar resultados de participante retirado.");
        }

        if (visita.getSituacao() != SituacaoVisita.REALIZADA) {
            throw new RegraNegocioException(
                    "RESULTADO_INVALIDO",
                    "Apenas visitas realizadas podem ter resultados editados.");
        }

        if (entrada == null
                || entrada.texto() == null
                || entrada.texto().strip().isEmpty()
                || entrada.texto().strip().length() > 1000) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Informe um resultado de 1 a 1000 caracteres.");
        }

        // O ID é consultado junto da visita, impedindo alterações em outro vínculo.
        ResultadoAtividade resultado = resultados
                .findByIdAndVisitaAgendada_Id(resultadoId, visitaAgendadaId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Resultado não encontrado."));

        // A edição não permite trocar a atividade do resultado.
        if (!Objects.equals(resultado.getAtividadePrevista().getVisitaPrevista().getId(),
                visita.getVisitaPrevista().getId())) {
            throw new RegraNegocioException(
                    "RESULTADO_INVALIDO",
                    "A atividade não pertence à visita prevista.");
        }

        resultado.atualizar(entrada.texto(), estudo.getCoordenador(), Instant.now());
        return ResultadoAtividadeResposta.de(resultados.save(resultado));
    }
}
