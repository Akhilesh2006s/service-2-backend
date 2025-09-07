#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Database connection successful!');
    
    // Test basic operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in database`);
    
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function testEnvironmentVariables() {
  console.log('🔧 Testing environment variables...');
  
  const requiredVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'PORT'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('Please check your .env file');
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}

async function runTests() {
  console.log('🧪 Running setup tests...\n');
  
  const envTest = await testEnvironmentVariables();
  if (!envTest) {
    process.exit(1);
  }
  
  await testDatabaseConnection();
  
  console.log('\n🎉 All tests passed! Your backend is ready to run.');
  console.log('Run "npm run dev" to start the development server.');
}

runTests().catch(console.error);

