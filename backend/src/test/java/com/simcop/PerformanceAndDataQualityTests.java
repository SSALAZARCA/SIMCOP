package com.simcop;

import com.simcop.config.AsyncConfig;
import com.simcop.controller.MilitaryUnitController;
import com.simcop.controller.OsintController;
import com.simcop.controller.UserController;
import com.simcop.dto.SpotReportDTO;
import com.simcop.model.MilitaryUnit;
import com.simcop.model.User;
import com.simcop.model.embeddable.RoutePoint;
import com.simcop.repository.MilitaryUnitRepository;
import com.simcop.repository.UserRepository;
import com.simcop.service.AIQueueService;
import com.simcop.service.GeospatialCache;
import com.simcop.service.OsintService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;
import java.util.concurrent.Executor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class PerformanceAndDataQualityTests {

    @Test
    @DisplayName("F13: AsyncConfig declares taskExecutor and aiTaskExecutor with bounded queues and thread pools")
    void testAsyncConfigThreadExecutors() {
        AsyncConfig asyncConfig = new AsyncConfig();

        Executor taskExec = asyncConfig.taskExecutor();
        assertNotNull(taskExec);
        assertInstanceOf(ThreadPoolTaskExecutor.class, taskExec);
        ThreadPoolTaskExecutor taskExecutor = (ThreadPoolTaskExecutor) taskExec;
        assertEquals(4, taskExecutor.getCorePoolSize());
        assertEquals(8, taskExecutor.getMaxPoolSize());
        assertEquals(500, taskExecutor.getQueueCapacity());
        assertTrue(taskExecutor.getThreadNamePrefix().startsWith("simcop-async-"));
        taskExecutor.shutdown();

        ThreadPoolTaskExecutor aiExec = asyncConfig.aiTaskExecutor();
        assertNotNull(aiExec);
        assertEquals(4, aiExec.getCorePoolSize());
        assertEquals(8, aiExec.getMaxPoolSize());
        assertEquals(500, aiExec.getQueueCapacity());
        assertTrue(aiExec.getThreadNamePrefix().startsWith("simcop-ai-"));
        aiExec.shutdown();
    }

    @Test
    @DisplayName("F13: GeospatialCache bounds cache to 5000 items with LRU eviction")
    void testGeospatialCacheBounding() {
        GeospatialCache.clear();

        // Insert 5100 geocoding entries
        for (int i = 0; i < 5100; i++) {
            double lat = 4.0 + (i * 0.001);
            double lon = -74.0 - (i * 0.001);
            GeospatialCache.putGeocoding(lat, lon, "Location " + i);
        }

        // Insert 5100 elevation entries
        for (int i = 0; i < 5100; i++) {
            double lat = 4.0 + (i * 0.001);
            double lon = -74.0 - (i * 0.001);
            GeospatialCache.putElevation(lat, lon, 1000.0 + i);
        }

        // Oldest item (index 0) should be evicted
        assertNull(GeospatialCache.getGeocoding(4.0, -74.0), "Oldest entry should be evicted under LRU limit");
        assertNull(GeospatialCache.getElevation(4.0, -74.0), "Oldest elevation entry should be evicted under LRU limit");

        // Newest item should exist
        double lastLat = 4.0 + (5099 * 0.001);
        double lastLon = -74.0 - (5099 * 0.001);
        assertNotNull(GeospatialCache.getGeocoding(lastLat, lastLon));
        assertEquals(1000.0 + 5099, GeospatialCache.getElevation(lastLat, lastLon));

        GeospatialCache.clear();
    }

    @Test
    @DisplayName("F13: AIQueueService enforces MAX_TASKS limit and TTL eviction")
    void testAIQueueServiceBoundedMap() throws Exception {
        AIQueueService queueService = new AIQueueService();
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.initialize();
        ReflectionTestUtils.setField(queueService, "executor", executor);

        Map<String, AIQueueService.TaskInfo> tasksMap = new HashMap<>();
        // Populate 1050 completed tasks
        for (int i = 0; i < 1050; i++) {
            String tid = "task-" + i;
            AIQueueService.TaskInfo ti = new AIQueueService.TaskInfo(tid, "prompt " + i);
            ti.status = "COMPLETED";
            ti.createdAt = System.currentTimeMillis() - (1050 - i) * 1000L;
            tasksMap.put(tid, ti);
        }
        ReflectionTestUtils.setField(queueService, "tasks", tasksMap);

        // Invoke cleanOldTasks
        ReflectionTestUtils.invokeMethod(queueService, "cleanOldTasks");

        assertTrue(tasksMap.size() <= 1000, "tasks map must be bounded to MAX_TASKS (1000)");

        executor.shutdown();
    }

    @Test
    @DisplayName("F14: OsintController.refreshEvents triggers async processing and returns HTTP 202 Accepted")
    void testOsintControllerRefreshAsync() {
        OsintService osintService = mock(OsintService.class);
        OsintController controller = new OsintController();
        ReflectionTestUtils.setField(controller, "osintService", osintService);

        ResponseEntity<Map<String, Object>> response = controller.refreshEvents();

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("PROCESSING", response.getBody().get("status"));
        assertEquals("OSINT refresh initiated asynchronously", response.getBody().get("message"));

        verify(osintService, times(1)).fetchAndProcessNewsAsync();
    }

    @Test
    @DisplayName("F16: UserController.createUser returns HTTP 409 Conflict when username already exists")
    void testUserControllerDuplicateConflict() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        UserController userController = new UserController();

        ReflectionTestUtils.setField(userController, "repository", userRepository);
        ReflectionTestUtils.setField(userController, "passwordEncoder", passwordEncoder);

        when(userRepository.existsByUsername("duplicate.officer")).thenReturn(true);

        User duplicateUser = new User();
        duplicateUser.setUsername("duplicate.officer");
        duplicateUser.setHashedPassword("securePassword123!");

        ResponseEntity<?> response = userController.createUser(duplicateUser);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("F16: UserController.createUser rejects empty password with HTTP 400 Bad Request")
    void testUserControllerEmptyPassword() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        UserController userController = new UserController();

        ReflectionTestUtils.setField(userController, "repository", userRepository);
        ReflectionTestUtils.setField(userController, "passwordEncoder", passwordEncoder);

        when(userRepository.existsByUsername("new.officer")).thenReturn(false);

        User userWithoutPassword = new User();
        userWithoutPassword.setUsername("new.officer");
        userWithoutPassword.setHashedPassword(null);

        ResponseEntity<?> response = userController.createUser(userWithoutPassword);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("F17: MilitaryUnit.setRouteHistory prunes route points to 500 items FIFO")
    void testMilitaryUnitRouteHistoryLimit() {
        MilitaryUnit unit = new MilitaryUnit();
        List<RoutePoint> points = new ArrayList<>();

        for (int i = 0; i < 600; i++) {
            RoutePoint p = new RoutePoint();
            p.setLat(4.0 + (i * 0.001));
            p.setLon(-74.0 - (i * 0.001));
            p.setTimestamp((long) i);
            points.add(p);
        }

        unit.setRouteHistory(points);

        assertEquals(500, unit.getRouteHistory().size(), "Route history must be capped to maximum 500 points");
        // Check that the remaining points are the last 500 points (indices 100 to 599)
        assertEquals(100L, unit.getRouteHistory().get(0).getTimestamp(), "FIFO pruning must keep the most recent 500 points");
        assertEquals(599L, unit.getRouteHistory().get(499).getTimestamp());
    }

    @Test
    @DisplayName("F17: MilitaryUnitController.handleSpotReport caps route history to 500 points")
    void testMilitaryUnitControllerSpotReportPruning() {
        MilitaryUnitRepository repository = mock(MilitaryUnitRepository.class);
        MilitaryUnitController controller = new MilitaryUnitController();
        ReflectionTestUtils.setField(controller, "repository", repository);

        MilitaryUnit unit = new MilitaryUnit();
        unit.setId("unit-101");
        List<RoutePoint> initialPoints = new ArrayList<>();
        for (int i = 0; i < 500; i++) {
            RoutePoint p = new RoutePoint();
            p.setLat(4.0 + (i * 0.001));
            p.setLon(-74.0 - (i * 0.001));
            p.setTimestamp((long) i);
            initialPoints.add(p);
        }
        unit.setRouteHistory(initialPoints);

        when(repository.findById("unit-101")).thenReturn(Optional.of(unit));
        when(repository.save(any(MilitaryUnit.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SpotReportDTO report = new SpotReportDTO();
        report.setLat(4.999);
        report.setLon(-74.999);
        report.setTimestamp(1000L);

        ResponseEntity<MilitaryUnit> response = controller.handleSpotReport("unit-101", report);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getRouteHistory().size(), "Spot report must keep routeHistory bounded at 500 points");
        assertEquals(1000L, response.getBody().getRouteHistory().get(499).getTimestamp());
    }
}
