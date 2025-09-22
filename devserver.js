// Simple development static server (no frameworks)
// Serves index.html and files under project root (dist, src assets)
// Usage: node devserver.js (PORT env optional, default 5173)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '5173', 10);
const ROOT = process.cwd();

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.map': 'application/json'
};

function safePath(requestUrl) {
    try {
        const urlPath = decodeURIComponent(requestUrl.split('?')[0]);
        let filePath = urlPath;
        if (filePath === '/' || filePath === '') filePath = '/index.html';
        // prevent directory traversal
        const resolved = path.join(ROOT, filePath);
        if (!resolved.startsWith(ROOT)) return null;
        return resolved;
    } catch (_) { return null; }
}

function send(res, status, body, headers = {}) {
    res.writeHead(status, Object.assign({'Content-Length': Buffer.byteLength(body)}, headers));
    res.end(body);
}

function serveFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return send(res, 404, 'Not Found');
            console.error('Read error:', err);
            return send(res, 500, 'Server Error');
        }
        const ext = path.extname(filePath).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {'Content-Type': type, 'Cache-Control': 'no-cache'});
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    if (!req.url) return send(res, 400, 'Bad Request');
    const filePath = safePath(req.url);
    if (!filePath) return send(res, 403, 'Forbidden');
    fs.stat(filePath, (err, stats) => {
        if (err) {
            // SPA style fallback to index.html for unknown paths
            if (path.extname(filePath) === '') return serveFile(res, path.join(ROOT, 'index.html'));
            return send(res, 404, 'Not Found');
        }
        if (stats.isDirectory()) {
            const idx = path.join(filePath, 'index.html');
            return fs.existsSync(idx) ? serveFile(res, idx) : send(res, 403, 'Forbidden');
        }
        serveFile(res, filePath);
    });
});

server.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
});
