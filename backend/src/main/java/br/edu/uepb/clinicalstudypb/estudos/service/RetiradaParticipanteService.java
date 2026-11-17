package br.edu.uepb.clinicalstudypb.estudos.service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.api.RetiradaEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.RetiradaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;

// <-------------------RETIRADA DE PARTICIPANTES------------------->
/**
 * Registra a retirada irreversível de um participante e cancela suas visitas pendentes.
 *
 * <p>A participação é preservada como inclusão histórica. A retirada não libera vaga
 * nem apaga visitas já registradas ou seus resultados.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 16/11/2026
 */
@Service
public class RetiradaParticipanteService {

    // Motivo gravado nas visitas canceladas automaticamente, conforme a modelagem do RF16
    static final String MOTIVO_CANCELAMENTO_AUTOMATICO = "Retirada do participante";

    private final EstudoRepository estudos;
    private final ParticipacaoRepository participacoes;
    private final VisitaAgendadaRepository visitasAgendadas;

    /**
     * Recebe os repositórios utilizados na retirada.
     *
     * @param estudos repositório de estudos, usado para o vínculo e o bloqueio
     * @param participacoes repositório de participações
     * @param visitasAgendadas repositório das visitas que serão canceladas
     */
    public RetiradaParticipanteService(
            EstudoRepository estudos,
            ParticipacaoRepository participacoes,
            VisitaAgendadaRepository visitasAgendadas) {
        this.estudos = estudos;
        this.participacoes = participacoes;
        this.visitasAgendadas = visitasAgendadas;
    }

    // <-------------------REGISTRO DA RETIRADA------------------->
    /**
     * Marca a participação como RETIRADA e cancela as visitas AGENDADA na mesma transação.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param entrada motivo da retirada
     * @param autenticado coordenador conectado
     * @return dados da retirada registrada
     * @throws AccessDeniedException se o usuário não for coordenador
     * @throws ResponseStatusException se o estudo ou a participação não forem encontrados
     * @throws RegraNegocioException se o estado do estudo ou a situação da participação forem inválidos
     */
    @Transactional
    public RetiradaResposta registrar(
            Long estudoId,
            Long participacaoId,
            RetiradaEntrada entrada,
            UsuarioAutenticado autenticado) {

        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Apenas coordenadores podem registrar retiradas.");
        }

        // Confere o vínculo do coordenador e bloqueia o estudo até o fim da transação
        Estudo estudo = estudos.bloquearPorIdECoordenadorId(
                estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        // Confere o estado depois do bloqueio, para não decidir com um dado antigo
        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO
                && estudo.getEstado() != EstadoEstudo.EXECUCAO) {
            throw new RegraNegocioException(
                    "ESTADO_ESTUDO_INVALIDO",
                    "O estudo não permite registrar retiradas.");
        }

        // A participação precisa pertencer ao estudo da rota
        Participacao participacao = participacoes.findById(participacaoId)
                .filter(p -> Objects.equals(p.getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Participação não encontrada."));

        Usuario responsavel = estudo.getCoordenador();
        Instant agora = Instant.now();

        // Reutiliza a validação de domínio e preserva a inclusão histórica
        participacao.registrarRetirada(entrada.motivo(), agora, responsavel);

        // Visitas finalizadas e seus resultados ficam intactos, só as pendentes são canceladas
        List<VisitaAgendada> pendentes = visitasAgendadas
                .findByParticipacao_IdAndSituacao(
                        participacaoId, SituacaoVisita.AGENDADA);

        for (VisitaAgendada visita : pendentes) {
            visita.registrarSituacao(
                    SituacaoVisita.CANCELADA,
                    MOTIVO_CANCELAMENTO_AUTOMATICO,
                    responsavel,
                    agora);
        }

        visitasAgendadas.saveAll(pendentes);

        return RetiradaResposta.de(participacoes.save(participacao));
    }
}
