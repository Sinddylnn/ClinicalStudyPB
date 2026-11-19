package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;
import br.edu.uepb.clinicalstudypb.estudos.CorrecaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.api.ItemHistoricoRetiradaResposta;
import br.edu.uepb.clinicalstudypb.estudos.api.ItemHistoricoVisitaResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.CorrecaoVisitaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * Testa o histórico completo de uma participação e as permissões de consulta.
 *
 * @author Luiz
 * @version 1.0
 * @since 18/11/2026
 */
@ExtendWith(MockitoExtension.class)
class HistoricoParticipacaoServiceTest {

    @Mock private EstudoRepository estudos;
    @Mock private ParticipacaoRepository participacoes;
    @Mock private VisitaAgendadaRepository visitas;
    @Mock private ResultadoAtividadeRepository resultados;
    @Mock private CorrecaoVisitaRepository correcoes;

    @InjectMocks private HistoricoParticipacaoService servico;

    private Usuario pesquisador;
    private Usuario coordenador;
    private Usuario participante;
    private Estudo estudo;
    private Participacao participacao;
    private VisitaPrevista visitaPrevista;

    /** Prepara os vínculos utilizados nos cenários. */
    @BeforeEach
    void preparar() {
        pesquisador = usuario(1L, "Pesquisador", PerfilUsuario.PESQUISADOR);
        coordenador = usuario(2L, "Coordenador", PerfilUsuario.COORDENADOR);
        participante = usuario(3L, "Participante", PerfilUsuario.PARTICIPANTE);

        estudo = new Estudo("Estudo A", "Objetivo do estudo", pesquisador,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), 10);
        ReflectionTestUtils.setField(estudo, "id", 10L);

        participacao = new Participacao(estudo, participante,
                Instant.parse("2026-11-01T12:00:00Z"));
        ReflectionTestUtils.setField(participacao, "id", 20L);

