package com.simcop.service;

import com.simcop.model.OsintEvent;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.repository.OsintEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OsintService {

    @Autowired
    private OsintEventRepository osintEventRepository;

    @Autowired
    private GeminiService geminiService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<OsintEvent> getAllEvents() {
        return osintEventRepository.findAll();
    }

    public OsintEvent setVerified(String id, boolean verified) {
        OsintEvent event = osintEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        event.setVerified(verified);
        return osintEventRepository.save(event);
    }

    public int fetchAndProcessNews() {
        // Placeholder for real GDELT/NewsAPI fetch
        // For this implementation, we simulate fetching some raw news titles
        List<Map<String, String>> rawNews = fetchRawNews();
        int processedCount = 0;

        for (Map<String, String> news : rawNews) {
            if (osintEventRepository.findBySourceUrl(news.get("url")).isPresent()) {
                continue;
            }

            OsintEvent event = processNewsWithAI(news);
            if (event != null) {
                osintEventRepository.save(event);
                processedCount++;
            }
        }

        return processedCount;
    }

    private List<Map<String, String>> fetchRawNews() {
        // In a real scenario, this would call GDELT API or RSS feeds.
        // Returning 3 sample pieces of news that might be relevant
        List<Map<String, String>> sampleNews = new ArrayList<>();

        Map<String, String> n1 = new HashMap<>();
        n1.put("title", "Fuertes combates se registran en zona rural de Argelia, Cauca");
        n1.put("url", "https://ejemplo.com/noticia/1");
        n1.put("source", "Noticias Locales");
        sampleNews.add(n1);

        Map<String, String> n2 = new HashMap<>();
        n2.put("title", "Capturado presunto cabecilla de grupo armado en Tibú");
        n2.put("url", "https://ejemplo.com/noticia/2");
        n2.put("source", "Diario Regional");
        sampleNews.add(n2);

        Map<String, String> n3 = new HashMap<>();
        n3.put("title", "Ataque con explosivos contra patrulla en el Catatumbo");
        n3.put("url", "https://ejemplo.com/noticia/3");
        n3.put("source", "Alerta Nacional");
        sampleNews.add(n3);

        return sampleNews;
    }

    private OsintEvent processNewsWithAI(Map<String, String> news) {
        String prompt = "Analiza la siguiente noticia y determina si es un evento de seguridad (atentado, incursión, combate, captura, protesta violenta).\n"
                +
                "Noticia: " + news.get("title") + "\n" +
                "Responde en formato JSON con los siguientes campos:\n" +
                "- relevant (boolean): Si es un evento táctico/seguridad relevante.\n" +
                "- type (string): Tipo de evento (ATTACK, CLASH, ARREST, PROTEST, OTHER).\n" +
                "- locationName (string): Nombre del sitio o municipio.\n" +
                "- latitude (number): Latitud aproximada en Colombia.\n" +
                "- longitude (number): Longitud aproximada en Colombia.\n" +
                "- summary (string): Resumen breve de 1 frase.\n" +
                "- confidence (number): Confianza de 0 a 1.";

        String aiResponse = geminiService.generateContent(prompt);
        if (aiResponse == null)
            return null;

        try {
            // Remove markdown code blocks if present
            aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode result = objectMapper.readTree(aiResponse);

            if (!result.get("relevant").asBoolean())
                return null;

            OsintEvent event = new OsintEvent();
            event.setTitle(news.get("title"));
            event.setSourceUrl(news.get("url"));
            event.setSourceName(news.get("source"));
            event.setSummary(result.get("summary").asText());
            event.setLocationName(result.get("locationName").asText());
            event.setEventType(result.get("type").asText());
            event.setConfidenceScore(result.get("confidence").asDouble());

            GeoLocation loc = new GeoLocation();
            loc.setLat(result.get("latitude").asDouble());
            loc.setLon(result.get("longitude").asDouble());
            event.setLocation(loc);

            event.setEventTimestamp(LocalDateTime.now());
            event.setProcessedTimestamp(LocalDateTime.now());
            event.setVerified(false);

            return event;
        } catch (Exception e) {
            System.err.println("Error parsing AI response for OSINT: " + e.getMessage());
            return null;
        }
    }
}
