package br.edu.uepb.clinicalstudypb.estudos.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

// <-------------------REGRA COMPARTILHADA DA DATA DAS VISITAS------------------->
/**
 * Valida datas de visitas segundo o período do estudo.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
public final class RegraDataVisita {

    private static final ZoneId ZONA = ZoneId.of("America/Recife");

    private RegraDataVisita() {
    }

    /**
     * Valida uma data de visita no período permitido pelo estudo.
     *
     * @param estudo estudo ao qual a visita pertence
     * @param dataHora data e hora desejada
     * @throws RegraNegocioException se a data for nula ou estiver fora do período
     */
    public static void validar(Estudo estudo, Instant dataHora) {
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
