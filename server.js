import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist folder
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1h',
  etag: false
}));

// CRITICAL: Proxy API calls to backend
app.use('/share', (req, res, next) => {
  // If it's an API call, forward to backend
  if (req.path.startsWith('/api') || req.method !== 'GET') {
    const backendUrl = process.env.VITE_BACKEND_URL || 'https://biovault-backend-d13a.onrender.com';
    const targetUrl = `${backendUrl}${req.originalUrl}`;
    
    console.log(`Forwarding API call: ${req.originalUrl} → ${targetUrl}`);
    
    fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })
      .then(res => res.json())
      .then(data => res.json(data))
      .catch(err => res.status(500).json({ error: err.message }));
  } else {
    // Otherwise, serve index.html for client-side routing
    next();
  }
});

// SPA Catch-all: Serve index.html for all routes that don't match static files
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  // Check if file exists (for actual static files like favicon, etc)
  if (fs.existsSync(path.join(__dirname, 'dist', req.path))) {
    res.sendFile(path.join(__dirname, 'dist', req.path));
  } else {
    // Serve index.html for SPA routing
    console.log(`📍 SPA Route: ${req.path} → Serving index.html`);
    res.sendFile(indexPath);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 Backend: ${process.env.VITE_BACKEND_URL || 'https://biovault-backend-d13a.onrender.com'}`);
});
