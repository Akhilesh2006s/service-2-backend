#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up Inkaranya Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env file from template...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please update the .env file with your actual configuration values.\n');
  } else {
    console.log('❌ env.example file not found. Please create a .env file manually.\n');
  }
} else {
  console.log('✅ .env file already exists.\n');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  console.log('Please run: npm install\n');
} else {
  console.log('✅ Dependencies are installed.\n');
}

// Display setup instructions
console.log('🎯 Setup Instructions:');
console.log('1. Update the .env file with your configuration:');
console.log('   - MongoDB URI (already provided)');
console.log('   - JWT secret (generate a strong secret)');
console.log('   - Cloudinary credentials (for file uploads)');
console.log('   - Frontend URL (if different from default)\n');

console.log('2. Install dependencies:');
console.log('   npm install\n');

console.log('3. Start the development server:');
console.log('   npm run dev\n');

console.log('4. The server will be available at: http://localhost:5000\n');

console.log('📚 API Documentation:');
console.log('   - Health check: GET /api/health');
console.log('   - Authentication: /api/auth');
console.log('   - Organizations: /api/organizations');
console.log('   - Employees: /api/employees');
console.log('   - Opportunities: /api/opportunities');
console.log('   - Applications: /api/applications');
console.log('   - Matching: /api/matching\n');

console.log('🔐 Default MongoDB URI is already configured in env.example');
console.log('   MONGO_URI=mongodb+srv://akhileshsamayamanthula:rxvIPIT4Bzobk9Ne@cluster0.4ej8ne2.mongodb.net/INKARANYA?retryWrites=true&w=majority&appName=Cluster0\n');

console.log('✨ Setup complete! Happy coding!');

