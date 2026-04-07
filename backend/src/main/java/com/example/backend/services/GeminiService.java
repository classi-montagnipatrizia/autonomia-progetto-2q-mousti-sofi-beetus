package com.example.backend.services;

import com.example.backend.dtos.response.AnalizzaLibroResponseDTO;
import com.example.backend.exception.InvalidInputException;
import com.example.backend.models.BookCondition;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash-lite}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    /**
     * Analizza le foto di un libro scolastico con Gemini Vision e restituisce
     * i dati pre-compilati per il form di inserimento annuncio.
     */
    @Transactional(readOnly = true)
    public AnalizzaLibroResponseDTO analizzaLibro(String frontImageUrl, String backImageUrl) {
        log.info("Analisi libro con Gemini Vision - front: {}", frontImageUrl);
        validateApiKey();

        List<Map<String, Object>> parts = new ArrayList<>();

        // Scarica e codifica immagine frontale (obbligatoria)
        byte[] frontBytes = downloadImage(frontImageUrl);
        parts.add(buildImagePart(frontBytes, detectMimeType(frontImageUrl)));

        // Immagine retro (opzionale)
        if (backImageUrl != null && !backImageUrl.isBlank()) {
            byte[] backBytes = downloadImage(backImageUrl);
            parts.add(buildImagePart(backBytes, detectMimeType(backImageUrl)));
        }

        parts.add(Map.of("text", buildBookAnalysisPrompt()));

        String responseText = callGemini(parts, true);
        return parseBookAnalysisResponse(responseText);
    }

    // Metodi privati — chiamata API

    @SuppressWarnings("unchecked")
    private String callGemini(List<Map<String, Object>> parts, boolean jsonMode) {
        String url = String.format(GEMINI_URL, model, apiKey);

        Map<String, Object> content = Map.of("parts", parts);

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("contents", List.of(content));
        if (jsonMode) {
            requestBody.put("generationConfig", Map.of(
                    "responseMimeType", "application/json",
                    "temperature", 0.1
            ));
        }

        try {
            Map<String, Object> response = restTemplate.postForObject(url, requestBody, Map.class);

            if (response == null) {
                throw new InvalidInputException("Risposta vuota dall'AI");
            }

            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) response.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                throw new InvalidInputException("Nessuna risposta generata dall'AI");
            }

            Map<String, Object> firstCandidate = candidates.get(0);
            Map<String, Object> responseContent = (Map<String, Object>) firstCandidate.get("content");
            List<Map<String, Object>> responseParts =
                    (List<Map<String, Object>>) responseContent.get("parts");

            return (String) responseParts.get(0).get("text");

        } catch (InvalidInputException e) {
            throw e;
        } catch (Exception e) {
            log.error("Errore chiamata Gemini API: {}", e.getMessage());
            throw new InvalidInputException("Errore durante la comunicazione con l'AI. Riprova tra qualche momento.");
        }
    }

    private byte[] downloadImage(String imageUrl) {
        try {
            return restTemplate.getForObject(imageUrl, byte[].class);
        } catch (Exception e) {
            log.error("Impossibile scaricare immagine da URL: {}", imageUrl);
            throw new InvalidInputException("Impossibile accedere all'immagine: " + imageUrl);
        }
    }

    private Map<String, Object> buildImagePart(byte[] imageBytes, String mimeType) {
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        return Map.of("inlineData", Map.of(
                "mimeType", mimeType,
                "data", base64
        ));
    }

    private String detectMimeType(String imageUrl) {
        String lower = imageUrl.toLowerCase();
        if (lower.contains(".png")) return "image/png";
        if (lower.contains(".webp")) return "image/webp";
        if (lower.contains(".gif")) return "image/gif";
        return "image/jpeg"; // default
    }

    // Metodi privati — prompt building

    private String buildBookAnalysisPrompt() {
        return """
                Sei un assistente specializzato nell'analisi di libri scolastici italiani.
                Analizza l'immagine del libro e rispondi SOLO con un oggetto JSON valido, senza markdown.

                Formato richiesto:
                {
                  "titolo": "titolo completo del libro",
                  "autore": "autore o autori separati da virgola",
                  "isbn": "codice ISBN se visibile, altrimenti null",
                  "materia": "una tra: Matematica, Fisica, Chimica, Italiano, Storia, Inglese, Francese, Tedesco, Spagnolo, Informatica, Filosofia, Arte, Scienze, Latino, Greco, Diritto, Economia, Altro",
                  "annoScolastico": "uno tra: 1° Anno, 2° Anno, 3° Anno, 4° Anno, 5° Anno",
                  "prezzo": 12.00,
                  "descrizione": "breve descrizione in max 150 caratteri",
                  "condizione": "uno tra: OTTIMO, BUONO, USATO"
                }

                Per il prezzo, stima un valore ragionevole per un libro scolastico usato (tra 5 e 40 euro).
                Per la condizione, valuta l'aspetto visivo dalla foto.
                Se non riesci a determinare un campo, usa null.
                """;
    }

    // Metodi privati — parsing risposte

    private AnalizzaLibroResponseDTO parseBookAnalysisResponse(String jsonText) {
        try {
            // Rimuovi eventuali backtick o tag markdown rimasti
            String cleaned = jsonText.trim()
                    .replaceAll("^```json\\s*", "")
                    .replaceAll("^```\\s*", "")
                    .replaceAll("```\\s*$", "")
                    .trim();

            Map<String, Object> data = objectMapper.readValue(cleaned, new TypeReference<>() {});

            return AnalizzaLibroResponseDTO.builder()
                    .titolo(getString(data, "titolo"))
                    .autore(getString(data, "autore"))
                    .isbn(getString(data, "isbn"))
                    .materia(getString(data, "materia"))
                    .annoScolastico(getString(data, "annoScolastico"))
                    .prezzo(getBigDecimal(data, "prezzo"))
                    .descrizione(getString(data, "descrizione"))
                    .condizione(parseCondizione(getString(data, "condizione")))
                    .build();

        } catch (Exception e) {
            log.error("Errore parsing risposta Gemini analisi libro: {}", e.getMessage());
            // Restituisce DTO vuoto: il frontend mostrerà i campi vuoti da compilare manualmente
            return new AnalizzaLibroResponseDTO();
        }
    }

    // Utility

    private void validateApiKey() {
        if (apiKey == null || apiKey.isBlank()) {
            log.error("GEMINI_API_KEY non configurata");
            throw new InvalidInputException("Il servizio AI non è configurato. Contatta l'amministratore.");
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null || "null".equals(val)) return null;
        return val.toString().trim();
    }

    private BigDecimal getBigDecimal(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val == null) return null;
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    private BookCondition parseCondizione(String value) {
        if (value == null) return null;
        try {
            return BookCondition.valueOf(value.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
