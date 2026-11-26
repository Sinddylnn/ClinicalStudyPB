package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.api.IndicadoresPainelResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Consulta os indicadores do painel de acompanhamento de um estudo.
 *
 * @author Luiz
 * @version 1.0
 * @since 26/11/2026
 */
@Service
public class IndicadoresPainelService {

    private final EstudoRepository estudos;
    private final CandidatoRepository candidatos;
    private final ParticipacaoRepository participacoes;
    private final VisitaAgendadaRepository visitas;

    /**
     * Inicializa o serviço com os repositórios utilizados nas contagens.
     *
     * @param estudos repositório de estudos
     * @param candidatos repositório de candidatos
     * @param participacoes repositório de participações
     * @param visitas repositório de visitas agendadas
     */
    public IndicadoresPainelService(
            EstudoRepository estudos,
            CandidatoRepository candidatos,
            ParticipacaoRepository participacoes,
            VisitaAgendadaRepository visitas) {
        this.estudos = estudos;
        this.candidatos = candidatos;
        this.participacoes = participacoes;
        this.visitas = visitas;
    }

    /**
     * Consulta os indicadores de um estudo acessível ao usuário.
     * Visitas agendadas são consideradas pendentes,
     * independentemente da data.
     *
     * @param estudoId identificador do estudo
     * @param autenticado usuário autenticado
     * @return indicadores do estudo
     * @throws AccessDeniedException quando o perfil não permite a consulta
     * @throws ResponseStatusException quando o estudo não existe ou não está vinculado
     * @since 1.0
     */
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public IndicadoresPainelResposta consultar(
            Long estudoId, UsuarioAutenticado autenticado) {

        if (autenticado == null) {
            throw new AccessDeniedException(
                    "Usuário sem permissão para consultar os indicadores.");
        }

        var estudoPermitido = switch (autenticado.getPerfil()) {
            case PESQUISADOR -> estudos.findByIdAndResponsavelId(
                    estudoId, autenticado.getId());
            case COORDENADOR -> estudos.findByIdAndCoordenadorId(
                    estudoId, autenticado.getId());
            default -> throw new AccessDeniedException(
                    "Apenas o pesquisador responsável e o coordenador vinculado podem consultar os indicadores.");
        };

        estudoPermitido.orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        return new IndicadoresPainelResposta(
                estudoId,
                candidatos.countByEstudoId(estudoId),
                participacoes.countByEstudoId(estudoId),
                participacoes.countByEstudoIdAndSituacao(
                        estudoId, SituacaoParticipacao.ATIVA),
                participacoes.countByEstudoIdAndSituacao(
                        estudoId, SituacaoParticipacao.RETIRADA),
                visitas.countByParticipacao_Estudo_IdAndSituacao(
                        estudoId, SituacaoVisita.REALIZADA),
                visitas.countByParticipacao_Estudo_IdAndSituacao(
                        estudoId, SituacaoVisita.AGENDADA)
        );
    }
}
