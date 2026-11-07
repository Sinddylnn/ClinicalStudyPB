package br.edu.uepb.clinicalstudypb.recrutamento.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.Participacao;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.*;
import br.edu.uepb.clinicalstudypb.recrutamento.api.*;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.*;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------CONSENTIMENTO E INCLUSÃO------------------->
/**
 * Registra respostas simuladas e inclui participantes após conferir as condições do RF11.
 * Compartilha o bloqueio do estudo com avaliações, configuração e mudanças de estado.
 *
 * @author Georis
 */
@Service
public class ConsentimentoInclusaoService {
    private final EstudoRepository estudos;
    private final UsuarioRepository usuarios;
    private final CandidatoRepository candidatos;
    private final ConsentimentoRepository consentimentos;
    private final ParticipacaoRepository participacoes;
    private final AvaliacaoElegibilidadeRepository avaliacoes;
    private final AvaliacaoElegibilidadeService elegibilidade;

    /** Recebe as consultas e a validação de elegibilidade usadas dentro da transação. */
    public ConsentimentoInclusaoService(EstudoRepository estudos, UsuarioRepository usuarios,
            CandidatoRepository candidatos, ConsentimentoRepository consentimentos,
            ParticipacaoRepository participacoes, AvaliacaoElegibilidadeRepository avaliacoes,
            AvaliacaoElegibilidadeService elegibilidade) {
        this.estudos = estudos;
        this.usuarios = usuarios;
        this.candidatos = candidatos;
        this.consentimentos = consentimentos;
        this.participacoes = participacoes;
        this.avaliacoes = avaliacoes;
        this.elegibilidade = elegibilidade;
    }

    // <-------------------REGISTRO E HISTÓRICO------------------->

    /** Registra ou corrige a resposta, preservando todos os registros anteriores. */
    @Transactional
    public RegistroConsentimentoResposta registrarConsentimento(Long estudoId, Long candidatoId,
            ConsentimentoEntrada entrada, UsuarioAutenticado autenticado) {
        Usuario coordenador = bloquearContas(autenticado, null).getFirst();
        bloquearRecrutamento(estudoId, autenticado);
        Candidato candidato = buscarCandidato(estudoId, candidatoId);
        if (participacoes.existsByCandidatoId(candidatoId)) {
            throw new RegraNegocioException("CANDIDATO_JA_INCLUIDO",
                    "O consentimento não pode ser corrigido após a inclusão.");
        }
        if (avaliacoes.findByCandidatoId(candidatoId).isEmpty()) {
            throw new RegraNegocioException("AVALIACAO_PENDENTE",
                    "Registre a avaliação do candidato antes do consentimento.");
        }
        Consentimento registro = consentimentos.save(new Consentimento(candidato, entrada.resposta(),
                entrada.observacao(), coordenador, Instant.now()));
        candidato.registrarConsentimento(entrada.resposta());
        return respostaConsentimento(candidato, registro);
    }

    /** Consulta a resposta atual, mantendo PENDENTE quando ainda não houver registro. */
    @Transactional(readOnly = true)
    public RegistroConsentimentoResposta obterConsentimento(Long estudoId, Long candidatoId,
            UsuarioAutenticado autenticado) {
        conferirConsulta(estudoId, autenticado);
        Candidato candidato = buscarCandidato(estudoId, candidatoId);
        return respostaConsentimento(candidato,
                consentimentos.findFirstByCandidatoIdOrderByIdDesc(candidatoId).orElse(null));
    }

    /** Disponibiliza a trilha de respostas e correções, da mais recente para a mais antiga. */
    @Transactional(readOnly = true)
    public List<HistoricoConsentimentoResposta> historico(Long estudoId, Long candidatoId,
            UsuarioAutenticado autenticado) {
        conferirConsulta(estudoId, autenticado);
        buscarCandidato(estudoId, candidatoId);
        return consentimentos.findByCandidatoIdOrderByIdDesc(candidatoId).stream()
                .map(HistoricoConsentimentoResposta::de).toList();
    }

    // <-------------------CONFERÊNCIA E INCLUSÃO------------------->

    /** Fornece os dados para a tela, sem reservar vaga nem autorizar a inclusão antecipadamente. */
    @Transactional(readOnly = true)
    public DadosInclusaoResposta obterInclusao(Long estudoId, Long candidatoId, UsuarioAutenticado autenticado) {
        conferirConsulta(estudoId, autenticado);
        Candidato candidato = buscarCandidato(estudoId, candidatoId);
        List<ContaParticipanteResposta> contas = usuarios.buscarPorEmail(candidato.getEmail())
                .filter(u -> u.isAtivo() && u.getPerfil() == PerfilUsuario.PARTICIPANTE)
                .map(u -> List.of(new ContaParticipanteResposta(u.getId(), u.getNome(), u.getEmail())))
                .orElseGet(List::of);
        return new DadosInclusaoResposta(CandidatoResposta.de(candidato),
                avaliacoes.findByCandidatoId(candidatoId).map(AvaliacaoElegibilidade::getAvaliadoEm).orElse(null),
                consentimentos.findFirstByCandidatoIdOrderByIdDesc(candidatoId)
                        .map(Consentimento::getRegistradoEm).orElse(null),
                participacoes.countByEstudoId(estudoId), contas);
    }

