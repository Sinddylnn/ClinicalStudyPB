package br.edu.uepb.clinicalstudypb.recrutamento;

import br.edu.uepb.clinicalstudypb.estudos.Estudo;
import br.edu.uepb.clinicalstudypb.estudos.repository.EstudoRepository;
import br.edu.uepb.clinicalstudypb.recrutamento.repository.CandidatoRepository;
import jakarta.persistence.EntityManager;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

// <-------------------PERSISTÊNCIA DE CANDIDATOS------------------->
/**
 * Testa o cadastro e a consulta de candidatos no PostgreSQL.
 *
 * @author Luiz
 * @version 1.0
 * @since 04/11/2026
 */
@SpringBootTest
@Transactional
@EnabledIfEnvironmentVariable(
        named = "CLINICALSTUDYPB_TEST_DB_URL",
        matches = ".+"
)
class CandidatoPersistenciaIT {

    @Autowired
    private EstudoRepository estudos;

    @Autowired
    private CandidatoRepository candidatos;

    @Autowired
    private EntityManager entidades;

    @DynamicPropertySource
    static void configurarBanco(DynamicPropertyRegistry propriedades) {
        propriedades.add(
                "spring.datasource.url",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_URL")
        );

        propriedades.add(
                "spring.datasource.username",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_USER")
        );

        propriedades.add(
                "spring.datasource.password",
                () -> System.getenv("CLINICALSTUDYPB_TEST_DB_PASSWORD")
        );
    }

    // <-------------------TESTE DE PERSISTÊNCIA------------------->

    @Test
    void salvaEConsultaCandidatoNoBanco() {

        // Utiliza um estudo existente no banco de testes.
        Estudo estudo = estudos.findById(1L).orElseThrow();

        String email = "candidato-"
                + UUID.randomUUID()
                + "@example.test";

        Candidato candidato = new Candidato(
                estudo,
                "  Maria Silva  ",
                "  " + email.toUpperCase(Locale.ROOT) + "  "
        );

        // Salva o candidato no PostgreSQL.
        Candidato salvo = candidatos.saveAndFlush(candidato);
        Long candidatoId = salvo.getId();

        assertThat(candidatoId).isNotNull();

        // Limpa o cache do JPA para consultar novamente o banco.
        entidades.clear();

        Candidato encontrado = candidatos.findById(candidatoId)
                .orElseThrow();

        // Confere os dados recuperados.
        assertThat(encontrado.getEstudo().getId()).isEqualTo(1L);
        assertThat(encontrado.getNome()).isEqualTo("Maria Silva");
        assertThat(encontrado.getEmail()).isEqualTo(email);

        assertThat(encontrado.getElegibilidade())
                .isEqualTo(SituacaoElegibilidade.NAO_AVALIADO);

        assertThat(encontrado.getConsentimento())
                .isEqualTo(SituacaoConsentimento.PENDENTE);

        // Confere a busca de e-mail vinculada ao estudo.
        assertThat(candidatos.existsByEstudoIdAndEmailIgnoreCase(
                1L, email.toUpperCase(Locale.ROOT)
        )).isTrue();
    }
}
