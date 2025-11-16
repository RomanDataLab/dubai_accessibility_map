// Build script to inject Vercel environment variables into index.html
// This script replaces placeholder values with actual environment variables at build time

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables
const cesiumToken = process.env.VITE_CESIUM_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZmVlY2ZkMC05NGVmLTQyMDAtYTg4OS1lMzJlNmE5OWIzOTQiLCJpZCI6MjUzODE2LCJpYXQiOjE3NjMxNDg5MDF9.Lx_sgH5AYLgtDEedYhONCEwItsyH0rDIIaKCd1tPFVU';
const orsApiKey = process.env.VITE_ORS_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImQ3YzRjNGQ4ZDZhNzRhNGU5ZDdkMzY4OTg1ZGRlMzM0IiwiaCI6Im11cm11cjY0In0=';

// Read index.html
const indexPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace environment variables in the script tag
html = html.replace(
    /VITE_CESIUM_TOKEN: '[^']*'/,
    `VITE_CESIUM_TOKEN: '${cesiumToken}'`
);
html = html.replace(
    /VITE_ORS_API_KEY: '[^']*'/,
    `VITE_ORS_API_KEY: '${orsApiKey}'`
);

// Write back
fs.writeFileSync(indexPath, html, 'utf8');

console.log('Environment variables injected into index.html');

