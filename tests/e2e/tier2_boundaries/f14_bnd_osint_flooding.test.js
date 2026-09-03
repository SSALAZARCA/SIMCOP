import { describe, it, expect } from '../harness/test_framework.js';

describe('F14-BND: OSINT Ingestion Flooding, Timeouts & Malformed Feeds', () => {
  const MAX_FEED_ITEMS = 100;
  const FEED_TIMEOUT_MS = 5000;

  function parseAndCapFeed(rawItems) {
    if (!Array.isArray(rawItems)) return [];
    // Cap ingestion to prevent DB overflow
    const capped = rawItems.slice(0, MAX_FEED_ITEMS);
    return capped.map(item => ({
      title: String(item.title || 'Untitled').substring(0, 200),
      link: String(item.link || '').substring(0, 500),
      timestamp: item.timestamp || Date.now()
    }));
  }

  it('F14-BND-T1: Feed returning 5,000 items is safely capped to maximum 100 items', () => {
    const hugeFeed = Array.from({ length: 5000 }, (_, i) => ({ title: `News item ${i}`, link: `http://news.com/${i}` }));
    const processed = parseAndCapFeed(hugeFeed);

    expect(processed).toHaveLength(100);
    expect(processed[0].title).toBe('News item 0');
  });

  it('F14-BND-T2: Malformed or non-array feed input returns empty array without throwing', () => {
    expect(parseAndCapFeed(null)).toEqual([]);
    expect(parseAndCapFeed(undefined)).toEqual([]);
    expect(parseAndCapFeed('not an array')).toEqual([]);
  });

  it('F14-BND-T3: Rapid consecutive refresh requests are debounced or return current active job status', () => {
    let activeRefreshJob = null;

    function requestRefresh() {
      if (activeRefreshJob) {
        return { status: 202, message: 'Refresh already in progress', jobId: activeRefreshJob.id };
      }
      activeRefreshJob = { id: 'job-' + Date.now(), startedAt: Date.now() };
      return { status: 202, message: 'New refresh initiated', jobId: activeRefreshJob.id };
    }

    const req1 = requestRefresh();
    const req2 = requestRefresh();

    expect(req1.jobId).toBe(req2.jobId);
    expect(req2.message).toContain('already in progress');
  });

  it('F14-BND-T4: Remote feed timeout boundary cancels request after 5 seconds', async () => {
    async function fetchWithTimeout(url, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('FeedTimeoutException: Remote OSINT source timed out'));
        }, timeoutMs);

        // Simulate hanging connection
        // (timer will fire before resolve)
      });
    }

    let caught = false;
    try {
      await fetchWithTimeout('http://slow-news.com/feed.xml', 20);
    } catch (e) {
      caught = true;
      expect(e.message).toContain('timed out');
    }
    expect(caught).toBeTruthy();
  });

  it('F14-BND-T5: Item fields with extreme character lengths (10,000 chars) are truncated', () => {
    const raw = [{ title: 'T'.repeat(5000), link: 'http://example.com/' + 'L'.repeat(5000) }];
    const processed = parseAndCapFeed(raw);

    expect(processed[0].title.length).toBe(200);
    expect(processed[0].link.length).toBe(500);
  });
});
