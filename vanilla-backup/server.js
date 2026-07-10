const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

let PORT = 5000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = __dirname;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// MIME Types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  // CORS Headers for API calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // API 1: List all files in data/
  if (pathname === '/api/files') {
    fs.readdir(DATA_DIR, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read data directory' }));
        return;
      }
      // Filter only .txt files
      const txtFiles = files.filter(file => file.endsWith('.txt')).sort().reverse(); // Show newest files first
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(txtFiles));
    });
    return;
  }

  // API 2: Read contents of a specific file
  if (pathname === '/api/file') {
    const fileName = parsedUrl.query.name;
    if (!fileName) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing name parameter' }));
      return;
    }

    // Safety check to prevent path traversal
    if (!/^[a-zA-Z0-9_\.-]+$/.test(fileName)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid file name' }));
      return;
    }

    const filePath = path.join(DATA_DIR, fileName);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Serve static files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, pathname);
  
  // Safe static path verification (must be under PUBLIC_DIR)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Check if it is a directory
    if (fs.statSync(filePath).isDirectory()) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

function startServer(p) {
  server.listen(p, () => {
    PORT = p;
    console.log(`[EngFlow Server] Running at http://localhost:${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${p} is busy, trying ${p + 1}...`);
      startServer(p + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}
startServer(PORT);
