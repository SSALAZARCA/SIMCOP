package com.simcop.service;

import com.simcop.model.OsintEvent;
import com.simcop.model.embeddable.GeoLocation;
import com.simcop.repository.OsintEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class OsintService {

    @Autowired
    private OsintEventRepository osintEventRepository;

    @Autowired
    private GeminiService geminiService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<OsintEvent> getAllEvents() {
        return osintEventRepository.findAll();
    }

    @org.springframework.transaction.annotation.Transactional
    public OsintEvent setVerified(@org.springframework.lang.NonNull String id, boolean verified) {
        OsintEvent event = osintEventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        event.setVerified(verified);
        return osintEventRepository.save(event);
    }

    public int fetchAndProcessNews() {
        // Eliminar noticias simuladas de ejecuciones anteriores (evitando locks de BD)
        List<OsintEvent> mockEvents = osintEventRepository.findAll().stream()
            .filter(e -> e.getSourceUrl() != null && e.getSourceUrl().contains("ejemplo.com"))
            .collect(java.util.stream.Collectors.toList());
        osintEventRepository.deleteAll(mockEvents);

        List<Map<String, String>> rawNews = fetchRawNews();
        int processedCount = 0;

        for (Map<String, String> news : rawNews) {
            if (osintEventRepository.findBySourceUrl(news.get("url")).isPresent()) {
                continue;
            }

            try {
                OsintEvent event = processNewsWithAI(news);
                if (event != null) {
                    osintEventRepository.save(event);
                    processedCount++;
                }
                // Sleep for 4 seconds to avoid hitting Gemini Free Tier rate limit (15 RPM)
                Thread.sleep(4000);
            } catch (Exception e) {
                System.err.println("Error processing news with AI (possibly API key missing): " + e.getMessage());
            }
        }

        return processedCount;
    }

    private List<Map<String, String>> fetchRawNews() {
        List<Map<String, String>> sampleNews = new ArrayList<>();
        String[][] feeds = {
            {"https://news.google.com/rss/search?q=Ejercito+Nacional+Colombia+OR+Fuerzas+Militares+Colombia&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Fuerzas Militares"},
            {"https://news.google.com/rss/search?q=Mindefensa+Colombia+OR+Fuerza+Aerea+Colombiana+OR+Armada+Nacional&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Mindefensa"},
            {"https://news.google.com/rss/search?q=FARC+OR+ELN+OR+Clan+del+Golfo+OR+Disidencias&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Grupos Armados"},
            {"https://news.google.com/rss/search?q=Combates+OR+Atentado+OR+Orden+Publico+Colombia&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Orden Público"},
            {"https://news.google.com/rss/search?q=Policia+Nacional+Colombia+OR+SIJIN+OR+CTI&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Policía y CTI"},
            {"https://news.google.com/rss/search?q=Captura+OR+Incautacion+OR+Narcotrafico+Colombia&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Narcotráfico"},
            {"https://news.google.com/rss/search?q=Masacre+OR+Homicidios+OR+Sicariato+Colombia&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Homicidios"},
            {"https://news.google.com/rss/search?q=Extorsion+OR+Secuestro+Colombia&hl=es-419&gl=CO&ceid=CO:es-419", "Google News - Secuestro y Extorsión"},
            {"https://www.eltiempo.com/rss/justicia.xml", "El Tiempo - Justicia"},
            {"https://www.eltiempo.com/rss/colombia.xml", "El Tiempo - Colombia"}
        };

        for (String[] feed : feeds) {
            try {
                java.net.URL url = new java.net.URL(feed[0]);
                javax.xml.parsers.DocumentBuilderFactory dbf = javax.xml.parsers.DocumentBuilderFactory.newInstance();
                javax.xml.parsers.DocumentBuilder db = dbf.newDocumentBuilder();
                org.w3c.dom.Document doc = db.parse(url.openStream());
                doc.getDocumentElement().normalize();

                org.w3c.dom.NodeList nList = doc.getElementsByTagName("item");

                // Fetch up to 5 news items per feed to avoid overloading Gemini API
                for (int temp = 0; temp < Math.min(5, nList.getLength()); temp++) {
                    org.w3c.dom.Node nNode = nList.item(temp);
                    if (nNode.getNodeType() == org.w3c.dom.Node.ELEMENT_NODE) {
                        org.w3c.dom.Element eElement = (org.w3c.dom.Element) nNode;
                        String title = eElement.getElementsByTagName("title").item(0).getTextContent();
                        String link = eElement.getElementsByTagName("link").item(0).getTextContent();
                        
                        Map<String, String> newsItem = new HashMap<>();
                        newsItem.put("title", title);
                        newsItem.put("url", link);
                        newsItem.put("source", feed[1]);
                        sampleNews.add(newsItem);
                    }
                }
            } catch (Exception e) {
                System.err.println("Error fetching RSS feed " + feed[1] + ": " + e.getMessage());
            }
        }

        return sampleNews;
    }

    private OsintEvent processNewsWithAI(Map<String, String> news) {
        String prompt = "Analiza la siguiente noticia y determina si es un evento de SEGURIDAD MILITAR o de ALTO IMPACTO (atentado terrorista, emboscada, combate, incursión guerrillera, neutralización o captura de cabecillas de grupos armados, ataque a infraestructura crítica, o alteración grave del orden público).\n"
                +
                "Noticia: " + news.get("title") + "\n" +
                "IMPORTANTE: IGNORA y marca como relevant: false cualquier noticia política, crímenes comunes, denuncias de corrupción, accidentes de tránsito, o capturas de bajo nivel. Solo importa la seguridad nacional y operaciones militares.\n"
                +
                "Responde en formato JSON con los siguientes campos (estructura exacta. REGLAS de salida):\n" +
                "- relevant (boolean): true SOLO si cumple con el criterio táctico/militar estricto.\n" +
                "- type (string): Tipo de evento (ATTACK, CLASH, ARREST, PROTEST, OTHER).\n" +
                "- locationName (string): Nombre del municipio o departamento.\n" +
                "- latitude (number): Latitud aproximada en Colombia. Si no es claro, usa 4.5.\n" +
                "- longitude (number): Longitud aproximada en Colombia. Si no es claro, usa -74.0.\n" +
                "- summary (string): Resumen muy breve.\n" +
                "- confidence (number): Confianza de 0 a 1.";

        String aiResponse = geminiService.generateContent(prompt);
        if (aiResponse == null)
            return null;

        try {
            // Remove markdown code blocks and extract JSON using substring between first {
            // and last }
            String cleanedAiResponse = aiResponse.trim();
            if (cleanedAiResponse.contains("{") && cleanedAiResponse.contains("}")) {
                cleanedAiResponse = cleanedAiResponse.substring(cleanedAiResponse.indexOf("{"),
                        cleanedAiResponse.lastIndexOf("}") + 1);
            }
            JsonNode result = objectMapper.readTree(cleanedAiResponse);

            if (!result.has("relevant") || !result.get("relevant").asBoolean()) {
                System.out.println("News marked as not relevant by AI: " + news.get("title"));
                return null;
            }

            OsintEvent event = new OsintEvent();
            event.setTitle(news.get("title"));
            event.setSourceUrl(news.get("url"));
            event.setSourceName(news.get("source"));
            event.setSummary(result.has("summary") ? result.get("summary").asText() : "No summary provided");
            event.setLocationName(result.has("locationName") ? result.get("locationName").asText() : "Unknown");
            event.setEventType(result.has("type") ? result.get("type").asText() : "OTHER");
            event.setConfidenceScore(result.has("confidence") ? result.get("confidence").asDouble() : 0.5);

            GeoLocation loc = new GeoLocation();
            
            double lat = result.has("latitude") && !result.get("latitude").isNull() ? result.get("latitude").asDouble() : 4.5708;
            double lon = result.has("longitude") && !result.get("longitude").isNull() ? result.get("longitude").asDouble() : -74.2973;
            
            // Si la IA devuelve literalmente 0.0 (Null Island), forzar a centro de Colombia
            if (lat == 0.0 && lon == 0.0) {
                lat = 4.5708;
                lon = -74.2973;
            }
            
            loc.setLat(lat);
            loc.setLon(lon);
            event.setLocation(loc);

            event.setEventTimestamp(LocalDateTime.now());
            event.setProcessedTimestamp(LocalDateTime.now());
            event.setVerified(false);

            System.out.println("Successfully processed OSINT event: " + event.getTitle());
            return event;
        } catch (Exception e) {
            System.err.println("Error parsing AI response for OSINT. Response was: " + aiResponse);
            System.err.println("Exception: " + e.getMessage());
            return null;
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public OsintEvent processExternalWebhook(String rawText) {
        try {
            java.util.regex.Pattern pResumen = java.util.regex.Pattern.compile("\\*\\*Resumen\\*\\*:\\s*(.*)");
            java.util.regex.Pattern pUbicacion = java.util.regex.Pattern.compile("\\*\\*Ubicaci.n\\*\\*:\\s*(.*)");
            java.util.regex.Pattern pCoordenadas = java.util.regex.Pattern.compile("\\*\\*Coordenadas\\*\\*:\\s*([\\-\\d\\.]+)[^\\-\\d\\.]+([\\-\\d\\.]+)");
            java.util.regex.Pattern pFuente = java.util.regex.Pattern.compile("\\*\\*Fuente\\*\\*:\\s*(.*)");
            java.util.regex.Pattern pClasificacion = java.util.regex.Pattern.compile("\\*\\*Clasificaci.n\\*\\*:\\s*(.*)");
            java.util.regex.Pattern pImpacto = java.util.regex.Pattern.compile("\\*\\*Nivel de Impacto\\*\\*:\\s*(.*)");

            java.util.regex.Matcher mResumen = pResumen.matcher(rawText);
            java.util.regex.Matcher mUbicacion = pUbicacion.matcher(rawText);
            java.util.regex.Matcher mCoordenadas = pCoordenadas.matcher(rawText);
            java.util.regex.Matcher mFuente = pFuente.matcher(rawText);
            java.util.regex.Matcher mClasificacion = pClasificacion.matcher(rawText);
            java.util.regex.Matcher mImpacto = pImpacto.matcher(rawText);

            OsintEvent event = new OsintEvent();
            event.setSummary(mResumen.find() ? mResumen.group(1).trim() : "Evento externo (Sin resumen)");
            event.setTitle(event.getSummary().length() > 50 ? event.getSummary().substring(0, 47) + "..." : event.getSummary());
            event.setLocationName(mUbicacion.find() ? mUbicacion.group(1).trim() : "Unknown");
            
            String rawFuente = mFuente.find() ? mFuente.group(1).trim() : "Agente Externo";
            event.setSourceName(rawFuente);
            event.setSourceUrl("Webhook");

            String typeStr = mClasificacion.find() ? mClasificacion.group(1).trim().toUpperCase() : "OTHER";
            if (typeStr.contains("ATAQUE") || typeStr.contains("ATTACK")) event.setEventType("ATTACK");
            else if (typeStr.contains("COMBATE") || typeStr.contains("CLASH")) event.setEventType("CLASH");
            else if (typeStr.contains("CAPTURA") || typeStr.contains("ARREST")) event.setEventType("ARREST");
            else if (typeStr.contains("PROTEST")) event.setEventType("PROTEST");
            else event.setEventType("OTHER");

            String impacto = mImpacto.find() ? mImpacto.group(1).trim().toUpperCase() : "MEDIO";
            double conf = 0.5;
            if (impacto.contains("CRÍTICO") || impacto.contains("CRITICO")) conf = 1.0;
            else if (impacto.contains("ALTO")) conf = 0.8;
            else if (impacto.contains("BAJO")) conf = 0.3;
            event.setConfidenceScore(conf);

            GeoLocation loc = new GeoLocation();
            if (mCoordenadas.find()) {
                loc.setLat(Double.parseDouble(mCoordenadas.group(1)));
                loc.setLon(Double.parseDouble(mCoordenadas.group(2)));
            } else {
                loc.setLat(4.5708);
                loc.setLon(-74.2973);
            }
            event.setLocation(loc);

            event.setEventTimestamp(LocalDateTime.now());
            event.setProcessedTimestamp(LocalDateTime.now());
            event.setVerified(false);

            return osintEventRepository.save(event);
        } catch (Exception e) {
            System.err.println("Error procesando Webhook Regex: " + e.getMessage());
            return null;
        }
    }
}
