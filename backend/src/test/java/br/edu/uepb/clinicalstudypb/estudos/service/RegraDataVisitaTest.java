package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// <-------------------REGRA DE DATA DAS VISITAS------------------->
/**
 * Testa a validação compartilhada das datas de visitas.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
class RegraDataVisitaTest {

    private static final ZoneId ZONA = ZoneId.of("America/Recife");

    private Estudo estudo;

    @BeforeEach
    void preparar() {
        LocalDate hoje = LocalDate.now(ZONA);
        Usuario pesquisador = new Usuario(
                "Pesquisador", "pesq@teste.com", "senha", PerfilUsuario.PESQUISADOR);
        estudo = new Estudo(
                "Estudo", "Objetivo", pesquisador,
                hoje.plusDays(1), hoje.plusDays(90), 20);
    }

    @Test
    void dataNulaRejeita() {
        assertInvalida(null);
    }

    @Test
    void ontemRejeita() {
        assertInvalida(LocalDate.now(ZONA).minusDays(1).atStartOfDay(ZONA).toInstant());
    }

    @Test
    void hojeAceitaQuandoDentroDoPeriodo() {
        estudo = new Estudo(
                "Estudo", "Objetivo", estudo.getResponsavel(),
                LocalDate.now(ZONA).minusDays(10), LocalDate.now(ZONA).plusDays(90), 20);
        assertThatCode(() -> RegraDataVisita.validar(estudo,
                LocalDate.now(ZONA).atTime(LocalTime.NOON).atZone(ZONA).toInstant()))
                .doesNotThrowAnyException();
    }

    @Test
    void diaAntesDoInicioRejeita() {
        assertInvalida(estudo.getDataInicio().minusDays(1).atStartOfDay(ZONA).toInstant());
    }

    @Test
    void diaDepoisDoFimRejeita() {
        assertInvalida(estudo.getDataFim().plusDays(1).atStartOfDay(ZONA).toInstant());
    }

    @Test
    void ultimoDiaAs22HorasEmRecifeAceita() {
        Estudo terminaHoje = new Estudo(
                "Estudo", "Objetivo", estudo.getResponsavel(),
                LocalDate.now(ZONA).minusDays(10), LocalDate.now(ZONA), 20);
        Instant instant = LocalDate.now(ZONA).atTime(22, 0).atZone(ZONA).toInstant();

        assertThatCode(() -> RegraDataVisita.validar(terminaHoje, instant))
                .doesNotThrowAnyException();
    }

    @Test
    void primeiroDiaDoEstudoAceita() {
        assertThatCode(() -> RegraDataVisita.validar(estudo,
                estudo.getDataInicio().atStartOfDay(ZONA).toInstant()))
                .doesNotThrowAnyException();
    }

    private void assertInvalida(Instant dataHora) {
        assertThatThrownBy(() -> RegraDataVisita.validar(estudo, dataHora))
                .isInstanceOfSatisfying(RegraNegocioException.class,
                        erro -> assertThat(erro.getCodigo())
                                .isEqualTo("DATA_VISITA_INVALIDA"));
    }
}
