const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

console.log('='.repeat(60));
console.log('🚀 BIOVAULT EXPRESS SERVER STARTING');
console.log('='.repeat(60));
console.log(`📂 __dirname: ${__dirname}`);
console.log(`📂 DIST_DIR: ${DIST_DIR}`);
console.log(`📄 INDEX_HTML: ${INDEX_HTML}`);
console.log(`✅ Dist exists: ${fs.existsSync(DIST_DIR)}`);
console.log(`✅ Index exists: ${fs.existsSync(INDEX_HTML)}`);
console.log('='.repeat(60));

// Serve static files
app.use(express.static(DIST_DIR, {
  maxAge: '1h',
  etag: false
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback - MUST BE LAST
app.get('*', (req, res) => {
  console.log(`↗️  Route: ${req.path}`);
  
  if (!fs.existsSync(INDEX_HTML)) {
    console.error(`❌ index.html missing at: ${INDEX_HTML}`);
    console.error(`📁 Dist contents:`, fs.readdirSync(DIST_DIR));
    return res.status(500).send('Build failed - index.html not found');
  }
  
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(INDEX_HTML);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('✅ SERVER READY');
  console.log(`🌍 https://biovault-app.onrender.com`);
  console.log(`🏥 Health: /health`);
  console.log('');
});
