package com.example.backend.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Blacklist in-memory per access token invalidati al logout.
 * I token vengono rimossi automaticamente alla loro scadenza naturale.
 */
@Service
public class TokenBlacklistService {

    private final Cache<String, Boolean> blacklist;

    public TokenBlacklistService(@Value("${jwt.access-token-expiration}") Long accessTokenExpirationMs) {
        this.blacklist = Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofMillis(accessTokenExpirationMs))
                .build();
    }

    public void blacklist(String token) {
        blacklist.put(token, Boolean.TRUE);
    }

    public boolean isBlacklisted(String token) {
        return blacklist.getIfPresent(token) != null;
    }
}
