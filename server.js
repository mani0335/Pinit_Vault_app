import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from dist folder with caching
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1h',
  etag: false
}));

// SPA catch-all: Serve index.html for client-side routes
// This route must be LAST so static files take priority
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  
  console.log(`🔄 Request: ${req.path}`);
  
  // Check if index.html exists before serving
  if (fs.existsSync(indexPath)) {
    console.log(`✅ Serving index.html for SPA route: ${req.path}`);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`❌ Error serving index.html:`, err);
        res.status(500).send('Error loading application');
      }
    });
  } else {
    console.error(`❌ index.html NOT FOUND at: ${indexPath}`);
    console.error(`📁 Available files:`, fs.readdirSync(path.join(__dirname, 'dist')));
    res.status(500).send('Application files not found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ BIOVAULT EXPRESS SERVER STARTED`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 Backend: ${process.env.VITE_BACKEND_URL || 'https://biovault-backend-d13a.onrender.com'}`);
  console.log(`📁 Serving: ${path.join(__dirname, 'dist')}`);
  console.log(`🎯 All routes → index.html (React Router SPA)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
