package br.edu.uepb.clinicalstudypb.estudos;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.LocalDate;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// <-------------------CAMINHOS E INTEGRIDADE DO ESTUDO------------------->
/**
 * Confere a matriz completa de estados e a preservação dos dados quando a operação falha.
 *
 * @author Georis
 * @version 1.0
 * @since 29/10/2026
 */
class EstudoEstadoTest {

    /**
     * Cruza os quatro estados sem usar a implementação como resultado esperado.
     *
     * @return dezesseis combinações, das quais somente cinco são permitidas
     */
    static Stream<Arguments> transicoes() {
        return Stream.of(EstadoEstudo.values()).flatMap(origem ->
                Stream.of(EstadoEstudo.values()).map(destino -> Arguments.of(origem, destino,
                        switch (origem + ":" + destino) {
                            case "PLANEJAMENTO:RECRUTAMENTO", "PLANEJAMENTO:ENCERRADO",
                                    "RECRUTAMENTO:EXECUCAO", "RECRUTAMENTO:ENCERRADO",
                                    "EXECUCAO:ENCERRADO" -> true;
                            default -> false;
                        })));
    }

    /**
     * Verifica inclusive saltos, repetição, retorno e tentativa de reabertura.
     *
     * @param origem estado inicial do cenário
     * @param destino estado solicitado
     * @param permitida resultado esperado conforme o Kickoff
     */
    @ParameterizedTest
    @MethodSource("transicoes")
    void aplicaSomenteCaminhosPermitidos(EstadoEstudo origem, EstadoEstudo destino, boolean permitida) {
        Estudo estudo = estudoEm(origem);
        String justificativa = destino == EstadoEstudo.ENCERRADO ? "  Estudo concluído ou cancelado.  " : null;
        if (permitida) {
            estudo.alterarEstado(destino, justificativa);
            assertThat(estudo.getEstado()).isEqualTo(destino);
            assertThat(estudo.getJustificativaEncerramento())
                    .isEqualTo(justificativa == null ? null : justificativa.strip());
        } else {
            assertThatThrownBy(() -> estudo.alterarEstado(destino, justificativa))
                    .isInstanceOf(RegraNegocioException.class);
            assertThat(estudo.getEstado()).isEqualTo(origem);
            assertThat(estudo.getJustificativaEncerramento()).isNull();
        }
    }

    /**
     * Exige um motivo preenchido nos dois caminhos de encerramento antecipado.
     *
     * @param motivo texto ausente ou formado somente por espaços
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t\n"})
    void exigeJustificativaNoEncerramentoAntecipado(String motivo) {
        for (EstadoEstudo origem : new EstadoEstudo[]{EstadoEstudo.PLANEJAMENTO, EstadoEstudo.RECRUTAMENTO}) {
            Estudo estudo = estudoEm(origem);
            assertThatThrownBy(() -> estudo.alterarEstado(EstadoEstudo.ENCERRADO, motivo))
                    .isInstanceOf(RegraNegocioException.class).hasMessageContaining("justificativa");
            assertThat(estudo.getEstado()).isEqualTo(origem);
        }
    }

    /** Confere os limites do texto e não exige justificativa ao encerrar a execução. */
    @Test
    void validaLimiteEEncerramentoNormal() {
        Estudo estudo = estudoEm(EstadoEstudo.PLANEJAMENTO);
        assertThatThrownBy(() -> estudo.alterarEstado(EstadoEstudo.ENCERRADO, "x".repeat(501)))
                .isInstanceOf(RegraNegocioException.class);
        assertThat(estudo.getEstado()).isEqualTo(EstadoEstudo.PLANEJAMENTO);
        estudo.alterarEstado(EstadoEstudo.ENCERRADO, "x".repeat(500));
        assertThat(estudo.getJustificativaEncerramento()).hasSize(500);

        Estudo emExecucao = estudoEm(EstadoEstudo.EXECUCAO);
        emExecucao.alterarEstado(EstadoEstudo.ENCERRADO, null);
        assertThat(emExecucao.getEstado()).isEqualTo(EstadoEstudo.ENCERRADO);
        assertThat(emExecucao.getJustificativaEncerramento()).isNull();
    }

    /** Evita gravar uma justificativa de encerramento em outro tipo de mudança. */
    @Test
    void rejeitaMotivoForaDoEncerramentoEEstadoNulo() {
        Estudo estudo = estudoEm(EstadoEstudo.PLANEJAMENTO);
        assertThatThrownBy(() -> estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, "Motivo"))
                .isInstanceOf(RegraNegocioException.class);
        assertThatThrownBy(() -> estudo.alterarEstado(null, null))
                .isInstanceOf(RegraNegocioException.class);
        assertThat(estudo.getEstado()).isEqualTo(EstadoEstudo.PLANEJAMENTO);
    }

    /** Preserva o coordenador e a justificativa após o encerramento. */
    @Test
    void encerradoNaoPermiteTrocarCoordenador() {
        Estudo estudo = estudoEm(EstadoEstudo.PLANEJAMENTO);
        Usuario anterior = new Usuario("Coordenação", "coord@example.test", "hash", PerfilUsuario.COORDENADOR);
        estudo.atribuirCoordenador(anterior);
        estudo.alterarEstado(EstadoEstudo.ENCERRADO, "Cancelado");
        assertThatThrownBy(() -> estudo.atribuirCoordenador(
                new Usuario("Outra conta", "outro@example.test", "hash", PerfilUsuario.COORDENADOR)))
                .isInstanceOf(RegraNegocioException.class).hasMessageContaining("encerrado");
        assertThat(estudo.getCoordenador()).isSameAs(anterior);
        assertThat(estudo.getJustificativaEncerramento()).isEqualTo("Cancelado");
    }

    // <-------------------DADOS FICTÍCIOS DO CENÁRIO------------------->

    /**
     * Prepara o estado inicial sem simular transições que dependem de outras entidades.
     *
     * @param estado estado anterior à operação testada
     * @return estudo restrito à memória deste teste
     */
    private Estudo estudoEm(EstadoEstudo estado) {
        Usuario pesquisador = new Usuario("Pesquisa", "pesquisa@example.test", "hash", PerfilUsuario.PESQUISADOR);
        Estudo estudo = new Estudo("Estudo", "Objetivo", pesquisador, LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 12, 1), 10);
        ReflectionTestUtils.setField(estudo, "estado", estado);
        return estudo;
    }
}
