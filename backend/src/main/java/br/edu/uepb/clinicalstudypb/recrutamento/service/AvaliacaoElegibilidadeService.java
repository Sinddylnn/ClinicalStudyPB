package br.edu.uepb.clinicalstudypb.recrutamento.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.Criterio;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import br.edu.uepb.clinicalstudypb.estudos.repository.CriterioRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ParticipacaoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.estudos.repository.ProtocoloRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.AvaliacaoElegibilidade;
import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaCriterio;
import br.edu.uepb.clinicalstudypb.recrutamento.RespostaElegibilidade;
import br.edu.uepb.clinicalstudypb.recrutamento.SituacaoElegibilidade;
import br.edu.uepb.clinicalstudypb.recrutamento.api.AvaliacaoElegibilidadeEntrada;
import br.edu.uepb.clinicalstudypb.recrutamento.api.AvaliacaoElegibilidadeResposta;
import br.edu.uepb.clinicalstudypb.recrutamento.api.CandidatoResposta;
import br.edu.uepb.clinicalstudypb.recrutamento.api.ItemAvaliacaoResposta;
import br.edu.uepb.clinicalstudypb.recrutamento.api.RespostaCriterioEntrada;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.AvaliacaoElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.RespostaElegibilidadeRepository;
import br.edu.uepb.clinicalstudypb.usuarios.Usuario;
import br.edu.uepb.clinicalstudypb.usuarios.repository.UsuarioRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import br.edu.uepb.clinicalstudypb.usuarios.PerfilUsuario;
import org.springframework.security.access.AccessDeniedException;

// <-------------------AVALIAÇÃO DE ELEGIBILIDADE------------------->
@Service
public class AvaliacaoElegibilidadeService {

    private final EstudoRepository estudos;
    private final CandidatoRepository candidatos;
    private final ProtocoloRepository protocolos;
    private final CriterioRepository criterios;
    private final AvaliacaoElegibilidadeRepository avaliacoes;
    private final RespostaElegibilidadeRepository respostas;
    private final UsuarioRepository usuarios;
    private final ParticipacaoRepository participacoes;

    public AvaliacaoElegibilidadeService(
            EstudoRepository estudos,
            CandidatoRepository candidatos,
            ProtocoloRepository protocolos,
            CriterioRepository criterios,
            AvaliacaoElegibilidadeRepository avaliacoes,
            RespostaElegibilidadeRepository respostas,
            UsuarioRepository usuarios,
            ParticipacaoRepository participacoes) {

        this.estudos = estudos;
        this.candidatos = candidatos;
        this.protocolos = protocolos;
        this.criterios = criterios;
        this.avaliacoes = avaliacoes;
        this.respostas = respostas;
        this.usuarios = usuarios;
        this.participacoes = participacoes;
    }

    // <-------------------CONSULTAR AVALIAÇÃO------------------->

