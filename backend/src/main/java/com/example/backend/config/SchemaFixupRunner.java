package com.example.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Rimuove CHECK constraint legacy generati da Hibernate sui campi enum @Enumerated(EnumType.STRING).
 *
 * Hibernate con ddl-auto=update crea i CHECK constraint UNA SOLA VOLTA alla creazione della
 * tabella, e NON li aggiorna quando l'enum viene esteso. Risultato: ogni nuovo valore enum
 * causa ConstraintViolationException all'insert finché il constraint non viene droppato.
 *
 * Qui droppiamo i constraint noti legacy. Una volta droppati, le entità con
 * columnDefinition = "VARCHAR(...)" non li ricreano, e l'enum string accetta qualsiasi
 * valore valido (la validazione resta lato JPA/Java).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class SchemaFixupRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        dropConstraintIfExists("notifications", "notifications_type_check");
    }

    private void dropConstraintIfExists(String table, String constraint) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint);
            log.info("Schema fixup: constraint {}.{} droppato (se esisteva)", table, constraint);
        } catch (Exception e) {
            log.warn("Schema fixup: drop constraint {}.{} fallito - {}", table, constraint, e.getMessage());
        }
    }
}
