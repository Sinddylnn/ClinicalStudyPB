package br.edu.uepb.clinicalstudypb.recrutamento.service;

import br.edu.uepb.clinicalstudypb.compartilhado.erro.ConflitoException;
import br.edu.uepb.clinicalstudypb.compartilhado.erro.RegraNegocioException;
import br.edu.uepb.clinicalstudypb.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.Candidato;
import br.edu.uepb.clinicalstudypb.recrutamento.api.CandidatoCadastroEntrada;
import br.edu.uepb.clinicalstudypb.recrutamento.api.CandidatoResposta;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// <-------------------GESTÃO DE CANDIDATOS------------------->
/**
 * Implementa o cadastro e a consulta de candidatos dos estudos.
 *
 * @author Luiz
 * @version 1.0
 * @since 04/11/2026
 */
@Service
public class CandidatoService {

    private final EstudoRepository estudos;
    private final CandidatoRepository candidatos;

    public CandidatoService(
            EstudoRepository estudos,
            CandidatoRepository candidatos) {

        this.estudos = estudos;
        this.candidatos = candidatos;
    }

    // <-------------------CADASTRO------------------->

    @Transactional
    public CandidatoResposta cadastrar(
            Long estudoId,
            CandidatoCadastroEntrada entrada,
            UsuarioAutenticado autenticado) {

        Estudo estudo = estudos
                .bloquearPorIdECoordenadorId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));

        // O cadastro só é permitido durante o recrutamento.
        if (estudo.getEstado() != EstadoEstudo.RECRUTAMENTO) {
            throw new RegraNegocioException(
                    "ESTADO_INVALIDO",
                    "Só é possível cadastrar candidatos em estudos em Recrutamento."
            );
        }

        // Impede repetir o mesmo e-mail no estudo.
        if (candidatos.existsByEstudoIdAndEmailIgnoreCase(
                estudoId,
                entrada.email())) {

            throw new ConflitoException(
                    "EMAIL_JA_CADASTRADO",
                    "Já existe um candidato com este e-mail neste estudo."
            );
        }

        Candidato candidato = new Candidato(
                estudo,
                entrada.nome(),
                entrada.email()
        );

        return CandidatoResposta.de(candidatos.save(candidato));
    }

    // <-------------------LISTAGEM------------------->

    @Transactional(readOnly = true)
    public List<CandidatoResposta> listar(
            Long estudoId,
            UsuarioAutenticado autenticado) {

        estudos.findByIdAndCoordenadorId(estudoId, autenticado.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Estudo não encontrado."
                ));

        return candidatos.findByEstudoIdOrderByIdAsc(estudoId)
                .stream()
                .map(CandidatoResposta::de)
                .toList();
    }
}
