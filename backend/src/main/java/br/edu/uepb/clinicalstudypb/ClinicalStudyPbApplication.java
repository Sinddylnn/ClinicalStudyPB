package br.edu.uepb.clinicalstudypb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// <-------------------INICIALIZAÇÃO DO BACKEND------------------->
/**
 * Ponto de entrada do backend ClinicalStudyPB.
 *
 * @author Georis
 * @version 1.0
 * @since 20/10/2026
 */
@SpringBootApplication
public class ClinicalStudyPbApplication {

    /**
     * Inicializa a aplicação e o servidor HTTP do Spring Boot.
     *
     * @param args argumentos de configuração recebidos pela linha de comando
     * @see SpringApplication
     * @since 1.0
     */
    public static void main(String[] args) {
        SpringApplication.run(ClinicalStudyPbApplication.class, args);
    }
}
