package com.simcop.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class AIQueueService {

    @Autowired
    private GeminiService geminiService;

    private final List<String> pendingTaskIds = Collections.synchronizedList(new ArrayList<>());
    private final Map<String, TaskInfo> tasks = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    public static class TaskInfo {
        public String taskId;
        public String prompt;
        public String status; // "QUEUED", "RUNNING", "COMPLETED", "FAILED"
        public String result;
        public String error;
        public int queuePosition;

        public TaskInfo(String taskId, String prompt) {
            this.taskId = taskId;
            this.prompt = prompt;
            this.status = "QUEUED";
        }
    }

    public TaskInfo submitTask(String prompt) {
        String taskId = UUID.randomUUID().toString();
        TaskInfo task = new TaskInfo(taskId, prompt);
        tasks.put(taskId, task);
        pendingTaskIds.add(taskId);

        // Submit to single-threaded executor for sequential processing
        executor.submit(() -> {
            TaskInfo currentTask = tasks.get(taskId);
            if (currentTask == null) return;

            currentTask.status = "RUNNING";
            pendingTaskIds.remove(taskId);

            try {
                System.out.println("🤖 [AIQueueService] Processing task: " + taskId);
                String result = geminiService.generateContent(currentTask.prompt);
                currentTask.result = result;
                currentTask.status = "COMPLETED";
                System.out.println("🤖 [AIQueueService] Task completed: " + taskId);
            } catch (Exception e) {
                System.err.println("🤖 [AIQueueService] Task failed: " + taskId + " - " + e.getMessage());
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
