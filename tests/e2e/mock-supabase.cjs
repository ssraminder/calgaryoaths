// Minimal Supabase auth/rest mock for tests/e2e/mobile-nav.cjs (port 54329).
// Minimal Supabase auth/rest mock for UI verification. Every request is "logged in vendor".
const http = require('http');
const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'vendor@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const send = (obj) => { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (req.url.startsWith('/auth/v1/user')) return send(user);
  if (req.url.startsWith('/rest/v1/co_profiles')) return send({ full_name: 'Raminder Shah', role: 'vendor' });
  return send([]);
}).listen(54329, '127.0.0.1', () => console.log('mock supabase on 54329'));
