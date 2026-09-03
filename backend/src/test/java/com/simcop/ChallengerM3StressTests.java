package com.simcop;

import com.simcop.config.AsyncConfig;
import com.simcop.controller.MilitaryUnitController;
import com.simcop.controller.OsintController;
import com.simcop.controller.UserController;
import com.simcop.dto.SpotReportDTO;
import com.simcop.model.MilitaryUnit;
import com.simcop.model.User;
import com.simcop.model.embeddable.GeoLocation;
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
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Challenger M3 Empirical Stress & Verification Test Suite.
 * Adversarially verifies:
 * - Route history pruning (>500 points, 1000 points, 2000 points FIFO ordering).
 * - User uniqueness validation & 409 Conflict.
 * - OSINT non-blocking 202 Accepted response.
 * - LRU cache bounding (>5000 items, up to 10000 items).
 * - Thread pool & task queue concurrency bounding.
 */
public class ChallengerM3StressTests {

    @Test
    @DisplayName("STRESS-F17: Route history pruning with 1,000 and 2,000 points retains exactly latest 500 points in FIFO order")
    void testRouteHistoryPruningLargeInputFifoOrder() {
        MilitaryUnit unit = new MilitaryUnit();

        // 1. Submit 1000 points
        List<RoutePoint> points1000 = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            RoutePoint p = new RoutePoint();
            p.setLat(1.0 + (i * 0.001));
            p.setLon(-75.0 - (i * 0.001));
            p.setTimestamp((long) (10000 + i));
            points1000.add(p);
        }

        unit.setRouteHistory(points1000);
        assertEquals(500, unit.getRouteHistory().size(), "Route history must be capped at exactly 500 points");
        assertEquals(10500L, unit.getRouteHistory().get(0).getTimestamp(), "FIFO head must be element index 500");
        assertEquals(10999L, unit.getRouteHistory().get(499).getTimestamp(), "FIFO tail must be element index 999");
        assertEquals(1.0 + (500 * 0.001), unit.getRouteHistory().get(0).getLat(), 0.0001);
        assertEquals(1.0 + (999 * 0.001), unit.getRouteHistory().get(499).getLat(), 0.0001);

        // 2. Submit 2000 points
        List<RoutePoint> points2000 = new ArrayList<>();
        for (int i = 0; i < 2000; i++) {
            RoutePoint p = new RoutePoint();
            p.setLat(2.0 + (i * 0.001));
            p.setLon(-76.0 - (i * 0.001));
            p.setTimestamp((long) (20000 + i));
            points2000.add(p);
        }

        unit.setRouteHistory(points2000);
        assertEquals(500, unit.getRouteHistory().size(), "Route history must remain capped at exactly 500 points");
        assertEquals(21500L, unit.getRouteHistory().get(0).getTimestamp(), "FIFO head must be element index 1500");
        assertEquals(21999L, unit.getRouteHistory().get(499).getTimestamp(), "FIFO tail must be element index 1999");

        // 3. Incremental spot reporting over the 500 cap
        MilitaryUnitRepository repository = mock(MilitaryUnitRepository.class);
        MilitaryUnitController controller = new MilitaryUnitController();
        ReflectionTestUtils.setField(controller, "repository", repository);

        when(repository.findById("unit-stress")).thenReturn(Optional.of(unit));
        when(repository.save(any(MilitaryUnit.class))).thenAnswer(inv -> inv.getArgument(0));

        // Submit 50 consecutive spot reports
        for (int i = 0; i < 50; i++) {
            SpotReportDTO spot = new SpotReportDTO();
            spot.setLat(5.0 + (i * 0.01));
            spot.setLon(-74.0 - (i * 0.01));
            spot.setTimestamp((long) (30000 + i));

            ResponseEntity<MilitaryUnit> res = controller.handleSpotReport("unit-stress", spot);
            assertEquals(HttpStatus.OK, res.getStatusCode());
            assertEquals(500, res.getBody().getRouteHistory().size(), "Continuous spot ingestion must maintain 500 cap");
        }

