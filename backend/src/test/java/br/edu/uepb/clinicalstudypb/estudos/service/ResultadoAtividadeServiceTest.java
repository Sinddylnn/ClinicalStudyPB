package br.edu.uepb.clinicalstudypb.estudos.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.AtividadePrevista;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.Protocolo;
import br.edu.uepb.clinicalstudypb.estudos.ResultadoAtividade;
import br.edu.uepb.clinicalstudypb.estudos.SituacaoVisita;
import br.edu.uepb.clinicalstudypb.estudos.VisitaAgendada;
import br.edu.uepb.clinicalstudypb.estudos.VisitaPrevista;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeCadastroEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeEdicaoEntrada;
import br.edu.uepb.clinicalstudypb.estudos.api.ResultadoAtividadeResposta;
import br.edu.uepb.clinicalstudypb.estudos.repository.AtividadePrevistaRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ResultadoAtividadeRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.VisitaAgendadaRepository;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;

/**
 * Testa as regras de consulta, cadastro e edição dos resultados fictícios das atividades.
 *
 * @author Luiz
 * @version 1.0
 * @since 17/11/2026
 */
@ExtendWith(MockitoExtension.class)
class ResultadoAtividadeServiceTest {

    @Mock
    private EstudoRepository estudos;

    @Mock
    private VisitaAgendadaRepository visitasAgendadas;

    @Mock
    private AtividadePrevistaRepository atividadesPrevistas;

    @Mock
    private ResultadoAtividadeRepository resultados;

    @InjectMocks
    private ResultadoAtividadeService servico;

    private Estudo estudo;
    private VisitaAgendada visita;
    private AtividadePrevista atividade;
    private UsuarioAutenticado coordenador;

    /**
     * Prepara estudo, participação ativa, visita realizada e atividade prevista.
     *
     * @since 1.0
     */
    @BeforeEach
    void prepararDados() {
        Usuario pesquisador = new Usuario(
                "Pesquisador", "pesquisador@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);

        Usuario usuarioCoordenador = new Usuario(
                "Coordenador", "coordenador@teste.com",
                "senha", PerfilUsuario.COORDENADOR);
        ReflectionTestUtils.setField(usuarioCoordenador, "id", 1L);

        Usuario participante = new Usuario(
                "Participante", "participante@teste.com",
                "senha", PerfilUsuario.PARTICIPANTE);

        coordenador = new UsuarioAutenticado(usuarioCoordenador);

        LocalDate hoje = LocalDate.now();
        estudo = new Estudo(
                "Estudo de teste", "Objetivo de teste",
                pesquisador, hoje.minusDays(10), hoje.plusDays(90), 20);
        ReflectionTestUtils.setField(estudo, "id", 10L);
        estudo.alterarEstado(EstadoEstudo.RECRUTAMENTO, null);
        estudo.atribuirCoordenador(usuarioCoordenador);

        Participacao participacao = new Participacao(
                estudo, participante, Instant.now());
        ReflectionTestUtils.setField(participacao, "id", 20L);

        Protocolo protocolo = new Protocolo(estudo, false);
        VisitaPrevista visitaPrevista = new VisitaPrevista(
                protocolo, "Visita inicial", null, 1);
        ReflectionTestUtils.setField(visitaPrevista, "id", 30L);

        visita = new VisitaAgendada(participacao, visitaPrevista, Instant.now());
        ReflectionTestUtils.setField(visita, "id", 40L);
        visita.registrarSituacao(
                SituacaoVisita.REALIZADA, null,
                usuarioCoordenador, Instant.now());

        atividade = new AtividadePrevista(
                visitaPrevista, "Avaliação de pressão arterial");
        ReflectionTestUtils.setField(atividade, "id", 50L);
    }

    /**
     * Configura um estudo e uma visita válidos para o cadastro.
     *
     * @since 1.0
     */
    private void prepararEstudoEVisitaValidos() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
    }

    /**
     * Configura também uma atividade pertencente à visita prevista.
     *
     * @since 1.0
     */
    private void prepararCadastroValido() {
        prepararEstudoEVisitaValidos();
        when(atividadesPrevistas.findByIdAndVisitaPrevistaId(50L, 30L))
                .thenReturn(Optional.of(atividade));
    }

