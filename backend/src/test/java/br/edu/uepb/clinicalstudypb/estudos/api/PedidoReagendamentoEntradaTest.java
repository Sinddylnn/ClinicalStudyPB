package br.edu.uepb.clinicalstudypb.estudos.api;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// <-------------------VALIDAÇÃO DO PEDIDO DE REAGENDAMENTO------------------->
/**
 * Testa a validação dos dados informados pelo participante.
 *
 * @author Georis
 * @version 1.0
 * @since 28/11/2026
 */
class PedidoReagendamentoEntradaTest {

    private Validator validador;

    @BeforeEach
    void preparar() {
        validador = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void dataAusenteReprova() {
        Set<ConstraintViolation<PedidoReagendamentoEntrada>> erros =
                validador.validate(new PedidoReagendamentoEntrada(null, null));

        assertThat(erros).anyMatch(erro ->
                erro.getPropertyPath().toString().equals("dataHoraDesejada"));
    }

    @Test
    void motivoCom500CaracteresPassa() {
        PedidoReagendamentoEntrada entrada =
                new PedidoReagendamentoEntrada(Instant.now(), "x".repeat(500));

        assertThat(validador.validate(entrada)).isEmpty();
        assertThat(entrada.motivo()).hasSize(500);
    }

    @Test
    void motivoCom501CaracteresReprova() {
        Set<ConstraintViolation<PedidoReagendamentoEntrada>> erros =
                validador.validate(new PedidoReagendamentoEntrada(
                        Instant.now(), "x".repeat(501)));

        assertThat(erros).anyMatch(erro ->
                erro.getPropertyPath().toString().equals("motivo"));
    }

    @Test
    void motivoComEspacosNasPontasEApardo() {
        PedidoReagendamentoEntrada entrada =
                new PedidoReagendamentoEntrada(Instant.now(), "  Consulta médica  ");

        assertThat(entrada.motivo()).isEqualTo("Consulta médica");
    }

    @Test
    void motivoSoComEspacosViraNuloEVazio() {
        PedidoReagendamentoEntrada entrada =
                new PedidoReagendamentoEntrada(Instant.now(), "   ");

        assertThat(entrada.motivo()).isEmpty();
        assertThat(validador.validate(entrada)).isEmpty();
    }
}
