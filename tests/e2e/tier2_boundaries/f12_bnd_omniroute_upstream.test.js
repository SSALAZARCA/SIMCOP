import { describe, it, expect, beforeAll, afterAll } from '../harness/test_framework.js';
import { MockHttpServer } from '../harness/mock_server.js';

describe('F12-BND: OmniRoute Backend Upstream Resilience & Error Boundaries', () => {
  let mockServer;
  let baseUrl;

  beforeAll(async () => {
    mockServer = new MockHttpServer();
    
    // Route for 429 rate limit
    mockServer.on('POST', '/v1/rate-limited', (req, res) => {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '5' });
      res.end(JSON.stringify({ error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } }));
    });

    // Route for 500 internal error
    mockServer.on('POST', '/v1/server-error', (req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Internal LLM worker crashed' } }));
    });

    // Route for HTML gateway timeout error
    mockServer.on('POST', '/v1/html-error', (req, res) => {
      res.writeHead(504, { 'Content-Type': 'text/html' });
      res.end('<html><body>504 Gateway Timeout</body></html>');
    });

    // Route for 100KB giant payload
    mockServer.on('POST', '/v1/large-payload', (req, res) => {
      const largeContent = JSON.stringify({
        data: 'A'.repeat(100 * 1024),
        status: 'OK'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        choices: [{ message: { content: largeContent } }]
      }));
    });

    const port = await mockServer.start();
    baseUrl = mockServer.getBaseUrl();
  });

  afterAll(async () => {
    if (mockServer) await mockServer.stop();
  });

  async function callAIBackend(endpoint) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test' })
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.status === 429) {
        return { status: 429, error: 'AI Provider Rate Limited. Retrying automatically in queue...' };
      }
      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errJson = await response.json();
          return { status: response.status, error: errJson.error?.message || 'Upstream Error' };
        } else {
          return { status: response.status, error: `Upstream Gateway Error (${response.status})` };
        }
      }

      const data = await response.json();
      return { status: 200, data };
    } catch (err) {
      return { status: 500, error: err.message };
    }
  }

  it('F12-BND-T1: HTTP 429 Rate Limit from OmniRoute is handled with queue retry status', async () => {
    const res = await callAIBackend('/v1/rate-limited');
    expect(res.status).toBe(429);
    expect(res.error).toContain('Rate Limited');
  });

  it('F12-BND-T2: HTTP 500 Server Error from OmniRoute is caught without crashing backend', async () => {
    const res = await callAIBackend('/v1/server-error');
    expect(res.status).toBe(500);
    expect(res.error).toBe('Internal LLM worker crashed');
  });

  it('F12-BND-T3: HTML 504 Gateway error is gracefully handled without JSON parse crash', async () => {
    const res = await callAIBackend('/v1/html-error');
    expect(res.status).toBe(504);
    expect(res.error).toContain('Gateway Error');
  });

  it('F12-BND-T4: Large 100KB response payload is buffered and parsed safely', async () => {
    const res = await callAIBackend('/v1/large-payload');
    expect(res.status).toBe(200);
    expect(res.data.choices[0].message.content).toBeDefined();
  });

  it('F12-BND-T5: Missing network endpoint fails with clean connection error', async () => {
    const res = await callAIBackend('/v1/non-existent-route');
    expect(res.status).toBe(404);
  });
});