        visitaPrevista = new VisitaPrevista(
                new Protocolo(estudo, false), "Visita inicial", null, 1);
        ReflectionTestUtils.setField(visitaPrevista, "id", 30L);
    }

    /** Confere a composição do histórico e a posição cronológica da retirada. */
    @Test
    void pesquisadorConsultaVisitasResultadosCorrecoesERetiradaEmOrdemCronologica() {
        permitirPesquisador();
        participacao.registrarRetirada("Solicitação do participante",
                Instant.parse("2026-11-15T12:00:00Z"), coordenador);

        VisitaAgendada antiga = visita(40L, "2026-11-10T13:00:00Z");
        antiga.registrarSituacao(SituacaoVisita.REALIZADA, null,
                coordenador, Instant.parse("2026-11-10T14:00:00Z"));
        VisitaAgendada futura = visita(41L, "2026-11-20T13:00:00Z");
        futura.registrarSituacao(SituacaoVisita.CANCELADA, "Retirada do participante",
                coordenador, Instant.parse("2026-11-15T12:00:00Z"));

        AtividadePrevista atividade = new AtividadePrevista(visitaPrevista, "Avaliação inicial");
        ReflectionTestUtils.setField(atividade, "id", 50L);
        ResultadoAtividade resultado = new ResultadoAtividade(antiga, atividade,
                "Resultado fictício", coordenador, Instant.parse("2026-11-11T10:00:00Z"));
        CorrecaoVisita correcao = new CorrecaoVisita(antiga,
                SituacaoVisita.AUSENTE, SituacaoVisita.REALIZADA,
                "Registro de ausência incorreto", "Não compareceu", null,
                coordenador, Instant.parse("2026-11-10T14:00:00Z"));
        ReflectionTestUtils.setField(correcao, "id", 60L);

        when(resultados.buscarResultadosDaParticipacao(20L)).thenReturn(List.of(resultado));
        when(correcoes.buscarCorrecoesDaParticipacao(20L)).thenReturn(List.of(correcao));
        // A ordem recebida não deve alterar a linha do tempo devolvida.
        when(visitas.findByParticipacao_IdOrderByDataHoraAsc(20L))
                .thenReturn(List.of(futura, antiga));

        var resposta = servico.consultar(10L, 20L, autenticado(pesquisador));

        assertThat(resposta.participacaoId()).isEqualTo(20L);
        assertThat(resposta.itens()).hasSize(3);
        assertThat(resposta.itens().get(0)).isInstanceOf(ItemHistoricoVisitaResposta.class);
        assertThat(resposta.itens().get(1)).isInstanceOf(ItemHistoricoRetiradaResposta.class);
        assertThat(resposta.itens().get(2)).isInstanceOf(ItemHistoricoVisitaResposta.class);

        var itemVisita = (ItemHistoricoVisitaResposta) resposta.itens().get(0);
        assertThat(itemVisita.tipo()).isEqualTo("VISITA");
        assertThat(itemVisita.visitaAgendadaId()).isEqualTo(40L);
        assertThat(itemVisita.nomeVisita()).isEqualTo("Visita inicial");
        assertThat(itemVisita.situacao()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(itemVisita.registradoPorId()).isEqualTo(2L);
        assertThat(itemVisita.registradoEm()).isEqualTo(Instant.parse("2026-11-10T14:00:00Z"));
        assertThat(itemVisita.resultados()).hasSize(1);
        assertThat(itemVisita.resultados().get(0).atividadePrevistaId()).isEqualTo(50L);
        assertThat(itemVisita.resultados().get(0).descricaoAtividade()).isEqualTo("Avaliação inicial");
        assertThat(itemVisita.resultados().get(0).texto()).isEqualTo("Resultado fictício");
        assertThat(itemVisita.correcoes()).hasSize(1);
        assertThat(itemVisita.correcoes().get(0).situacaoAnterior()).isEqualTo(SituacaoVisita.AUSENTE);
        assertThat(itemVisita.correcoes().get(0).situacaoNova()).isEqualTo(SituacaoVisita.REALIZADA);
        assertThat(itemVisita.correcoes().get(0).justificativa())
                .isEqualTo("Registro de ausência incorreto");
        assertThat(itemVisita.correcoes().get(0).corrigidaPorId()).isEqualTo(2L);

        var itemRetirada = (ItemHistoricoRetiradaResposta) resposta.itens().get(1);
        assertThat(itemRetirada.tipo()).isEqualTo("RETIRADA");
        assertThat(itemRetirada.dataRetirada()).isEqualTo(Instant.parse("2026-11-15T12:00:00Z"));
        assertThat(itemRetirada.motivo()).isEqualTo("Solicitação do participante");
        assertThat(itemRetirada.retiradaPorId()).isEqualTo(2L);

        var itemFuturo = (ItemHistoricoVisitaResposta) resposta.itens().get(2);
        assertThat(itemFuturo.visitaAgendadaId()).isEqualTo(41L);
        assertThat(itemFuturo.motivo()).isEqualTo("Retirada do participante");
        assertThat(itemFuturo.resultados()).isEmpty();
        assertThat(itemFuturo.correcoes()).isEmpty();
    }

    /** Confirma a leitura pelo coordenador vinculado, inclusive em estudo encerrado. */
    @Test
    void coordenadorVinculadoConsultaHistoricoDeEstudoEncerrado() {
        ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.ENCERRADO);
        when(estudos.findByIdAndCoordenadorId(10L, 2L)).thenReturn(Optional.of(estudo));
        when(participacoes.findById(20L)).thenReturn(Optional.of(participacao));
        when(visitas.findByParticipacao_IdOrderByDataHoraAsc(20L)).thenReturn(List.of());

        var resposta = servico.consultar(10L, 20L, autenticado(coordenador));

        assertThat(resposta.participacaoId()).isEqualTo(20L);
        assertThat(resposta.itens()).isEmpty();
        verify(estudos).findByIdAndCoordenadorId(10L, 2L);
    }

    /** A consulta vazia continua válida quando a participação está ativa. */
    @Test
    void participacaoAtivaSemVisitasRetornaHistoricoVazio() {
        permitirPesquisador();

        var resposta = servico.consultar(10L, 20L, autenticado(pesquisador));

        assertThat(resposta.itens()).isEmpty();
        verify(resultados).buscarResultadosDaParticipacao(20L);
        verify(correcoes).buscarCorrecoesDaParticipacao(20L);
        verify(visitas).findByParticipacao_IdOrderByDataHoraAsc(20L);
    }

    /** Um pesquisador não pode descobrir dados de um estudo alheio. */
    @Test
    void pesquisadorSemVinculoRecebe404() {
        when(estudos.findByIdAndResponsavelId(10L, 1L)).thenReturn(Optional.empty());

        assertNaoEncontrado(() -> servico.consultar(10L, 20L, autenticado(pesquisador)));
        verifyNoInteractions(participacoes, visitas, resultados, correcoes);
    }

    /** Um coordenador não vinculado também recebe 404. */
    @Test
    void coordenadorSemVinculoRecebe404() {
        when(estudos.findByIdAndCoordenadorId(10L, 2L)).thenReturn(Optional.empty());

        assertNaoEncontrado(() -> servico.consultar(10L, 20L, autenticado(coordenador)));
        verifyNoInteractions(participacoes, visitas, resultados, correcoes);
    }

    /** A participação precisa pertencer ao estudo indicado na URL. */
    @Test
    void participacaoDeOutroEstudoRecebe404() {
        when(estudos.findByIdAndResponsavelId(10L, 1L)).thenReturn(Optional.of(estudo));
        Estudo outro = new Estudo("Outro estudo", "Outro objetivo", pesquisador,
                LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 31), 10);
        ReflectionTestUtils.setField(outro, "id", 11L);
        Participacao alheia = new Participacao(outro, participante, Instant.parse("2026-11-01T12:00:00Z"));
        ReflectionTestUtils.setField(alheia, "id", 21L);
        when(participacoes.findById(21L)).thenReturn(Optional.of(alheia));

        assertNaoEncontrado(() -> servico.consultar(10L, 21L, autenticado(pesquisador)));
        verifyNoInteractions(visitas, resultados, correcoes);
    }

    /** Uma participação inexistente não deve iniciar buscas de dados do histórico. */
    @Test
    void participacaoInexistenteRecebe404() {
        when(estudos.findByIdAndResponsavelId(10L, 1L)).thenReturn(Optional.of(estudo));
        when(participacoes.findById(99L)).thenReturn(Optional.empty());

        assertNaoEncontrado(() -> servico.consultar(10L, 99L, autenticado(pesquisador)));
        verifyNoInteractions(visitas, resultados, correcoes);
    }

    /** Administradores e participantes não têm acesso ao histórico de gestão. */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class, names = {"ADMINISTRADOR", "PARTICIPANTE"})
    void perfilSemPermissaoRecebe403(PerfilUsuario perfil) {
        Usuario outro = usuario(8L, "Outro usuário", perfil);

        assertThatThrownBy(() -> servico.consultar(10L, 20L, autenticado(outro)))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, participacoes, visitas, resultados, correcoes);
    }

    /** Uma identidade ausente é rejeitada antes de acessar o banco. */
    @Test
    void autenticacaoAusenteRecebeAcessoNegado() {
        assertThatThrownBy(() -> servico.consultar(10L, 20L, null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, participacoes, visitas, resultados, correcoes);
    }

    /** Configura um estudo e uma participação pertencentes ao pesquisador. */
    private void permitirPesquisador() {
        when(estudos.findByIdAndResponsavelId(10L, 1L)).thenReturn(Optional.of(estudo));
        when(participacoes.findById(20L)).thenReturn(Optional.of(participacao));
    }

    /** Cria uma visita identificada, vinculada à participação do cenário. */
    private VisitaAgendada visita(Long id, String instante) {
        VisitaAgendada retorno = new VisitaAgendada(
                participacao, visitaPrevista, Instant.parse(instante));
        ReflectionTestUtils.setField(retorno, "id", id);
        return retorno;
    }

    /** Cria uma conta para os testes com um identificador previsível. */
    private Usuario usuario(Long id, String nome, PerfilUsuario perfil) {
        Usuario retorno = new Usuario(nome, "usuario" + id + "@teste.com", "senha", perfil);
        ReflectionTestUtils.setField(retorno, "id", id);
        return retorno;
    }

    /** Converte a conta em identidade autenticada. */
    private UsuarioAutenticado autenticado(Usuario usuario) {
        return new UsuarioAutenticado(usuario);
    }

    /** Verifica o HTTP 404 sem repetir a asserção em cada teste. */
    private void assertNaoEncontrado(org.assertj.core.api.ThrowableAssert.ThrowingCallable acao) {
        assertThatThrownBy(acao)
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        erro -> assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    }
}
