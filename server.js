import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log(`\n📊 DEBUG INFO:`);
console.log(`   Current directory: ${__dirname}`);
console.log(`   Dist path: ${distPath}`);
console.log(`   Index path: ${indexPath}`);
console.log(`   Dist exists: ${fs.existsSync(distPath)}`);
console.log(`   Index exists: ${fs.existsSync(indexPath)}`);
if (fs.existsSync(distPath)) {
  console.log(`   Dist contents:`, fs.readdirSync(distPath));
}
console.log('');

// Serve static files from dist folder
app.use(express.static(distPath, { maxAge: '1h' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA catch-all route - MUST be last
app.get('*', (req, res) => {
  console.log(`📍 SPA route requested: ${req.path}`);
  
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ CRITICAL: index.html not found at ${indexPath}`);
    return res.status(404).send('Error: index.html not found. Build may have failed.');
  }
  
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`❌ Error sending file:`, err.message);
      res.status(500).send('Error loading application');
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).send('Server error');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ BIOVAULT EXPRESS SERVER ONLINE`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 Server URL: https://biovault-app.onrender.com`);
  console.log(`🔧 Backend API: https://biovault-backend-d13a.onrender.com`);
  console.log(`📁 Static files: ${distPath}`);
  console.log(`🏥 Health check: /health`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
