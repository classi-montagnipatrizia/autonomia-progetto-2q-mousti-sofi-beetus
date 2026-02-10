package com.example.backend.config;

import java.lang.annotation.*;

/**
 * Annotation per iniettare automaticamente l'utente autenticato nei controller.
 * <p>

 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUser {
}
