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
 *
 * Gestisce anche migration una-tantum dello schema (es. refresh_tokens da BCrypt a SHA-256).
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
        dropConstraintIfExists("admin_audit_logs", "admin_audit_logs_azione_check");
        migrateRefreshTokensToSha256();
    }

    private void dropConstraintIfExists(String table, String constraint) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + constraint);
            log.info("Schema fixup: constraint {}.{} droppato (se esisteva)", table, constraint);
        } catch (Exception e) {
            log.warn("Schema fixup: drop constraint {}.{} fallito - {}", table, constraint, e.getMessage());
        }
    }

    /**
     * Migration una-tantum: rimuove la vecchia colonna `token` (BCrypt) dalla tabella
     * refresh_tokens. Il nuovo schema usa `token_hash` (SHA-256) con UNIQUE INDEX per
     * lookup O(1). Idempotente: se la colonna `token` non esiste, non fa nulla.
     *
     * I refresh token esistenti vengono invalidati (TRUNCATE) perché BCrypt non è
     * reversibile e non possiamo migrare gli hash. Gli utenti dovranno rifare login
     * una volta dopo il deploy.
     */
    private void migrateRefreshTokensToSha256() {
        try {
            Boolean oldColumnExists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns " +
                "WHERE table_name = 'refresh_tokens' AND column_name = 'token')",
                Boolean.class
            );
            if (!Boolean.TRUE.equals(oldColumnExists)) {
                return; // Migration già applicata o tabella fresca
            }

            // BCrypt non è reversibile: invalidiamo tutti i token esistenti.
            // Gli utenti rifaranno login una volta.
            jdbcTemplate.execute("TRUNCATE TABLE refresh_tokens");
            jdbcTemplate.execute("ALTER TABLE refresh_tokens DROP COLUMN token");
            log.info("Schema fixup: refresh_tokens migrato da BCrypt a SHA-256 (token droppato, tabella svuotata)");
        } catch (Exception e) {
            log.warn("Schema fixup: migration refresh_tokens fallita - {}", e.getMessage());
        }
    }
}
