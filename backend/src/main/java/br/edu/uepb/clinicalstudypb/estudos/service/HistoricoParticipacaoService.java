package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoParticipacao;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.api.CorrecaoVisitaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.HistoricoParticipacaoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ItemHistoricoResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ItemHistoricoRetiradaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ItemHistoricoVisitaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoHistoricoResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.CorrecaoVisitaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Consulta o histórico completo de visitas e retirada de uma participação.
 *
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
@Service
public class HistoricoParticipacaoService {

    private final EstudoRepository estudos;
    private final ParticipacaoRepository participacoes;
    private final VisitaAgendadaRepository visitas;
    private final ResultadoAtividadeRepository resultados;
    private final CorrecaoVisitaRepository correcoes;

    /**
     * Inicializa o serviço com os repositórios utilizados no histórico.
     *
     * @param estudos repositório de estudos
     * @param participacoes repositório de participações
     * @param visitas repositório de visitas agendadas
     * @param resultados repositório de resultados das atividades
     * @param correcoes repositório de correções de visitas
     */
    public HistoricoParticipacaoService(
            EstudoRepository estudos,
            ParticipacaoRepository participacoes,
            VisitaAgendadaRepository visitas,
            ResultadoAtividadeRepository resultados,
            CorrecaoVisitaRepository correcoes) {
        this.estudos = estudos;
        this.participacoes = participacoes;
        this.visitas = visitas;
        this.resultados = resultados;
        this.correcoes = correcoes;
    }

    /**
     * Lista visitas, resultados, correções e eventual retirada em ordem cronológica.
     * Permite a consulta de estudos encerrados e participações retiradas.
     *
     * @param estudoId identificador do estudo
     * @param participacaoId identificador da participação
     * @param autenticado usuário autenticado
     * @return histórico completo da participação
     * @throws AccessDeniedException se o perfil não puder consultar o histórico
     * @throws ResponseStatusException se o estudo ou a participação não estiver no vínculo
     * @since 1.0
     */
    @Transactional(readOnly = true)
    public HistoricoParticipacaoResposta consultar(
            Long estudoId, Long participacaoId, UsuarioAutenticado autenticado) {

        if (autenticado == null) {
            throw new AccessDeniedException("Usuário sem permissão para consultar o histórico.");
        }

        var estudoPermitido = switch (autenticado.getPerfil()) {
            case PESQUISADOR -> estudos.findByIdAndResponsavelId(estudoId, autenticado.getId());
            case COORDENADOR -> estudos.findByIdAndCoordenadorId(estudoId, autenticado.getId());
            default -> throw new AccessDeniedException(
                    "Apenas o pesquisador responsável e o coordenador vinculado podem consultar o histórico.");
        };

        estudoPermitido.orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Estudo não encontrado."));

        Participacao participacao = participacoes.findById(participacaoId)
                .filter(p -> Objects.equals(p.getEstudo().getId(), estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Participação não encontrada."));

        Map<Long, List<ResultadoHistoricoResposta>> resultadosPorVisita = new HashMap<>();
        for (ResultadoAtividade resultado : resultados.buscarResultadosDaParticipacao(participacaoId)) {
            resultadosPorVisita
                    .computeIfAbsent(resultado.getVisitaAgendada().getId(), id -> new ArrayList<>())
                    .add(ResultadoHistoricoResposta.de(resultado));
        }

        Map<Long, List<CorrecaoVisitaResposta>> correcoesPorVisita = new HashMap<>();
        for (CorrecaoVisita correcao : correcoes.buscarCorrecoesDaParticipacao(participacaoId)) {
            correcoesPorVisita
                    .computeIfAbsent(correcao.getVisitaAgendada().getId(), id -> new ArrayList<>())
                    .add(CorrecaoVisitaResposta.de(correcao));
        }

        List<ItemHistoricoResposta> itens = new ArrayList<>();
        for (VisitaAgendada visita : visitas.findByParticipacao_IdOrderByDataHoraAsc(participacaoId)) {
            itens.add(new ItemHistoricoVisitaResposta(
                    "VISITA",
                    visita.getId(),
                    visita.getVisitaPrevista().getNome(),
                    visita.getDataHora(),
                    visita.getSituacao(),
                    visita.getMotivo(),
                    visita.getRegistradoPor() == null ? null : visita.getRegistradoPor().getId(),
                    visita.getRegistradoEm(),
                    resultadosPorVisita.getOrDefault(visita.getId(), List.of()),
                    correcoesPorVisita.getOrDefault(visita.getId(), List.of())
            ));
        }

        if (participacao.getSituacao() == SituacaoParticipacao.RETIRADA) {
            itens.add(ItemHistoricoRetiradaResposta.de(participacao));
        }

        itens.sort(Comparator.comparing(HistoricoParticipacaoService::dataDoItem));
        return new HistoricoParticipacaoResposta(participacaoId, List.copyOf(itens));
    }

    /**
     * Obtém a data usada para posicionar visitas e retirada na linha do tempo.
     *
     * @param item item do histórico
     * @return data de referência do item
     * @since 1.0
     */
    private static Instant dataDoItem(ItemHistoricoResposta item) {
        if (item instanceof ItemHistoricoVisitaResposta visita) {
            return visita.dataHora();
        }
        return ((ItemHistoricoRetiradaResposta) item).dataRetirada();
    }
}
