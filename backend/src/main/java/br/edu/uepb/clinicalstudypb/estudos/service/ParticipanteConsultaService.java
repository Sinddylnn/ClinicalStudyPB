package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.SolicitacaoReagendamento;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.api.HistoricoVisitaParticipanteResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ParticipanteEstudoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ProximaVisitaParticipanteResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.SolicitacaoReagendamentoParticipanteResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.SolicitacaoReagendamentoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------CONSULTAS DO PARTICIPANTE------------------->
/**
 * Atende o aplicativo com os dados do próprio participante autenticado.
 *
 * <p>As consultas são filtradas pelas participações da conta da sessão, e o identificador
 * opcional de estudo é validado contra essas participações.</p>
 *
 * @author Georis
 * @version 1.0
 * @since 17/11/2026
 */
@Service
public class ParticipanteConsultaService {

    private static final ZoneId ZONA = ZoneId.of("America/Recife");
    private static final List<SituacaoVisita> SITUACOES_HISTORICO = List.of(
            SituacaoVisita.REALIZADA,
            SituacaoVisita.AUSENTE,
            SituacaoVisita.CANCELADA);

    private final ParticipacaoRepository participacoes;
    private final VisitaAgendadaRepository visitasAgendadas;
    private final SolicitacaoReagendamentoRepository solicitacoesReagendamento;

    /**
     * Recebe os repositórios usados nas consultas.
     *
     * @param participacoes repositório de participações
     * @param visitasAgendadas repositório de visitas agendadas
     * @param solicitacoesReagendamento repositório de pedidos de reagendamento
     */
    public ParticipanteConsultaService(
            ParticipacaoRepository participacoes,
            VisitaAgendadaRepository visitasAgendadas,
            SolicitacaoReagendamentoRepository solicitacoesReagendamento) {
        this.participacoes = participacoes;
        this.visitasAgendadas = visitasAgendadas;
        this.solicitacoesReagendamento = solicitacoesReagendamento;
    }

    // <-------------------ESTUDOS DO PARTICIPANTE (RF17)------------------->

    /**
     * Lista os estudos em que a conta está ou esteve incluída, inclusive os retirados.
     *
     * @param autenticado participante conectado
     * @return estudos com a situação da participação
     * @throws AccessDeniedException se o usuário não for participante
     */
    @Transactional(readOnly = true)
    public List<ParticipanteEstudoResposta> listarEstudos(UsuarioAutenticado autenticado) {
        exigirParticipante(autenticado);

        return participacoes.findByParticipanteIdOrderByIdAsc(autenticado.getId())
                .stream()
                .map(ParticipanteEstudoResposta::de)
                .toList();
    }

    // <-------------------PRÓXIMAS VISITAS (RF18)------------------->

    /**
     * Lista as visitas AGENDADA de hoje em diante, da mais próxima para a mais distante.
     *
     * @param estudoId estudo opcional para filtrar, ou null
     * @param autenticado participante conectado
     * @return próximas visitas da conta
     * @throws AccessDeniedException se o usuário não for participante
     * @throws ResponseStatusException se o estudo não pertencer às participações da conta
     */
    @Transactional(readOnly = true)
    public List<ProximaVisitaParticipanteResposta> listarProximasVisitas(
            Long estudoId, UsuarioAutenticado autenticado) {

        List<Long> ids = idsDasParticipacoes(estudoId, autenticado);
        if (ids.isEmpty()) {
            return List.of();
        }

        Instant inicioHoje = LocalDate.now(ZONA).atStartOfDay(ZONA).toInstant();
        List<VisitaAgendada> visitas = visitasAgendadas
                .buscarProximasDasParticipacoes(
                        ids, SituacaoVisita.AGENDADA, inicioHoje);
        Map<Long, List<SolicitacaoReagendamentoParticipanteResposta>> pedidos =
                agruparPedidos(visitas);

        return visitas.stream()
                .map(visita -> ProximaVisitaParticipanteResposta.de(
                        visita,
                        pedidos.getOrDefault(
                                visita.getId(),
                                List.of())))
                .toList();
    }

    // <-------------------HISTÓRICO DE COMPARECIMENTO (RF18)------------------->

    /**
     * Lista as visitas realizadas, ausentes e canceladas, da mais recente para a mais antiga.
     *
     * @param estudoId estudo opcional para filtrar, ou null
     * @param autenticado participante conectado
     * @return histórico de comparecimento da conta
     * @throws AccessDeniedException se o usuário não for participante
     * @throws ResponseStatusException se o estudo não pertencer às participações da conta
     */
    @Transactional(readOnly = true)
    public List<HistoricoVisitaParticipanteResposta> listarHistorico(
            Long estudoId, UsuarioAutenticado autenticado) {

        List<Long> ids = idsDasParticipacoes(estudoId, autenticado);
        if (ids.isEmpty()) {
            return List.of();
        }

        List<VisitaAgendada> visitas = visitasAgendadas
                .buscarHistoricoDasParticipacoes(ids, SITUACOES_HISTORICO);
        Map<Long, List<SolicitacaoReagendamentoParticipanteResposta>> pedidos =
                agruparPedidos(visitas);

        return visitas.stream()
                .map(visita -> HistoricoVisitaParticipanteResposta.de(
                        visita,
                        pedidos.getOrDefault(
                                visita.getId(),
                                List.of())))
                .toList();
    }

    // <-------------------REGRAS AUXILIARES------------------->

    /**
     * Identifica as participações da conta, aplicando o filtro opcional de estudo.
     *
     * @param estudoId estudo opcional
     * @param autenticado participante conectado
     * @return identificadores das participações permitidas
     */
    private List<Long> idsDasParticipacoes(Long estudoId, UsuarioAutenticado autenticado) {
        exigirParticipante(autenticado);

        List<Participacao> minhas =
                participacoes.findByParticipanteIdOrderByIdAsc(autenticado.getId());

        if (estudoId != null) {
            minhas = minhas.stream()
                    .filter(p -> Objects.equals(p.getEstudo().getId(), estudoId))
                    .toList();
            if (minhas.isEmpty()) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estudo não encontrado.");
            }
        }

        return minhas.stream().map(Participacao::getId).toList();
    }

    private Map<Long, List<SolicitacaoReagendamentoParticipanteResposta>>
            agruparPedidos(List<VisitaAgendada> visitas) {
        if (visitas.isEmpty()) {
            return Map.of();
        }

        List<Long> visitaIds = visitas.stream()
                .map(VisitaAgendada::getId)
                .toList();
        return solicitacoesReagendamento
                .findByVisitaAgendadaIdInOrderBySolicitadaEmDescIdDesc(visitaIds)
                .stream()
                .collect(Collectors.groupingBy(
                        pedido -> pedido.getVisitaAgendada().getId(),
                        Collectors.mapping(
                                SolicitacaoReagendamentoParticipanteResposta::de,
                                Collectors.toList())));
    }

    /**
     * Garante que somente o perfil participante use estas consultas.
     *
     * @param autenticado usuário conectado
     * @throws AccessDeniedException se o perfil for outro
     */
    private void exigirParticipante(UsuarioAutenticado autenticado) {
        if (autenticado == null
                || autenticado.getPerfil() != PerfilUsuario.PARTICIPANTE) {
            throw new AccessDeniedException(
                    "Apenas participantes podem usar estas consultas.");
        }
    }
}
