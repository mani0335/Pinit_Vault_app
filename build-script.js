#!/usr/bin/env node

console.log('🔧 Starting build process...');

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install --legacy-peer-deps --force', { stdio: 'inherit' });
  
  // Try to build
  console.log('🏗️ Building React app...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify build
  const distPath = path.join(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    console.log('✅ Build successful! dist/index.html exists');
    console.log('📂 Dist contents:', fs.readdirSync(distPath));
  } else {
    console.log('❌ Build failed - dist/index.html not found');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
