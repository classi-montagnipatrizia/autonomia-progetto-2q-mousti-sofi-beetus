package com.example.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Configurazione per l'esecuzione asincrona di task.
 * <p>
 * Questa configurazione abilita l'uso di @Async e configura un thread pool
 * dedicato per eseguire operazioni in background senza bloccare i thread HTTP.
 * <p>
 * Utilizzo principale:
 * - Invio notifiche in background
 * - Processing eventi (es. post creati)
 * - Operazioni non critiche che non devono bloccare la risposta HTTP
 */
@Configuration
@EnableAsync
@Slf4j
public class AsyncConfig implements AsyncConfigurer {

    /**
     * Configura l'executor per le operazioni asincrone.
     * <p>
     * Parametri del thread pool:
     * - Core pool size: 5 thread sempre attivi
     * - Max pool size: 10 thread massimi
     * - Queue capacity: 100 task in coda prima di rifiutare
     * <p>
     *
     */
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Thread pool configuration
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");

        // Shutdown configuration
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();

        log.info("Thread pool asincrono configurato: core={}, max={}, queue={}",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());

        return executor;
    }

    /**
     * Gestisce le eccezioni non catturate nei metodi @Async.
     * <p>
     * Le eccezioni nei thread asincroni non vengono propagate al chiamante,
     * quindi vengono gestite qui per evitare che vadano perse.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (throwable, method, params) -> {
            log.error("Eccezione non gestita in metodo asincrono: {}.{}",
                    method.getDeclaringClass().getSimpleName(),
                    method.getName(),
                    throwable);
            log.error("Parametri: {}", params);
        };
    }
}
