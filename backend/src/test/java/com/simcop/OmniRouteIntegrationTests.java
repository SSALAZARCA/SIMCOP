package com.simcop;

import com.simcop.service.AIQueueService;
import com.simcop.service.ConfigurationService;
import com.simcop.service.GeminiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class OmniRouteIntegrationTests {

    @Test
    @DisplayName("F11/F12: stripReasoningTags removes standard <think> tags")
    void testStripStandardThinkTags() {
        String raw = "<think>\nAnalyzing sector Bravo and threat units...\n</think>\n{\"decision\": \"EXECUTE_PLAN\"}";
        String cleaned = GeminiService.stripReasoningTags(raw);
        assertEquals("{\"decision\": \"EXECUTE_PLAN\"}", cleaned);
    }

    @Test
    @DisplayName("F11/F12: stripReasoningTags removes nested and multiple reasoning tags")
    void testStripNestedAndMultipleTags() {
        String raw = "<think>Outer <think>Inner thoughts</think> still thinking</think>"
                + "<thought>Another step</thought>"
                + "<thinking>More reasoning</thinking>"
                + "<reasoning>Final check</reasoning>"
                + "{\"plan\": \"ASSAULT_NORTH\", \"confidence\": 0.95}";
        String cleaned = GeminiService.stripReasoningTags(raw);
        assertEquals("{\"plan\": \"ASSAULT_NORTH\", \"confidence\": 0.95}", cleaned);
    }

    @Test
    @DisplayName("F11/F12: stripReasoningTags handles unclosed and cut-off tags")
    void testStripUnclosedCutoffTags() {
        String raw = "<think>Model started thinking and got cut off by max token limit...";
        String cleaned = GeminiService.stripReasoningTags(raw);
        assertEquals("", cleaned);
    }

    @Test
    @DisplayName("F11/F12: stripReasoningTags handles empty tags")
    void testStripEmptyTags() {
        String raw = "<think></think><thought></thought>{\"coa\": \"COA_1\"}";
        String cleaned = GeminiService.stripReasoningTags(raw);
        assertEquals("{\"coa\": \"COA_1\"}", cleaned);
    }

    @Test
    @DisplayName("F12: GeminiService correctly routes to OmniRoute endpoint with Bearer auth and payload")
    void testOmniRouteRoutingBranch() {
        ConfigurationService configService = mock(ConfigurationService.class);
        when(configService.getAIProvider()).thenReturn("OMNIROUTE");
        when(configService.getLocalAIEndpoint()).thenReturn("https://api.omniroute.ai/v1");
        when(configService.getLocalAIModel()).thenReturn("omni-default");
        when(configService.getGeminiApiKey()).thenReturn(Optional.of("sk-omni-live-987654321"));

        RestTemplate restTemplate = mock(RestTemplate.class);

        GeminiService geminiService = new GeminiService();
        ReflectionTestUtils.setField(geminiService, "configService", configService);
        ReflectionTestUtils.setField(geminiService, "restTemplate", restTemplate);

        Map<String, Object> responseBody = new HashMap<>();
        Map<String, Object> choiceMessage = new HashMap<>();
        choiceMessage.put("role", "assistant");
        choiceMessage.put("content", "<think>Evaluating terrain</think>{\"tacticalAssessment\": \"SECTOR_SECURE\"}");
        Map<String, Object> choice = new HashMap<>();
        choice.put("message", choiceMessage);
        responseBody.put("choices", Collections.singletonList(choice));

        ResponseEntity<Map<String, Object>> mockResponse = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.exchange(
                eq("https://api.omniroute.ai/v1/chat/completions"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                any(ParameterizedTypeReference.class)
        )).thenReturn(mockResponse);

        String result = geminiService.generateContent("Analizar sector de operaciones");

        assertNotNull(result);
        assertEquals("{\"tacticalAssessment\": \"SECTOR_SECURE\"}", result);
        assertFalse(result.contains("<think>"), "Result must not contain reasoning tags");

        verify(restTemplate, times(1)).exchange(
                eq("https://api.omniroute.ai/v1/chat/completions"),
                eq(HttpMethod.POST),
                argThat((HttpEntity<?> entity) -> {
                    HttpHeaders headers = entity.getHeaders();
                    assertTrue(headers.getContentType().includes(MediaType.APPLICATION_JSON));
                    assertEquals("Bearer sk-omni-live-987654321", headers.getFirst(HttpHeaders.AUTHORIZATION));
                    Map<?, ?> body = (Map<?, ?>) entity.getBody();
                    assertNotNull(body);
                    assertEquals("omni-default", body.get("model"));
                    List<?> messages = (List<?>) body.get("messages");
                    assertNotNull(messages);
                    assertEquals(2, messages.size());
                    return true;
                }),
                any(ParameterizedTypeReference.class)
        );
    }

    @Test
    @DisplayName("F12: AIQueueService enqueues and completes OmniRoute task via ThreadPoolTaskExecutor")
    void testAIQueueServiceTaskExecution() throws Exception {
        GeminiService geminiService = mock(GeminiService.class);
        when(geminiService.generateContent(anyString())).thenReturn("{\"status\": \"ANALYSIS_COMPLETE\"}");

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("test-ai-");
        executor.initialize();

        AIQueueService queueService = new AIQueueService();
        ReflectionTestUtils.setField(queueService, "geminiService", geminiService);
        ReflectionTestUtils.setField(queueService, "executor", executor);

        AIQueueService.TaskInfo task = queueService.submitTask("Planificar maniobra de asalto");
        assertNotNull(task);
        assertNotNull(task.taskId);

        // Wait for executor to finish task
        long start = System.currentTimeMillis();
        AIQueueService.TaskInfo completedTask = null;
        while (System.currentTimeMillis() - start < 3000) {
            completedTask = queueService.getTaskStatus(task.taskId);
            if (completedTask != null && "COMPLETED".equals(completedTask.status)) {
                break;
            }
            Thread.sleep(50);
        }

        assertNotNull(completedTask);
        assertEquals("COMPLETED", completedTask.status);
        assertEquals("{\"status\": \"ANALYSIS_COMPLETE\"}", completedTask.result);
        assertNull(completedTask.error);

        executor.shutdown();
    }
}
