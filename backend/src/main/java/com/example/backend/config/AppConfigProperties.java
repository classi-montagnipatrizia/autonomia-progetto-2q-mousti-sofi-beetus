package com.example.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Proprietà di configurazione dell'applicazione.
 * Valori configurabili tramite application.yml o variabili d'ambiente.
 */
@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppConfigProperties {

    /**
     * Numero massimo di studenti registrabili (escluso admin).
     * Default: 17
     * Variabile d'ambiente: APP_MAX_STUDENTS
     */
    private int maxStudents = 17;
}
