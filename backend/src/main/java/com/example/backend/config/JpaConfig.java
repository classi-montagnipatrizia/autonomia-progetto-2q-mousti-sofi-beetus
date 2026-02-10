package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableJpaRepositories(basePackages = "com.example.backend.repositories")
@EnableJpaAuditing
@EnableTransactionManagement
public class JpaConfig {
    // Abilita @CreatedDate e @LastModifiedDate nelle entity
}