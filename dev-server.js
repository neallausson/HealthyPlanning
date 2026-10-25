// Serveur de développement local : sert /public et route /api/* vers les fonctions de /api,
// comme le fait Vercel. Usage : npm run dev
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');

function loadEnv(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv('.env.local');
loadEnv('.env');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/\/$/, '');
    const file = path.join(root, 'api', `${name}.js`);
    if (!/^[a-z-]+$/.test(name) || !fs.existsSync(file)) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    const mod = await import(pathToFileURL(file).href);
    return mod.default(req, res);
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(publicDir, path.normalize(rel));
  if (!file.startsWith(publicDir)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Healthy Planning → http://localhost:${port}`);
  if (!process.env.APP_PASSWORD) console.warn('⚠ APP_PASSWORD absent : crée un fichier .env.local (voir .env.example)');
});
