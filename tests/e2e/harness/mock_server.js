/**
 * SIMCOP In-Memory Mock Server
 * Simulates external and internal HTTP APIs for opaque-box integration and isolation testing.
 */

import http from 'http';

export class MockHttpServer {
  constructor(port = 0) {
    this.port = port;
    this.server = null;
    this.routes = [];
    this.history = [];
    this.actualPort = null;
  }

  on(method, pathPattern, handler) {
    this.routes.push({
      method: method.toUpperCase(),
      pathPattern: typeof pathPattern === 'string' ? new RegExp(`^${pathPattern}$`) : pathPattern,
      pathString: typeof pathPattern === 'string' ? pathPattern : pathPattern.toString(),
      handler
    });
    return this;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        let bodyStr = '';
        req.on('data', chunk => { bodyStr += chunk; });
        req.on('end', async () => {
          let parsedBody = null;
          try {
            parsedBody = bodyStr ? JSON.parse(bodyStr) : null;
          } catch {
            parsedBody = bodyStr;
          }

          const requestRecord = {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: parsedBody,
            rawBody: bodyStr,
            timestamp: Date.now()
          };
          this.history.push(requestRecord);

          const urlObj = new URL(req.url, `http://localhost:${this.actualPort}`);
          const pathname = urlObj.pathname;

          let matchedRoute = null;
          for (const route of this.routes) {
            if ((route.method === 'ALL' || route.method === req.method) && route.pathPattern.test(pathname)) {
              matchedRoute = route;
              break;
            }
          }

          if (matchedRoute) {
            try {
              await matchedRoute.handler(req, res, {
                body: parsedBody,
                rawBody: bodyStr,
                urlObj,
                query: Object.fromEntries(urlObj.searchParams.entries()),
                headers: req.headers
              });
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Internal Mock Server Error', details: err.message }));
            }
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Mock route not found: ${req.method} ${pathname}` }));
          }
        });
      });

      this.server.listen(this.port, () => {
        this.actualPort = this.server.address().port;
        resolve(this.actualPort);
      });
      this.server.on('error', reject);
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => resolve());
      });
    }
  }

  getBaseUrl() {
    return `http://localhost:${this.actualPort}`;
  }

  getLastRequest() {
    return this.history[this.history.length - 1];
  }

  clearHistory() {
    this.history = [];
  }
}
