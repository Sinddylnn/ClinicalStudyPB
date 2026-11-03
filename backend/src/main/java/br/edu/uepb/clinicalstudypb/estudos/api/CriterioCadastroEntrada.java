package br.edu.uepb.clinicalstudypb.estudos.api;

import br.edu.uepb.clinicalstudypb.estudos.TipoCriterio;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

// <-------------------CADASTRO DE CRITÉRIO------------------->
/**
 * Recebe os dados necessários para cadastrar um critério no protocolo do estudo.
 *
 * @param tipo finalidade do critério
 * @param descricao descrição do critério
 * @author Luiz
 * @version 1.0
 * @since 03/11/2026
 */
public record CriterioCadastroEntrada(

        @NotNull(message = "Informe o tipo do critério.")
        @Schema(description = "Tipo do critério.", example = "INCLUSAO")
        TipoCriterio tipo,

        @NotBlank(message = "Informe a descrição do critério.")
        @Size(max = 1000, message = "A descrição deve ter no máximo 1000 caracteres.")
        @Schema(description = "Descrição do critério.", example = "Ter idade igual ou superior a 18 anos.")
        String descricao
) {

    public CriterioCadastroEntrada {
        if (descricao != null) {
            descricao = descricao.strip();
        }
    }
}
