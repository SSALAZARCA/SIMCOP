package com.simcop.service;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AIQueueService {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    @Qualifier("aiTaskExecutor")
    private ThreadPoolTaskExecutor executor;

    private static final Logger logger = LoggerFactory.getLogger(AIQueueService.class);

    private final List<String> pendingTaskIds = Collections.synchronizedList(new ArrayList<>());
    private final Map<String, TaskInfo> tasks = new ConcurrentHashMap<>();
    private static final int MAX_TASKS = 1000;
    private static final long TASK_TTL_MS = 30 * 60 * 1000L; // 30 min

    public static class TaskInfo {
        public String taskId;
        public String prompt;
        public String status; // "QUEUED", "RUNNING", "COMPLETED", "FAILED"
        public String result;
        public String error;
        public int queuePosition;
        public long createdAt = System.currentTimeMillis();

        public TaskInfo(String taskId, String prompt) {
            this.taskId = taskId;
            this.prompt = prompt;
            this.status = "QUEUED";
        }
    }

    private void cleanOldTasks() {
        long now = System.currentTimeMillis();
        // Remove tasks older than TTL unless still RUNNING
        tasks.entrySet().removeIf(entry -> (now - entry.getValue().createdAt > TASK_TTL_MS) && !"RUNNING".equals(entry.getValue().status));
        
        // If still exceeding MAX_TASKS, evict oldest completed/failed tasks
        if (tasks.size() > MAX_TASKS) {
            tasks.entrySet().stream()
                    .filter(e -> !"RUNNING".equals(e.getValue().status))
                    .sorted(Comparator.comparingLong(e -> e.getValue().createdAt))
                    .limit(tasks.size() - MAX_TASKS)
                    .forEach(e -> tasks.remove(e.getKey()));
        }
    }

    @PreDestroy
    public void shutdown() {
        logger.info("Shutting down AIQueueService...");
        tasks.clear();
        pendingTaskIds.clear();
    }

    public TaskInfo submitTask(String prompt) {
        cleanOldTasks();
        String taskId = UUID.randomUUID().toString();
        TaskInfo task = new TaskInfo(taskId, prompt);
        tasks.put(taskId, task);
        pendingTaskIds.add(taskId);

        // Submit to thread pool for concurrent processing
        executor.submit(() -> {
            TaskInfo currentTask = tasks.get(taskId);
            if (currentTask == null) return;

            currentTask.status = "RUNNING";
            pendingTaskIds.remove(taskId);

            try {
                logger.info("🤖 [AIQueueService] Processing task: {}", taskId);
                String result = geminiService.generateContent(currentTask.prompt);
                currentTask.result = result;
                currentTask.status = "COMPLETED";
                logger.info("🤖 [AIQueueService] Task completed: {}", taskId);
            } catch (Exception e) {
                logger.error("🤖 [AIQueueService] Task failed: {} - {}", taskId, e.getMessage());
                currentTask.error = e.getMessage();
                currentTask.status = "FAILED";
            }
        });

        // Update position before returning
        task.queuePosition = pendingTaskIds.indexOf(taskId) + 1;
        return task;
    }

    public TaskInfo getTaskStatus(String taskId) {
        TaskInfo task = tasks.get(taskId);
        if (task == null) {
            return null;
        }

        if ("QUEUED".equals(task.status)) {
            task.queuePosition = pendingTaskIds.indexOf(taskId) + 1;
        } else {
            task.queuePosition = 0;
        }

        return task;
    }
}