    /** Confere e ocupa a vaga de forma indivisível, usando os dados atuais do banco. */
    @Transactional
    public CandidatoResposta incluir(Long estudoId, Long candidatoId, InclusaoEntrada entrada,
            UsuarioAutenticado autenticado) {
        // Contas primeiro, em ordem de ID; depois o estudo, como nas outras operações
        List<Usuario> contas = bloquearContas(autenticado, entrada.contaId());
        Estudo estudo = bloquearRecrutamento(estudoId, autenticado);
        Candidato candidato = buscarCandidato(estudoId, candidatoId);
        Usuario participante = contas.stream().filter(u -> u.getId().equals(entrada.contaId()))
                .findFirst().orElseThrow(() -> contaInvalida());
        if (!participante.isAtivo() || participante.getPerfil() != PerfilUsuario.PARTICIPANTE
                || !participante.getEmail().strip().equalsIgnoreCase(candidato.getEmail().strip())) {
            throw contaInvalida();
        }
        if (participacoes.existsByCandidatoId(candidatoId)
                || participacoes.existsByEstudoIdAndParticipanteId(estudoId, participante.getId())) {
            throw new ConflitoException("INCLUSAO_DUPLICADA", "Esta pessoa já foi incluída neste estudo.");
        }
        elegibilidade.validarParaInclusao(candidato);
        Consentimento aceite = consentimentos.findFirstByCandidatoIdOrderByIdDesc(candidatoId).orElse(null);
        // Um resumo ACEITOU sem registro histórico não comprova consentimento
        if (aceite == null || aceite.getResposta() != RespostaConsentimento.ACEITOU
                || candidato.getConsentimento() != SituacaoConsentimento.ACEITOU) {
            throw new RegraNegocioException("CONSENTIMENTO_NAO_ACEITO",
                    "Registre o aceite do consentimento antes de incluir o candidato.");
        }
        // A contagem inclui o histórico, mesmo após uma futura retirada
        if (participacoes.countByEstudoId(estudoId) >= estudo.getLimiteParticipantes()) {
            throw new ConflitoException("LIMITE_ATINGIDO", "O estudo atingiu o limite de participantes.");
        }
        participacoes.save(new Participacao(candidato, participante, Instant.now()));
        return CandidatoResposta.de(candidato);
    }

    // <-------------------VÍNCULOS E BLOQUEIOS------------------->

    /** Mantém as contas estáveis até a gravação terminar e reconfere o coordenador. */
    private List<Usuario> bloquearContas(UsuarioAutenticado autenticado, Long participanteId) {
        if (autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException("Somente coordenadores podem registrar consentimento e inclusão.");
        }
        List<Long> ids = participanteId == null ? List.of(autenticado.getId())
                : List.of(autenticado.getId(), participanteId);
        List<Usuario> contas = usuarios.bloquearPorIds(ids);
        Usuario coordenador = contas.stream().filter(u -> u.getId().equals(autenticado.getId()))
                .findFirst().orElseThrow(() -> new AccessDeniedException("Coordenador indisponível."));
        if (!coordenador.isAtivo() || coordenador.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException("A conta deve ser um coordenador ativo.");
        }
        return contas;
    }

    private Estudo bloquearRecrutamento(Long estudoId, UsuarioAutenticado autenticado) {
        Estudo estudo = estudos.bloquearPorIdECoordenadorId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudo não encontrado."));
        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO) {
            throw new RegraNegocioException("ESTADO_INVALIDO",
                    "Consentimento e inclusão só podem ser registrados durante o recrutamento.");
        }
        return estudo;
    }

    private void conferirConsulta(Long estudoId, UsuarioAutenticado autenticado) {
        var estudo = switch (autenticado.getPerfil()) {
            case PESQUISADOR -> estudos.findByIdAndResponsavelId(estudoId, autenticado.getId());
            case COORDENADOR -> estudos.findByIdAndCoordenadorId(estudoId, autenticado.getId());
            default -> throw new AccessDeniedException("Seu perfil não permite consultar o recrutamento.");
        };
        estudo.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estudo não encontrado."));
    }

    private Candidato buscarCandidato(Long estudoId, Long candidatoId) {
        return candidatos.findById(candidatoId).filter(c -> c.getEstudo().getId().equals(estudoId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Candidato não encontrado."));
    }

    private RegistroConsentimentoResposta respostaConsentimento(Candidato candidato, Consentimento registro) {
        return new RegistroConsentimentoResposta(CandidatoResposta.de(candidato),
                registro == null ? null : registro.getObservacao(),
                registro == null ? null : registro.getRegistradoPor().getNome(),
                registro == null ? null : registro.getRegistradoEm());
    }

    private RegraNegocioException contaInvalida() {
        return new RegraNegocioException("CONTA_INVALIDA",
                "Escolha uma conta ativa de participante com o mesmo e-mail do candidato.");
    }
}