        // Check newest point is the 50th spot report (timestamp 30049)
        assertEquals(30049L, unit.getRouteHistory().get(499).getTimestamp());
        // Head shifted by 50 points (21500 + 50 = 21550)
        assertEquals(21550L, unit.getRouteHistory().get(0).getTimestamp());
    }

    @Test
    @DisplayName("STRESS-F16: User uniqueness pre-validation returns HTTP 409 Conflict with structured error body")
    void testUserUniquenessConflictAndValidation() {
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        UserController userController = new UserController();

        ReflectionTestUtils.setField(userController, "repository", userRepository);
        ReflectionTestUtils.setField(userController, "passwordEncoder", passwordEncoder);

        when(userRepository.existsByUsername("santiago.salazar")).thenReturn(true);
        when(userRepository.existsByUsername("coronel.ramirez")).thenReturn(false);
        when(passwordEncoder.encode("SecretPass123!")).thenReturn("$2a$10$encodedHashSample");

        // 1. Duplicate creation attempt
        User duplicate = new User();
        duplicate.setUsername("santiago.salazar");
        duplicate.setHashedPassword("NewPass123!");

        ResponseEntity<?> responseDuplicate = userController.createUser(duplicate);
        assertEquals(HttpStatus.CONFLICT, responseDuplicate.getStatusCode());
        assertNotNull(responseDuplicate.getBody());
        assertTrue(responseDuplicate.getBody() instanceof Map);
        Map<?, ?> body = (Map<?, ?>) responseDuplicate.getBody();
        assertEquals("Username already exists", body.get("error"));
        verify(userRepository, never()).save(duplicate);

        // 2. Missing password validation
        User missingPass = new User();
        missingPass.setUsername("coronel.ramirez");
        missingPass.setHashedPassword("");

        ResponseEntity<?> responseMissingPass = userController.createUser(missingPass);
        assertEquals(HttpStatus.BAD_REQUEST, responseMissingPass.getStatusCode());
        Map<?, ?> passBody = (Map<?, ?>) responseMissingPass.getBody();
        assertEquals("Password cannot be empty", passBody.get("error"));

        // 3. Missing username validation
        User missingUser = new User();
        missingUser.setUsername("   ");
        missingUser.setHashedPassword("ValidPass123!");

        ResponseEntity<?> responseMissingUser = userController.createUser(missingUser);
        assertEquals(HttpStatus.BAD_REQUEST, responseMissingUser.getStatusCode());
        Map<?, ?> userBody = (Map<?, ?>) responseMissingUser.getBody();
        assertEquals("Username cannot be empty", userBody.get("error"));

        // 4. Valid unique user creation
        User validUser = new User();
        validUser.setUsername("  coronel.ramirez  ");
        validUser.setHashedPassword("SecretPass123!");

        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        ResponseEntity<?> responseSuccess = userController.createUser(validUser);
        assertEquals(HttpStatus.OK, responseSuccess.getStatusCode());
        User created = (User) responseSuccess.getBody();
        assertEquals("coronel.ramirez", created.getUsername(), "Username must be trimmed");
        assertEquals("$2a$10$encodedHashSample", created.getHashedPassword());
    }

    @Test
    @DisplayName("STRESS-F14: OSINT non-blocking refresh returns HTTP 202 Accepted within milliseconds")
    void testOsintNonBlockingRefresh() {
        OsintService osintService = mock(OsintService.class);
        OsintController controller = new OsintController();
        ReflectionTestUtils.setField(controller, "osintService", osintService);

        long start = System.nanoTime();
        ResponseEntity<Map<String, Object>> response = controller.refreshEvents();
        long durationMs = (System.nanoTime() - start) / 1_000_000;

        assertEquals(HttpStatus.ACCEPTED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("PROCESSING", response.getBody().get("status"));
        assertEquals("OSINT refresh initiated asynchronously", response.getBody().get("message"));
        assertTrue(durationMs < 200, "Controller response must be non-blocking and return in <200ms");

        verify(osintService, times(1)).fetchAndProcessNewsAsync();
    }

    @Test
    @DisplayName("STRESS-F13: GeospatialCache strictly bounds cache size to 5,000 when 10,000 items are inserted")
    void testGeospatialCacheLruBoundingOver5000Items() {
        GeospatialCache.clear();

        // 1. Insert 10,000 items in geocoding and elevation
        for (int i = 0; i < 10000; i++) {
            double lat = 1.0 + (i * 0.001);
            double lon = -70.0 - (i * 0.001);
            GeospatialCache.putGeocoding(lat, lon, "Location-" + i);
            GeospatialCache.putElevation(lat, lon, (double) i);
        }

        // 2. Verify earliest 5,000 items (indices 0..4999) are evicted
        assertNull(GeospatialCache.getGeocoding(1.0, -70.0), "Index 0 must be evicted");
        assertNull(GeospatialCache.getElevation(1.0, -70.0), "Index 0 elevation must be evicted");
        assertNull(GeospatialCache.getGeocoding(1.0 + (4999 * 0.001), -70.0 - (4999 * 0.001)), "Index 4999 must be evicted");

        // 3. Verify newest 5,000 items (indices 5000..9999) exist
        double lat5000 = 1.0 + (5000 * 0.001);
        double lon5000 = -70.0 - (5000 * 0.001);
        assertNotNull(GeospatialCache.getGeocoding(lat5000, lon5000), "Index 5000 must be retained");
        assertEquals(5000.0, GeospatialCache.getElevation(lat5000, lon5000));

        double lat9999 = 1.0 + (9999 * 0.001);
        double lon9999 = -70.0 - (9999 * 0.001);
        assertEquals("Location-9999", GeospatialCache.getGeocoding(lat9999, lon9999));
        assertEquals(9999.0, GeospatialCache.getElevation(lat9999, lon9999));

        GeospatialCache.clear();
    }

    @Test
    @DisplayName("STRESS-F13: AIQueueService enforces MAX_TASKS (1000) bounding and TTL eviction for 2,000 tasks")
    void testAIQueueServiceTtlAndCapacityBounding() {
        AIQueueService queueService = new AIQueueService();
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.initialize();
        ReflectionTestUtils.setField(queueService, "executor", executor);

        Map<String, AIQueueService.TaskInfo> tasksMap = new ConcurrentHashMap<>();
        long now = System.currentTimeMillis();

        // 1. Populate 2,000 completed tasks: 500 expired (>30m old) and 1500 recent
        for (int i = 0; i < 2000; i++) {
            String tid = "stress-task-" + i;
            AIQueueService.TaskInfo ti = new AIQueueService.TaskInfo(tid, "Tactical Prompt " + i);
            ti.status = "COMPLETED";
            if (i < 500) {
                ti.createdAt = now - (35 * 60 * 1000L); // 35 min old (expired)
            } else {
                ti.createdAt = now - (2000 - i) * 1000L; // within 30 min
            }
            tasksMap.put(tid, ti);
        }
        ReflectionTestUtils.setField(queueService, "tasks", tasksMap);

        // 2. Invoke cleanOldTasks
        ReflectionTestUtils.invokeMethod(queueService, "cleanOldTasks");

        // 3. Verify size is <= 1000
        assertTrue(tasksMap.size() <= 1000, "tasks map must be bounded to MAX_TASKS (1000)");

        // 4. Verify none of the expired tasks remain
        for (int i = 0; i < 500; i++) {
            assertFalse(tasksMap.containsKey("stress-task-" + i), "Expired task stress-task-" + i + " must be purged");
        }

        executor.shutdown();
    }
}
