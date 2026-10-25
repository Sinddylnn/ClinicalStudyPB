package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.EstadoEstudo;
import br.edu.uepb.clinicalstudypb.estudos.Estudo;

import java.time.LocalDate;

/**
 * Representa os dados de um estudo devolvidos pela API.
 *
 * @param id identificador do estudo
 * @param titulo título cadastrado
 * @param objetivo objetivo do estudo
 * @param responsavelId identificador do pesquisador responsável
 * @param dataInicio data prevista de início
 * @param dataFim data prevista de término
 * @param limiteParticipantes quantidade máxima de participantes
 * @param estado estado atual do estudo
 * @author Luiz
 * @version 1.0
 * @since 25/10/2026
 */
public record EstudoResposta(
        Long id,
        String titulo,
        String objetivo,
        Long responsavelId,
        LocalDate dataInicio,
        LocalDate dataFim,
        Integer limiteParticipantes,
        EstadoEstudo estado
) {

    /**
     * Converte uma entidade de estudo para o formato devolvido pela API.
     *
     * @param estudo estudo persistido
     * @return representação dos dados do estudo
     * @since 1.0
     */
    public static EstudoResposta de(Estudo estudo) {
        return new EstudoResposta(
                estudo.getId(),
                estudo.getTitulo(),
                estudo.getObjetivo(),
                estudo.getResponsavel().getId(),
                estudo.getDataInicio(),
                estudo.getDataFim(),
                estudo.getLimiteParticipantes(),
                estudo.getEstado()
        );
    }
}