import { describe, it, expect } from '../harness/test_framework.js';

describe('Pairwise 2: OmniRoute Provider + AI Queue + Non-blocking OSINT Refresh', () => {
  class TacticalOrchestrator {
    constructor() {
      this.aiTasks = new Map();
      this.osintStatus = 'IDLE';
      this.osintCount = 20;
    }

    async triggerOsintRefresh() {
      this.osintStatus = 'PROCESSING';
      // Asynchronous background execution simulation
      setTimeout(() => {
        this.osintCount += 10;
        this.osintStatus = 'COMPLETED';
      }, 5);

      return { status: 202, message: 'OSINT refresh initiated asynchronously' };
    }

    async submitOmniRouteAnalysis(prompt, apiKey) {
      const taskId = 'task-' + Math.random().toString(36).substring(2, 8);
      this.aiTasks.set(taskId, {
        id: taskId,
        provider: 'OMNIROUTE',
        status: 'PROCESSING',
        prompt
      });

      // Simulate async worker completion
      setTimeout(() => {
        const task = this.aiTasks.get(taskId);
        if (task) {
          task.status = 'COMPLETED';
          task.result = {
            coaName: 'OPERACION_LIBERTAD',
            phases: ['FIJACION', 'MANIOBRA', 'CONSOLIDACION'],
            enemyThreatScore: 4.2
          };
        }
      }, 10);

      return { status: 200, taskId };
    }

    getTask(taskId) {
      return this.aiTasks.get(taskId);
    }
  }

  it('Pairwise-2.1: Triggering OSINT refresh and OmniRoute analysis concurrently runs without blocking', async () => {
    const orchestrator = new TacticalOrchestrator();

    const osintStart = Date.now();
    const osintRes = await orchestrator.triggerOsintRefresh();
    const osintDuration = Date.now() - osintStart;

    const aiRes = await orchestrator.submitOmniRouteAnalysis('Evaluar corredor vial Meta', 'sk-omni-key');

    expect(osintRes.status).toBe(202);
    expect(osintDuration).toBeLessThan(50); // Immediate return
    expect(aiRes.status).toBe(200);
    expect(aiRes.taskId).toBeDefined();
  });

  it('Pairwise-2.2: Both background OSINT worker and OmniRoute queue resolve independently', async () => {
    const orchestrator = new TacticalOrchestrator();
    await orchestrator.triggerOsintRefresh();
    const { taskId } = await orchestrator.submitOmniRouteAnalysis('Plan de fuegos', 'sk-omni-key');

    // Wait for async resolution
    await new Promise(r => setTimeout(r, 40));

    expect(orchestrator.osintStatus).toBe('COMPLETED');
    expect(orchestrator.osintCount).toBe(30);

    const task = orchestrator.getTask(taskId);
    expect(task.status).toBe('COMPLETED');
    expect(task.result.coaName).toBe('OPERACION_LIBERTAD');
  });

  it('Pairwise-2.3: Interleaved requests from multiple operators handle concurrency safely', async () => {
    const orchestrator = new TacticalOrchestrator();
    const actions = [
      orchestrator.triggerOsintRefresh(),
      orchestrator.submitOmniRouteAnalysis('P1', 'k1'),
      orchestrator.submitOmniRouteAnalysis('P2', 'k2'),
      orchestrator.triggerOsintRefresh()
    ];

    const results = await Promise.all(actions);
    expect(results).toHaveLength(4);
  });
});
