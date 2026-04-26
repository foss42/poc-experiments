import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import http from 'http';
import https from 'https';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'mcp-proxy',
      configureServer(server) {
        server.middlewares.use('/mcp-proxy', (req, res) => {
          // Parse target from query string
          const qs = req.url?.split('?')[1] || '';
          const params = new URLSearchParams(qs);
          const target = params.get('target');

          if (!target) {
            res.statusCode = 400;
            res.end('Missing ?target= query param');
            return;
          }

          // CORS preflight
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': '*',
            });
            res.end();
            return;
          }

          let url;
          try {
            url = new URL(target);
          } catch {
            res.statusCode = 400;
            res.end('Invalid target URL');
            return;
          }

          const isHttps = url.protocol === 'https:';
          const lib = isHttps ? https : http;

          // Strip the /mcp-proxy prefix, keep original path + search from target
          // Build a clean headers object — Node rejects undefined values
          const forwardHeaders = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (v !== undefined && k !== 'origin' && k !== 'referer') {
              forwardHeaders[k] = v;
            }
          }
          forwardHeaders['host'] = url.host;

          const proxyReq = lib.request(
            {
              hostname: url.hostname,
              port: url.port || (isHttps ? 443 : 80),
              path: url.pathname + url.search,
              method: req.method,
              headers: forwardHeaders,
            },
            (proxyRes) => {
              const headers = {
                ...proxyRes.headers,
                'access-control-allow-origin': '*',
                'access-control-allow-headers': '*',
              };
              res.writeHead(proxyRes.statusCode, headers);
              proxyRes.pipe(res);
            }
          );

          req.pipe(proxyReq);

          proxyReq.on('error', (err) => {
            if (!res.headersSent) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        });
      },
    },
  ],
});
