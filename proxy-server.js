// Simple proxy server for local development
// This bypasses CORS issues when calling OpenRouteService API from localhost
// Also serves static files so everything runs on the same origin

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ3YzRjNGQ4ZDZhNzRhNGU5ZDdkMzY4OTg1ZGRlMzM0IiwiaCI6Im11cm11cjY0In0=';
const ORS_URL = 'https://api.openrouteservice.org/v2/isochrones/foot-walking';

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.csv': 'text/csv',
    '.kml': 'application/vnd.google-earth.kml+xml',
    '.geojson': 'application/geo+json'
};

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }

    // Handle API proxy requests
    const requestUrl = req.url.split('?')[0]; // Remove query string
    console.log(`📥 ${req.method} ${req.url} (parsed: ${requestUrl})`);
    
    if (req.method === 'POST' && requestUrl === '/api/isochrones') {
        console.log('✅ Handling isochrone API request');
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            console.log('📤 Forwarding to OpenRouteService:', ORS_URL);
            console.log('Request body:', body.substring(0, 200) + '...');
            // Forward request to OpenRouteService
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ORS_API_KEY,
                    'Accept': 'application/json, application/geo+json'
                }
            };
            
            const orsReq = https.request(ORS_URL, options, (orsRes) => {
                let data = '';
                
                orsRes.on('data', chunk => {
                    data += chunk.toString();
                });
                
                orsRes.on('end', () => {
                    console.log(`✅ ORS Response: ${orsRes.statusCode} ${orsRes.statusMessage}`);
                    // Set CORS headers
                    res.writeHead(orsRes.statusCode, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'POST, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Content-Type': 'application/json'
                    });
                    
                    res.end(data);
                });
            });
            
            orsReq.on('error', (error) => {
                console.error('Proxy error:', error);
                res.writeHead(500, {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({ error: error.message }));
            });
            
            orsReq.write(body);
            orsReq.end();
        });
        return;
    }
    
    // Serve static files (only if not API route)
    if (req.url.startsWith('/api/')) {
        console.log(`❌ API route not handled: ${req.url}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'The requested path could not be found' } }));
        return;
    }
    
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Local development server running on http://localhost:${PORT}`);
    console.log(`   Serving static files and proxying API requests`);
    console.log(`   API proxy: http://localhost:${PORT}/api/isochrones`);
    console.log(`   Open http://localhost:${PORT} in your browser`);
});

