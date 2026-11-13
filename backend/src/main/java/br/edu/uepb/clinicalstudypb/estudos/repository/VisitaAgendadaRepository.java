package br.edu.uepb.clinicalstudypb.estudos.repository;

import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitaAgendadaRepository extends JpaRepository<VisitaAgendada, Long> {

    boolean existsByParticipacao_IdAndVisitaPrevista_IdAndSituacao(
            Long participacaoId,
            Long visitaPrevistaId,
            SituacaoVisita situacao);

    List<VisitaAgendada> findByParticipacao_IdOrderByDataHoraAsc(
            Long participacaoId);
}