    /**
     * Simula o banco atribuindo um identificador ao resultado salvo.
     *
     * @since 1.0
     */
    private void prepararSalvamento() {
        AtomicLong proximoId = new AtomicLong(60L);
        when(resultados.save(any(ResultadoAtividade.class)))
                .thenAnswer(chamada -> {
                    ResultadoAtividade resultado = chamada.getArgument(0);
                    ReflectionTestUtils.setField(
                            resultado, "id", proximoId.getAndIncrement());
                    return resultado;
                });
    }

    /**
     * Cria uma entrada válida para os testes de registro.
     *
     * @return entrada de resultado para a atividade 50
     * @since 1.0
     */
    private ResultadoAtividadeCadastroEntrada entradaValida() {
        return new ResultadoAtividadeCadastroEntrada(50L, "Resultado fictício válido.");
    }

    // Cadastro e duplicidade

    /**
     * Verifica o cadastro de resultado para uma visita realizada.
     *
     * @since 1.0
     */
    @Test
    void registraResultadoDeVisitaRealizada() {
        prepararCadastroValido();
        prepararSalvamento();

        ResultadoAtividadeResposta resposta = servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(
                        50L, "Pressão arterial dentro dos valores esperados."),
                coordenador);

        assertThat(resposta.id()).isEqualTo(60L);
        assertThat(resposta.visitaAgendadaId()).isEqualTo(40L);
        assertThat(resposta.atividadePrevistaId()).isEqualTo(50L);
        assertThat(resposta.descricaoAtividade())
                .isEqualTo("Avaliação de pressão arterial");
        assertThat(resposta.texto())
                .isEqualTo("Pressão arterial dentro dos valores esperados.");
        assertThat(resposta.registradoPorId()).isEqualTo(1L);
        assertThat(resposta.registradoEm()).isNotNull();
        assertThat(resposta.atualizadoPorId()).isNull();
        assertThat(resposta.atualizadoEm()).isNull();
        verify(resultados).save(any(ResultadoAtividade.class));
    }

    /**
     * Impede registrar duas vezes a mesma atividade na mesma visita.
     *
     * @since 1.0
     */
    @Test
    void rejeitaResultadoDuplicadoNaMesmaVisita() {
        prepararCadastroValido();
        when(resultados.existsByVisitaAgendada_IdAndAtividadePrevista_Id(40L, 50L))
                .thenReturn(true);

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(ConflitoException.class, erro -> {
                    assertThat(erro.getCodigo()).isEqualTo("RESULTADO_JA_REGISTRADO");
                    assertThat(erro).hasMessageContaining("Já existe um resultado");
                });
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Permite cadastrar resultados parciais de atividades diferentes.
     *
     * @since 1.0
     */
    @Test
    void permiteResultadosParciaisDeAtividadesDiferentes() {
        prepararCadastroValido();
        AtividadePrevista segundaAtividade = new AtividadePrevista(
                visita.getVisitaPrevista(), "Avaliação de frequência cardíaca");
        ReflectionTestUtils.setField(segundaAtividade, "id", 51L);
        when(atividadesPrevistas.findByIdAndVisitaPrevistaId(51L, 30L))
                .thenReturn(Optional.of(segundaAtividade));
        prepararSalvamento();

        ResultadoAtividadeResposta primeiro = servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador);
        ResultadoAtividadeResposta segundo = servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(51L, "Resultado da segunda atividade."),
                coordenador);

        assertThat(primeiro.id()).isEqualTo(60L);
        assertThat(segundo.id()).isEqualTo(61L);
        assertThat(primeiro.atividadePrevistaId()).isEqualTo(50L);
        assertThat(segundo.atividadePrevistaId()).isEqualTo(51L);
        verify(resultados, times(2)).save(any(ResultadoAtividade.class));
    }

    // Autorização

    /**
     * Impede que um pesquisador registre resultados.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroPorPesquisador() {
        Usuario usuario = new Usuario(
                "Pesquisador", "outro.pesquisador@teste.com",
                "senha", PerfilUsuario.PESQUISADOR);
        ReflectionTestUtils.setField(usuario, "id", 2L);

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), new UsuarioAutenticado(usuario)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Apenas coordenadores");
        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede o registro pelos demais perfis não autorizados.
     *
     * @param perfil perfil a ser rejeitado
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PARTICIPANTE"})
    void rejeitaRegistroPorOutrosPerfis(PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Sem permissão", "sem.permissao@teste.com", "senha", perfil);

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), new UsuarioAutenticado(usuario)))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede o registro sem uma identidade autenticada.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroSemAutenticacao() {
        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede o registro por coordenador sem vínculo com o estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroPorCoordenadorDeOutroEstudo() {
        Usuario usuario = new Usuario(
                "Outro Coordenador", "outro.coordenador@teste.com",
                "senha", PerfilUsuario.COORDENADOR);
        ReflectionTestUtils.setField(usuario, "id", 2L);
        when(estudos.bloquearPorIdECoordenadorId(10L, 2L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), new UsuarioAutenticado(usuario)))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro -> {
                    assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(erro.getReason()).isEqualTo("Estudo não encontrado.");
                });
        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    // Estados permitidos

    /**
     * Impede cadastrar resultado em uma visita ainda agendada.
     *
     * @since 1.0
     */
    @Test
    void rejeitaResultadoDeVisitaAgendada() {
        VisitaAgendada pendente = new VisitaAgendada(
                visita.getParticipacao(), visita.getVisitaPrevista(), visita.getDataHora());
        ReflectionTestUtils.setField(pendente, "id", 40L);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(pendente));

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("RESULTADO_INVALIDO"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede resultados de visitas ausentes ou canceladas.
     *
     * @param situacao estado final que não permite resultado
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = SituacaoVisita.class, names = {"AUSENTE", "CANCELADA"})
    void rejeitaResultadoDeVisitaNaoRealizada(SituacaoVisita situacao) {
        visita.registrarSituacao(situacao, null, estudo.getCoordenador(), Instant.now());
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("RESULTADO_INVALIDO"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede cadastrar resultados de participações retiradas.
     *
     * @since 1.0
     */
    @Test
    void rejeitaResultadoDeParticipacaoRetirada() {
        visita.getParticipacao().registrarRetirada(
                "Saída voluntária do estudo.", Instant.now(), estudo.getCoordenador());
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("PARTICIPACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede resultados após o encerramento do estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaResultadoDeEstudoEncerrado() {
        estudo.alterarEstado(
                EstadoEstudo.ENCERRADO, "Encerramento antecipado do estudo.");
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("ESTADO_ESTUDO_INVALIDO"));
        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede cadastrar resultados enquanto o estudo está em planejamento.
     *
     * @since 1.0
     */
    @Test
    void rejeitaResultadoDeEstudoEmPlanejamento() {
        ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.PLANEJAMENTO);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("ESTADO_ESTUDO_INVALIDO"));
        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Permite cadastrar resultados em estudo em execução.
     *
     * @since 1.0
     */
    @Test
    void registraResultadoComEstudoEmExecucao() {
        estudo.alterarEstado(EstadoEstudo.EXECUCAO, null);
        prepararCadastroValido();
        prepararSalvamento();

        ResultadoAtividadeResposta resposta = servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador);

        assertThat(resposta.id()).isEqualTo(60L);
        assertThat(resposta.texto()).isEqualTo("Resultado fictício válido.");
        verify(resultados).save(any(ResultadoAtividade.class));
    }

    // Vínculos de estudo, participação, visita e atividade

    /**
     * Impede resultado para atividade de outra visita prevista.
     *
     * @since 1.0
     */
    @Test
    void rejeitaAtividadeQueNaoPertenceAVisita() {
        prepararEstudoEVisitaValidos();
        when(atividadesPrevistas.findByIdAndVisitaPrevistaId(99L, 30L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(99L, "Atividade incorreta."),
                coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("RESULTADO_INVALIDO"));
        verifyNoInteractions(resultados);
    }

    /**
     * Impede resultado para uma visita que não existe.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroComVisitaInexistente() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede indicar na URL uma participação diferente da visita.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroComVisitaDeOutraParticipacao() {
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 99L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede acessar uma participação pertencente a outro estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroComParticipacaoDeOutroEstudo() {
        VisitaAgendada visitaEstranha = mock(VisitaAgendada.class);
        Participacao outraParticipacao = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visitaEstranha));
        when(visitaEstranha.getParticipacao()).thenReturn(outraParticipacao);
        when(outraParticipacao.getId()).thenReturn(20L);
        when(outraParticipacao.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede resultados vinculados a protocolo de outro estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaRegistroComVisitaPrevistaDeOutroEstudo() {
        VisitaAgendada visitaEstranha = mock(VisitaAgendada.class);
        VisitaPrevista outraVisitaPrevista = mock(VisitaPrevista.class);
        Protocolo outroProtocolo = mock(Protocolo.class);
        Estudo outroEstudo = mock(Estudo.class);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visitaEstranha));
        when(visitaEstranha.getParticipacao()).thenReturn(visita.getParticipacao());
        when(visitaEstranha.getVisitaPrevista()).thenReturn(outraVisitaPrevista);
        when(outraVisitaPrevista.getProtocolo()).thenReturn(outroProtocolo);
        when(outroProtocolo.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, entradaValida(), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    // Validação de entrada e valores-limite

    /**
     * Impede o cadastro sem o corpo obrigatório.
     *
     * @since 1.0
     */
    @Test
    void rejeitaCadastroComEntradaNula() {
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L, null, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede identificadores ausentes ou não positivos.
     *
     * @param id identificador inválido
     * @since 1.0
     */
    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0L, -1L})
    void rejeitaCadastroComAtividadeInvalida(Long id) {
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(id, "Resultado fictício."),
                coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede textos nulos, vazios ou compostos só por espaços.
     *
     * @param texto texto inválido
     * @since 1.0
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\n\t"})
    void rejeitaCadastroComTextoVazio(String texto) {
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(50L, texto), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede textos acima do limite de 1.000 caracteres.
     *
     * @since 1.0
     */
    @Test
    void rejeitaCadastroComTextoAcimaDoLimite() {
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(50L, "A".repeat(1001)),
                coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Aceita textos com os tamanhos mínimo e máximo permitidos.
     *
     * @param tamanho número de caracteres válidos
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(ints = {1, 1000})
    void registraResultadoNosLimitesDeTexto(int tamanho) {
        prepararCadastroValido();
        prepararSalvamento();
        String texto = "A".repeat(tamanho);

        ResultadoAtividadeResposta resposta = servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(50L, texto), coordenador);

        assertThat(resposta.texto()).isEqualTo(texto);
        assertThat(resposta.texto()).hasSize(tamanho);
        verify(resultados).save(any(ResultadoAtividade.class));
    }

    /**
     * Normaliza os espaços das extremidades antes de salvar o texto.
     *
     * @since 1.0
     */
    @Test
    void registraResultadoComTextoNormalizado() {
        prepararCadastroValido();
        prepararSalvamento();

        ResultadoAtividadeResposta resposta = servico.registrar(
                10L, 20L, 40L,
                new ResultadoAtividadeCadastroEntrada(
                        50L, "   Resultado com espaços.   "), coordenador);

        assertThat(resposta.texto()).isEqualTo("Resultado com espaços.");
        verify(resultados).save(any(ResultadoAtividade.class));
    }

    // Edição de resultados

    /**
     * Cria um resultado existente para os testes de edição.
     *
     * @return resultado com identificador e dados do registro inicial
     * @since 1.0
     */
    private ResultadoAtividade resultadoExistente() {
        ResultadoAtividade resultado = new ResultadoAtividade(
                visita, atividade, "Texto original.", estudo.getCoordenador(),
                Instant.parse("2026-11-15T12:00:00Z"));
        ReflectionTestUtils.setField(resultado, "id", 60L);
        return resultado;
    }

    /**
     * Prepara os vínculos e a consulta do resultado a editar.
     *
     * @param resultado resultado encontrado na visita
     * @since 1.0
     */
    private void prepararEdicaoValida(ResultadoAtividade resultado) {
        prepararEstudoEVisitaValidos();
        when(resultados.findByIdAndVisitaAgendada_Id(60L, 40L))
                .thenReturn(Optional.of(resultado));
    }

    /**
     * Verifica a edição do texto sem modificar autor e instante de criação.
     *
     * @since 1.0
     */
    @Test
    void editaResultadoPreservandoRegistroOriginal() {
        ResultadoAtividade resultado = resultadoExistente();
        Instant registradoEm = resultado.getRegistradoEm();
        prepararEdicaoValida(resultado);
        when(resultados.save(resultado)).thenReturn(resultado);

        ResultadoAtividadeResposta resposta = servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto corrigido."), coordenador);

        assertThat(resposta.id()).isEqualTo(60L);
        assertThat(resposta.visitaAgendadaId()).isEqualTo(40L);
        assertThat(resposta.atividadePrevistaId()).isEqualTo(50L);
        assertThat(resposta.texto()).isEqualTo("Texto corrigido.");
        assertThat(resposta.registradoPorId()).isEqualTo(1L);
        assertThat(resposta.registradoEm()).isEqualTo(registradoEm);
        assertThat(resposta.atualizadoPorId()).isEqualTo(1L);
        assertThat(resposta.atualizadoEm()).isAfter(registradoEm);
        verify(resultados).save(resultado);
    }

    /**
     * Permite editar resultados enquanto o estudo está em execução.
     *
     * @since 1.0
     */
    @Test
    void editaResultadoEmEstudoEmExecucao() {
        estudo.alterarEstado(EstadoEstudo.EXECUCAO, null);
        ResultadoAtividade resultado = resultadoExistente();
        prepararEdicaoValida(resultado);
        when(resultados.save(resultado)).thenReturn(resultado);

        ResultadoAtividadeResposta resposta = servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Novo valor."), coordenador);

        assertThat(resposta.texto()).isEqualTo("Novo valor.");
        verify(resultados).save(resultado);
    }

    /**
     * Bloqueia a edição para perfis sem permissão.
     *
     * @param perfil perfil sem autorização
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"ADMINISTRADOR", "PESQUISADOR", "PARTICIPANTE"})
    void rejeitaEdicaoPorPerfilSemPermissao(PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Sem permissão", "edicao.sem.permissao@teste.com", "senha", perfil);

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Tentativa indevida."),
                new UsuarioAutenticado(usuario)))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Rejeita a edição sem usuário autenticado.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoSemAutenticacao() {
        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), null))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede coordenador sem vínculo com o estudo de editar resultado.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoPorCoordenadorDeOutroEstudo() {
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Bloqueia alterações de resultado em estudo encerrado.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoEmEstudoEncerrado() {
        estudo.alterarEstado(EstadoEstudo.ENCERRADO, "Fim do estudo.");
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("ESTADO_ESTUDO_INVALIDO"));
        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede a edição quando o estudo não saiu do planejamento.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoEmEstudoEmPlanejamento() {
        ReflectionTestUtils.setField(estudo, "estado", EstadoEstudo.PLANEJAMENTO);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("ESTADO_ESTUDO_INVALIDO"));
        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede editar resultados quando a participação está retirada.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoDeParticipacaoRetirada() {
        visita.getParticipacao().registrarRetirada(
                "Saída do estudo", Instant.now(), estudo.getCoordenador());
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("PARTICIPACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede a edição de resultados quando a visita não está realizada.
     *
     * @param situacao situação que impede a edição
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = SituacaoVisita.class,
            names = {"AGENDADA", "AUSENTE", "CANCELADA"})
    void rejeitaEdicaoDeVisitaNaoRealizada(SituacaoVisita situacao) {
        if (situacao == SituacaoVisita.AGENDADA) {
            visita = new VisitaAgendada(visita.getParticipacao(),
                    visita.getVisitaPrevista(), visita.getDataHora());
            ReflectionTestUtils.setField(visita, "id", 40L);
        } else {
            visita.registrarSituacao(situacao, null, estudo.getCoordenador(), Instant.now());
        }
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("RESULTADO_INVALIDO"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede editar resultado que não existe.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoDeResultadoInexistente() {
        prepararEstudoEVisitaValidos();
        when(resultados.findByIdAndVisitaAgendada_Id(60L, 40L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Impede editar um resultado existente que pertence a outra visita.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoDeResultadoDeOutraVisita() {
        prepararEstudoEVisitaValidos();
        when(resultados.findByIdAndVisitaAgendada_Id(61L, 40L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 61L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Impede editar resultado passando outra participação na URL.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoComVisitaDeOutraParticipacao() {
        prepararEstudoEVisitaValidos();

        assertThatThrownBy(() -> servico.editar(
                10L, 99L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede editar resultado de participação pertencente a outro estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoDeVisitaDeOutroEstudo() {
        VisitaAgendada visitaEstranha = mock(VisitaAgendada.class);
        Participacao outraParticipacao = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visitaEstranha));
        when(visitaEstranha.getParticipacao()).thenReturn(outraParticipacao);
        when(outraParticipacao.getId()).thenReturn(20L);
        when(outraParticipacao.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede editar com visita prevista de protocolo de outro estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoDeVisitaPrevistaDeOutroEstudo() {
        VisitaAgendada visitaEstranha = mock(VisitaAgendada.class);
        VisitaPrevista outraVisita = mock(VisitaPrevista.class);
        Protocolo outroProtocolo = mock(Protocolo.class);
        Estudo outroEstudo = mock(Estudo.class);
        when(estudos.bloquearPorIdECoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visitaEstranha));
        when(visitaEstranha.getParticipacao()).thenReturn(visita.getParticipacao());
        when(visitaEstranha.getVisitaPrevista()).thenReturn(outraVisita);
        when(outraVisita.getProtocolo()).thenReturn(outroProtocolo);
        when(outroProtocolo.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Rejeita resultado que aponta para atividade de outra visita prevista.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoDeResultadoComAtividadeDeOutraVisita() {
        VisitaPrevista outraVisita = mock(VisitaPrevista.class);
        AtividadePrevista atividadeEstranha = mock(AtividadePrevista.class);
        ResultadoAtividade resultadoEstranho = mock(ResultadoAtividade.class);
        prepararEstudoEVisitaValidos();
        when(resultados.findByIdAndVisitaAgendada_Id(60L, 40L))
                .thenReturn(Optional.of(resultadoEstranho));
        when(resultadoEstranho.getAtividadePrevista()).thenReturn(atividadeEstranha);
        when(atividadeEstranha.getVisitaPrevista()).thenReturn(outraVisita);
        when(outraVisita.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("Texto."), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("RESULTADO_INVALIDO"));
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Impede edição sem o corpo da requisição.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoComEntradaNula() {
        prepararEstudoEVisitaValidos();
        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L, null, coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede texto nulo, vazio ou formado somente por espaços na edição.
     *
     * @param texto texto inválido
     * @since 1.0
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\n\t"})
    void rejeitaEdicaoComTextoVazio(String texto) {
        prepararEstudoEVisitaValidos();
        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada(texto), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede que a edição ultrapasse o limite de texto.
     *
     * @since 1.0
     */
    @Test
    void rejeitaEdicaoComTextoAcimaDoLimite() {
        prepararEstudoEVisitaValidos();
        assertThatThrownBy(() -> servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("A".repeat(1001)), coordenador))
                .isInstanceOfSatisfying(RegraNegocioException.class, erro ->
                        assertThat(erro.getCodigo()).isEqualTo("VALIDACAO_INVALIDA"));
        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Permite atualizar textos de tamanho mínimo ou máximo.
     *
     * @param tamanho quantidade de caracteres
     * @since 1.0
     */
    @ParameterizedTest
    @ValueSource(ints = {1, 1000})
    void editaResultadoNosLimitesDeTexto(int tamanho) {
        ResultadoAtividade resultado = resultadoExistente();
        prepararEdicaoValida(resultado);
        when(resultados.save(resultado)).thenReturn(resultado);
        String texto = "A".repeat(tamanho);

        ResultadoAtividadeResposta resposta = servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada(texto), coordenador);

        assertThat(resposta.texto()).isEqualTo(texto);
        assertThat(resposta.texto()).hasSize(tamanho);
        verify(resultados).save(resultado);
    }

    /**
     * Remove espaços das extremidades do novo texto.
     *
     * @since 1.0
     */
    @Test
    void editaResultadoNormalizandoTexto() {
        ResultadoAtividade resultado = resultadoExistente();
        prepararEdicaoValida(resultado);
        when(resultados.save(resultado)).thenReturn(resultado);

        ResultadoAtividadeResposta resposta = servico.editar(
                10L, 20L, 40L, 60L,
                new ResultadoAtividadeEdicaoEntrada("  Texto ajustado.  "), coordenador);

        assertThat(resposta.texto()).isEqualTo("Texto ajustado.");
        verify(resultados).save(resultado);
    }


    // Consulta de resultados

    /**
     * Prepara o vínculo do coordenador com o estudo e a visita consultada.
     *
     * @since 1.0
     */
    private void prepararConsultaValida() {
        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visita));
    }

    /**
     * Consulta resultados de uma visita, mantendo a ordem retornada pelo repositório.
     *
     * @since 1.0
     */
    @Test
    void listaResultadosDaVisita() {
        prepararConsultaValida();
        ResultadoAtividade primeiro = resultadoExistente();
        AtividadePrevista segundaAtividade = new AtividadePrevista(
                visita.getVisitaPrevista(), "Avaliação de frequência cardíaca");
        ReflectionTestUtils.setField(segundaAtividade, "id", 51L);
        ResultadoAtividade segundo = new ResultadoAtividade(
                visita, segundaAtividade, "Frequência cardíaca normal.",
                estudo.getCoordenador(), Instant.parse("2026-11-15T13:00:00Z"));
        ReflectionTestUtils.setField(segundo, "id", 61L);

        when(resultados.buscarResultadosDaVisita(40L))
                .thenReturn(List.of(primeiro, segundo));

        List<ResultadoAtividadeResposta> respostas = servico.listarResultados(
                10L, 20L, 40L, coordenador);

        assertThat(respostas).hasSize(2);
        assertThat(respostas).extracting(ResultadoAtividadeResposta::id)
                .containsExactly(60L, 61L);
        assertThat(respostas).extracting(ResultadoAtividadeResposta::atividadePrevistaId)
                .containsExactly(50L, 51L);
        assertThat(respostas.get(0).descricaoAtividade())
                .isEqualTo("Avaliação de pressão arterial");
        assertThat(respostas.get(1).texto())
                .isEqualTo("Frequência cardíaca normal.");
        verify(resultados).buscarResultadosDaVisita(40L);
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Retorna lista vazia quando a visita não possui resultados registrados.
     *
     * @since 1.0
     */
    @Test
    void consultaSemResultadosRetornaListaVazia() {
        prepararConsultaValida();
        when(resultados.buscarResultadosDaVisita(40L)).thenReturn(List.of());

        List<ResultadoAtividadeResposta> respostas = servico.listarResultados(
                10L, 20L, 40L, coordenador);

        assertThat(respostas).isEmpty();
        verify(resultados).buscarResultadosDaVisita(40L);
    }

    /**
     * Permite consultar resultados antigos após o encerramento do estudo.
     *
     * @since 1.0
     */
    @Test
    void consultaResultadosDeEstudoEncerrado() {
        estudo.alterarEstado(EstadoEstudo.ENCERRADO, "Fim do estudo.");
        prepararConsultaValida();
        when(resultados.buscarResultadosDaVisita(40L))
                .thenReturn(List.of(resultadoExistente()));

        List<ResultadoAtividadeResposta> respostas = servico.listarResultados(
                10L, 20L, 40L, coordenador);

        assertThat(respostas).hasSize(1);
        assertThat(respostas.get(0).id()).isEqualTo(60L);
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Mantém a consulta do histórico para participantes retirados.
     *
     * @since 1.0
     */
    @Test
    void consultaResultadosDeParticipanteRetirado() {
        visita.getParticipacao().registrarRetirada(
                "Saída voluntária.", Instant.now(), estudo.getCoordenador());
        prepararConsultaValida();
        when(resultados.buscarResultadosDaVisita(40L))
                .thenReturn(List.of(resultadoExistente()));

        List<ResultadoAtividadeResposta> respostas = servico.listarResultados(
                10L, 20L, 40L, coordenador);

        assertThat(respostas).hasSize(1);
        assertThat(respostas.get(0).texto()).isEqualTo("Texto original.");
        verify(resultados, never()).save(any(ResultadoAtividade.class));
    }

    /**
     * Permite consultar uma visita ainda agendada, mesmo sem resultados.
     *
     * @since 1.0
     */
    @Test
    void consultaVisitaAgendadaSemResultados() {
        visita = new VisitaAgendada(
                visita.getParticipacao(), visita.getVisitaPrevista(), visita.getDataHora());
        ReflectionTestUtils.setField(visita, "id", 40L);
        prepararConsultaValida();
        when(resultados.buscarResultadosDaVisita(40L)).thenReturn(List.of());

        assertThat(servico.listarResultados(10L, 20L, 40L, coordenador))
                .isEmpty();
        verify(resultados).buscarResultadosDaVisita(40L);
    }

    /**
     * Impede consultar resultados sem um usuário autenticado.
     *
     * @since 1.0
     */
    @Test
    void rejeitaConsultaSemAutenticacao() {
        assertThatThrownBy(() -> servico.listarResultados(
                10L, 20L, 40L, null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede a consulta de resultados por perfis diferentes de coordenador.
     *
     * @param perfil perfil sem autorização de consulta
     * @since 1.0
     */
    @ParameterizedTest
    @EnumSource(value = PerfilUsuario.class,
            names = {"PESQUISADOR", "ADMINISTRADOR", "PARTICIPANTE"})
    void rejeitaConsultaPorPerfilSemPermissao(PerfilUsuario perfil) {
        Usuario usuario = new Usuario(
                "Sem permissão", "consulta.sem.permissao@teste.com",
                "senha", perfil);

        assertThatThrownBy(() -> servico.listarResultados(
                10L, 20L, 40L, new UsuarioAutenticado(usuario)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Apenas coordenadores");

        verifyNoInteractions(estudos, visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede a consulta por coordenador não vinculado ao estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaConsultaPorCoordenadorDeOutroEstudo() {
        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.listarResultados(
                10L, 20L, 40L, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(visitasAgendadas, atividadesPrevistas, resultados);
    }

    /**
     * Impede consultar resultados de uma visita inexistente.
     *
     * @since 1.0
     */
    @Test
    void rejeitaConsultaDeVisitaInexistente() {
        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servico.listarResultados(
                10L, 20L, 40L, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede consultar a visita usando o ID de outra participação.
     *
     * @since 1.0
     */
    @Test
    void rejeitaConsultaDeVisitaDeOutraParticipacao() {
        prepararConsultaValida();

        assertThatThrownBy(() -> servico.listarResultados(
                10L, 99L, 40L, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede consultar a visita de uma participação de outro estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaConsultaDeParticipacaoDeOutroEstudo() {
        VisitaAgendada visitaEstranha = mock(VisitaAgendada.class);
        Participacao outraParticipacao = mock(Participacao.class);
        Estudo outroEstudo = mock(Estudo.class);
        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visitaEstranha));
        when(visitaEstranha.getParticipacao()).thenReturn(outraParticipacao);
        when(outraParticipacao.getId()).thenReturn(20L);
        when(outraParticipacao.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.listarResultados(
                10L, 20L, 40L, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(atividadesPrevistas, resultados);
    }

    /**
     * Impede consultar resultados vinculados ao protocolo de outro estudo.
     *
     * @since 1.0
     */
    @Test
    void rejeitaConsultaDeVisitaPrevistaDeOutroEstudo() {
        VisitaAgendada visitaEstranha = mock(VisitaAgendada.class);
        VisitaPrevista outraVisita = mock(VisitaPrevista.class);
        Protocolo outroProtocolo = mock(Protocolo.class);
        Estudo outroEstudo = mock(Estudo.class);
        when(estudos.findByIdAndCoordenadorId(10L, 1L))
                .thenReturn(Optional.of(estudo));
        when(visitasAgendadas.findById(40L))
                .thenReturn(Optional.of(visitaEstranha));
        when(visitaEstranha.getParticipacao()).thenReturn(visita.getParticipacao());
        when(visitaEstranha.getVisitaPrevista()).thenReturn(outraVisita);
        when(outraVisita.getProtocolo()).thenReturn(outroProtocolo);
        when(outroProtocolo.getEstudo()).thenReturn(outroEstudo);
        when(outroEstudo.getId()).thenReturn(99L);

        assertThatThrownBy(() -> servico.listarResultados(
                10L, 20L, 40L, coordenador))
                .isInstanceOfSatisfying(ResponseStatusException.class, erro ->
                        assertThat(erro.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));

        verifyNoInteractions(atividadesPrevistas, resultados);
    }

}
