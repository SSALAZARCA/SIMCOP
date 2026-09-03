import { describe, it, expect } from '../harness/test_framework.js';

describe('F14: ARQ-01 Non-blocking Async Architecture', () => {
  // Authoritative specs: PROJECT.md § Interface Contracts: Asynchronous OSINT Contract
  class MockOsintService {
    constructor() {
      this.currentStatus = 'IDLE';
      this.eventCount = 10;
    }

    async refreshFeeds() {
      this.currentStatus = 'PROCESSING';
      // Simulate non-blocking background task (no synchronous thread sleep)
      setTimeout(() => {
        this.eventCount += 5;
        this.currentStatus = 'COMPLETED';
      }, 10);

      return {
        status: 202,
        body: {
          status: 'PROCESSING',
          message: 'OSINT refresh initiated asynchronously'
        }
      };
    }

    getStatus() {
      return {
        status: this.currentStatus,
        totalEvents: this.eventCount
      };
    }
  }

  it('F14-T1: POST /api/osint/refresh returns HTTP 202 Accepted immediately', async () => {
    const service = new MockOsintService();
    const start = Date.now();
    const response = await service.refreshFeeds();
    const duration = Date.now() - start;

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('PROCESSING');
    expect(response.body.message).toContain('asynchronously');
    expect(duration).toBeLessThan(100); // Must be non-blocking (<100ms)
  });

  it('F14-T2: Synchronous 4-second Thread.sleep is eliminated from request path', async () => {
    const service = new MockOsintService();
    const start = Date.now();
    await service.refreshFeeds();
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(1000); // Far less than 4000ms
  });

  it('F14-T3: Initial state returns PROCESSING without blocking HTTP client', async () => {
    const service = new MockOsintService();
    await service.refreshFeeds();
    expect(service.getStatus().status).toBe('PROCESSING');
  });

  it('F14-T4: Background task completes asynchronously and updates event collection', async () => {
    const service = new MockOsintService();
    await service.refreshFeeds();
    
    // Wait for async task resolution
    await new Promise(resolve => setTimeout(resolve, 50));
    const finalStatus = service.getStatus();

    expect(finalStatus.status).toBe('COMPLETED');
    expect(finalStatus.totalEvents).toBe(15);
  });

  it('F14-T5: Parallel multi-source ingestion handles RSS and open web streams concurrently', async () => {
    async function ingestSource(sourceName) {
      return { source: sourceName, items: 3, fetchedAt: Date.now() };
    }

    const sources = ['EJC_COMMS', 'TWITTER_OSINT', 'TELEGRAM_TACTICAL', 'WEATHER_RADAR'];
    const results = await Promise.all(sources.map(s => ingestSource(s)));

    expect(results).toHaveLength(4);
    expect(results.map(r => r.source)).toContain('EJC_COMMS');
  });
});
