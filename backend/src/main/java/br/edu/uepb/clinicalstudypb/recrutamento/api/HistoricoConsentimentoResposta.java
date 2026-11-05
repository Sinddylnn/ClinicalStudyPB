package br.edu.uepb.clinicalstudypb.recrutamento.api;

import br.edu.uepb.clinicalstudypb.recrutamento.Consentimento;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaConsentimento;
import java.time.Instant;
/** Identifica a resposta, o autor e o instante de cada registro preservado. */
public record HistoricoConsentimentoResposta(Long id, RespostaConsentimento resposta, String observacao,
        Long registradoPorId, String registradoPor, Instant registradoEm) {
    public static HistoricoConsentimentoResposta de(Consentimento registro) {
        return new HistoricoConsentimentoResposta(registro.getId(), registro.getResposta(),
                registro.getObservacao(), registro.getRegistradoPor().getId(),
                registro.getRegistradoPor().getNome(), registro.getRegistradoEm());
    }
}
