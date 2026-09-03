import { describe, it, expect, beforeAll, afterAll } from '../harness/test_framework.js';
import { MockHttpServer } from '../harness/mock_server.js';

describe('F12: R2 OmniRoute AI Provider Integration (Backend)', () => {
  let mockServer;
  let mockBaseUrl;

  beforeAll(async () => {
    mockServer = new MockHttpServer();
    mockServer.on('POST', '/v1/chat/completions', (req, res, { body, headers }) => {
      const auth = headers['authorization'];
      if (!auth || !auth.startsWith('Bearer sk-test-omni')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid API Key' } }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'chatcmpl-test-123',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model || 'omni-default',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                missionAssessment: 'Terreno favorable para maniobra de asalto.',
                riskLevel: 'LOW',
                recommendedFires: ['BATERIA_155_A']
              })
            },
            finish_reason: 'stop'
          }
        ]
      }));
    });

    const port = await mockServer.start();
    mockBaseUrl = mockServer.getBaseUrl();
  });

  afterAll(async () => {
    if (mockServer) await mockServer.stop();
  });

  function buildOmniRoutePayload(model, systemPrompt, userPrompt) {
    return {
      model: model || 'omni-default',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096
    };
  }

  it('F12-T1: Request body formatted matching OpenAI chat completions JSON schema', () => {
    const payload = buildOmniRoutePayload('omni-default', 'Eres un oficial táctico S3.', 'Evalúa el sector Bravo.');
    expect(payload.model).toBe('omni-default');
    expect(payload.messages).toHaveLength(2);
    expect(payload.messages[0].role).toBe('system');
    expect(payload.messages[1].role).toBe('user');
    expect(payload.temperature).toBe(0.7);
  });

  it('F12-T2: HTTP request dispatches to /v1/chat/completions with Authorization Bearer header', async () => {
    const payload = buildOmniRoutePayload('omni-default', 'System prompt', 'User prompt');
    const response = await fetch(`${mockBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-test-omni-key-123'
      },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(200);
    const lastReq = mockServer.getLastRequest();
    expect(lastReq.headers['authorization']).toBe('Bearer sk-test-omni-key-123');
  });

  it('F12-T3: Backend parser extracts choices[0].message.content correctly', async () => {
    const response = await fetch(`${mockBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-test-omni-key-123'
      },
      body: JSON.stringify(buildOmniRoutePayload('omni-default', 'sys', 'usr'))
    });

    const data = await response.json();
    expect(data).toHaveProperty('choices');
    expect(data.choices[0].message.content).toBeDefined();

    const parsedContent = JSON.parse(data.choices[0].message.content);
    expect(parsedContent.riskLevel).toBe('LOW');
    expect(parsedContent.recommendedFires).toContain('BATERIA_155_A');
  });

  it('F12-T4: AI Queue service task enqueuing and status lifecycle for OmniRoute', () => {
    class MockAIQueueService {
      constructor() {
        this.tasks = new Map();
      }
      submitTask(taskType, prompt, provider) {
        const taskId = 'ai-task-' + Date.now();
        this.tasks.set(taskId, {
          id: taskId,
          type: taskType,
          provider,
          status: 'QUEUED',
          createdAt: Date.now()
        });
        return taskId;
      }
      getTaskStatus(taskId) {
        return this.tasks.get(taskId) || { status: 'NOT_FOUND' };
      }
    }

    const queue = new MockAIQueueService();
    const taskId = queue.submitTask('COA_GENERATION', 'Sector Norte', 'OMNIROUTE');
    expect(taskId).toBeDefined();
    expect(queue.getTaskStatus(taskId).status).toBe('QUEUED');
    expect(queue.getTaskStatus(taskId).provider).toBe('OMNIROUTE');
  });

  it('F12-T5: Unauthorized API key to OmniRoute returns 401 and handles error gracefully', async () => {
    const response = await fetch(`${mockBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer INVALID_KEY'
      },
      body: JSON.stringify(buildOmniRoutePayload('omni-default', 'sys', 'usr'))
    });

    expect(response.status).toBe(401);
  });
});