    @Transactional(readOnly = true)
    public AvaliacaoElegibilidadeResposta obter(
            Long estudoId,
            Long candidatoId,
            UsuarioAutenticado autenticado) {

        consultarEstudoPermitido(estudoId, autenticado)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));

        Candidato candidato = buscarCandidato(estudoId, candidatoId);
        List<Criterio> itens = listarCriterios(estudoId);

        var avaliacao = avaliacoes.findByCandidatoId(candidatoId);

        Map<Long, RespostaCriterio> valores = new HashMap<>();
        String avaliadoPor = null;
        LocalDateTime avaliadoEm = null;

        if (avaliacao.isPresent()) {
            AvaliacaoElegibilidade registro = avaliacao.get();

            for (RespostaElegibilidade item :
                    respostas.findByAvaliacaoId(registro.getId())) {

                valores.put(
                        item.getCriterio().getId(),
                        item.getResposta()
                );
            }

            avaliadoPor = registro.getAvaliadoPor().getNome();
            avaliadoEm = registro.getAvaliadoEm();
        }

        return montarResposta(
                candidato, itens, valores, avaliadoPor, avaliadoEm
        );
    }

    // <-------------------SALVAR AVALIAÇÃO------------------->

    @Transactional
    public AvaliacaoElegibilidadeResposta salvar(
            Long estudoId,
            Long candidatoId,
            AvaliacaoElegibilidadeEntrada entrada,
            UsuarioAutenticado autenticado) {

        // Bloqueia primeiro o coordenador e depois o estudo.
        if (autenticado.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "Somente coordenadores podem avaliar candidatos."
            );
        }

        Usuario coordenador = usuarios
                .bloquearPorIds(List.of(autenticado.getId()))
                .stream()
                .filter(u -> u.getId().equals(autenticado.getId()))
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException(
                        "Coordenador indisponível."
                ));

        if (!coordenador.isAtivo()
                || coordenador.getPerfil() != PerfilUsuario.COORDENADOR) {
            throw new AccessDeniedException(
                    "A conta deve ser um coordenador ativo."
            );
        }

        Estudo estudo = estudos
                .bloquearPorIdECoordenadorId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));

        Candidato candidato = buscarCandidato(estudoId, candidatoId);

        // O mesmo bloqueio do estudo deve ser usado pelo serviço de inclusão
        // A conferência vem antes de alterar respostas, situação, autor ou data
        if (participacoes.existsByCandidatoId(candidatoId)) {
            throw new RegraNegocioException(
                    "CANDIDATO_JA_INCLUIDO",
                    "A avaliação de um candidato já incluído não pode ser alterada."
            );
        }

        List<Criterio> itens = listarCriterios(estudoId);

        // Verifica se todas as respostas pertencem ao protocolo.
        Map<Long, RespostaCriterio> valores =
                validarRespostas(entrada, itens);

        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO) {
            throw new RegraNegocioException(
                    "ESTADO_INVALIDO",
                    "Só é possível avaliar candidatos em estudos em Recrutamento."
            );
        }

        SituacaoElegibilidade situacao =
                calcularSituacao(itens, valores);

        AvaliacaoElegibilidade avaliacao = avaliacoes
                .findByCandidatoId(candidatoId)
                .orElse(null);

        if (avaliacao == null) {
            avaliacao = avaliacoes.save(
                    new AvaliacaoElegibilidade(candidato, coordenador)
            );
        } else {
            avaliacao.atualizarRegistro(coordenador);
        }

        // Recupera as respostas salvas anteriormente.
        Map<Long, RespostaElegibilidade> anteriores = new HashMap<>();

        for (RespostaElegibilidade resposta :
                respostas.findByAvaliacaoId(avaliacao.getId())) {

            anteriores.put(
                    resposta.getCriterio().getId(),
                    resposta
            );
        }

        // Insere, atualiza ou remove respostas.
        for (Criterio criterio : itens) {
            RespostaCriterio valor = valores.get(criterio.getId());
            RespostaElegibilidade anterior =
                    anteriores.get(criterio.getId());

            if (valor == null) {
                if (anterior != null) {
                    respostas.delete(anterior);
                }
            } else if (anterior == null) {
                respostas.save(new RespostaElegibilidade(
                        avaliacao, criterio, valor
                ));
            } else {
                anterior.atualizarResposta(valor);
            }
        }

        candidato.atualizarElegibilidade(situacao);

        return montarResposta(
                candidato,
                itens,
                valores,
                coordenador.getNome(),
                avaliacao.getAvaliadoEm()
        );
    }

    // <-------------------BUSCAR CANDIDATO------------------->

    private Candidato buscarCandidato(
            Long estudoId,
            Long candidatoId) {

        return candidatos.findById(candidatoId)
                .filter(c -> c.getEstudo().getId().equals(estudoId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Candidato não encontrado."
                ));
    }

    // <-------------------LISTAR CRITÉRIOS------------------->

    private List<Criterio> listarCriterios(Long estudoId) {

        var protocolo = protocolos.findByEstudoId(estudoId);

        if (protocolo.isEmpty()) {
            return List.of();
        }

        List<Criterio> itens = new ArrayList<>(
                criterios.findByProtocoloIdOrderByIdAsc(
                        protocolo.get().getId()
                )
        );

        // Apresenta primeiro inclusão e depois exclusão.
        itens.sort(
                Comparator.comparingInt(
                        (Criterio c) ->
                                c.getTipo() == TipoCriterio.INCLUSAO ? 0 : 1
                ).thenComparing(Criterio::getId)
        );

        return itens;
    }

    // <-------------------VALIDAR RESPOSTAS------------------->

    private Map<Long, RespostaCriterio> validarRespostas(
            AvaliacaoElegibilidadeEntrada entrada,
            List<Criterio> itens) {

        if (entrada == null || entrada.respostas() == null
                || entrada.respostas().isEmpty()) {

            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Informe os critérios da avaliação."
            );
        }

        Map<Long, Criterio> porId = new HashMap<>();

        for (Criterio criterio : itens) {
            porId.put(criterio.getId(), criterio);
        }

        Map<Long, RespostaCriterio> valores = new HashMap<>();

        for (RespostaCriterioEntrada item : entrada.respostas()) {

            if (item == null || item.criterioId() == null) {
                throw new RegraNegocioException(
                        "VALIDACAO_INVALIDA",
                        "Informe um identificador de critério válido."
                );
            }

            Criterio criterio = porId.get(item.criterioId());

            if (criterio == null) {
                throw new RegraNegocioException(
                        "VALIDACAO_INVALIDA",
                        "Há resposta para um critério que não pertence ao protocolo."
                );
            }

            if (valores.containsKey(item.criterioId())) {
                throw new RegraNegocioException(
                        "VALIDACAO_INVALIDA",
                        "O mesmo critério foi informado mais de uma vez."
                );
            }

            if (!respostaValida(criterio.getTipo(), item.resposta())) {
                throw new RegraNegocioException(
                        "VALIDACAO_INVALIDA",
                        "A resposta não corresponde ao tipo do critério."
                );
            }

            valores.put(item.criterioId(), item.resposta());
        }

        // Não permite salvar uma avaliação totalmente vazia.
        boolean respondeuAlgum = valores.values()
                .stream()
                .anyMatch(valor -> valor != null);

        if (!respondeuAlgum) {
            throw new RegraNegocioException(
                    "VALIDACAO_INVALIDA",
                    "Marque pelo menos um critério antes de salvar a avaliação."
            );
        }

        return valores;
    }

    // <-------------------VALIDAR TIPO DA RESPOSTA------------------->

    private boolean respostaValida(
            TipoCriterio tipo,
            RespostaCriterio resposta) {

        if (resposta == null) {
            return true;
        }

        if (tipo == TipoCriterio.INCLUSAO) {
            return resposta == RespostaCriterio.ATENDIDO
                    || resposta == RespostaCriterio.NAO_ATENDIDO;
        }

        return resposta == RespostaCriterio.PRESENTE
                || resposta == RespostaCriterio.AUSENTE;
    }

    // <-------------------CALCULAR ELEGIBILIDADE------------------->

    private SituacaoElegibilidade calcularSituacao(
            List<Criterio> itens,
            Map<Long, RespostaCriterio> valores) {

        boolean incompleta = false;
        boolean reprovado = false;

        for (Criterio criterio : itens) {

            RespostaCriterio valor = valores.get(criterio.getId());

            if (valor == null) {
                incompleta = true;
                continue;
            }

            if (criterio.getTipo() == TipoCriterio.INCLUSAO
                    && valor == RespostaCriterio.NAO_ATENDIDO) {

                reprovado = true;
            }

            if (criterio.getTipo() == TipoCriterio.EXCLUSAO
                    && valor == RespostaCriterio.PRESENTE) {

                reprovado = true;
            }
        }

        if (incompleta) {
            return SituacaoElegibilidade.INCOMPLETA;
        }

        if (reprovado) {
            return SituacaoElegibilidade.INELEGIVEL;
        }

        return SituacaoElegibilidade.ELEGIVEL;
    }

    // <-------------------MONTAR RESPOSTA DA API------------------->

    private AvaliacaoElegibilidadeResposta montarResposta(
            Candidato candidato,
            List<Criterio> criterios,
            Map<Long, RespostaCriterio> valores,
            String avaliadoPor,
            LocalDateTime avaliadoEm) {

        List<ItemAvaliacaoResposta> itens = criterios.stream()
                .map(c -> new ItemAvaliacaoResposta(
                        c.getId(),
                        c.getTipo(),
                        c.getDescricao(),
                        valores.get(c.getId())
                ))
                .toList();

        return new AvaliacaoElegibilidadeResposta(
                CandidatoResposta.de(candidato),
                candidato.getElegibilidade(),
                itens,
                avaliadoPor,
                avaliadoEm
        );
    }

    // <-------------------PERMISSÃO DE CONSULTA------------------->

    /** Permite leitura ao pesquisador responsável ou ao coordenador vinculado. */
    private java.util.Optional<Estudo> consultarEstudoPermitido(Long estudoId, UsuarioAutenticado autenticado) {
        return switch (autenticado.getPerfil()) {
            case PESQUISADOR -> estudos.findByIdAndResponsavelId(estudoId, autenticado.getId());
            case COORDENADOR -> estudos.findByIdAndCoordenadorId(estudoId, autenticado.getId());
            default -> java.util.Optional.empty();
        };
    }

    // <-------------------CONFERÊNCIA FINAL DA INCLUSÃO------------------->

    /**
     * Reconfere as respostas persistidas, sem confiar apenas no resumo do candidato.
     * A inclusão chama este método depois de bloquear o estudo na mesma transação.
     */
    @Transactional(readOnly = true)
    public void validarParaInclusao(Candidato candidato) {
        List<Criterio> itens = listarCriterios(candidato.getEstudo().getId());
        var avaliacao = avaliacoes.findByCandidatoId(candidato.getId());
        Map<Long, RespostaCriterio> valores = new HashMap<>();
        if (avaliacao.isPresent()) {
            for (RespostaElegibilidade resposta : respostas.findByAvaliacaoId(avaliacao.get().getId())) {
                valores.put(resposta.getCriterio().getId(), resposta.getResposta());
            }
        }
        // Sem inclusão definida, respostas completas não comprovam elegibilidade
        boolean possuiInclusao = itens.stream().anyMatch(c -> c.getTipo() == TipoCriterio.INCLUSAO);
        boolean respostasValidas = itens.stream()
                .allMatch(c -> respostaValida(c.getTipo(), valores.get(c.getId())));
        if (avaliacao.isEmpty() || !possuiInclusao || !respostasValidas
                || candidato.getElegibilidade() != SituacaoElegibilidade.ELEGIVEL
                || calcularSituacao(itens, valores) != SituacaoElegibilidade.ELEGIVEL) {
            throw new RegraNegocioException("ELEGIBILIDADE_INVALIDA",
                    "Só é possível incluir candidatos com avaliação completa e elegível.");
        }
    }
}
