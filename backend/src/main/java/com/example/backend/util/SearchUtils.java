package com.example.backend.util;

public final class SearchUtils {

    private SearchUtils() {}

    /**
     * Escapa i caratteri speciali LIKE (%, _) nel termine di ricerca
     * per evitare wildcard injection nelle query JPQL.
     */
    public static String escapeLikeWildcards(String searchTerm) {
        if (searchTerm == null) return null;
        return searchTerm
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
