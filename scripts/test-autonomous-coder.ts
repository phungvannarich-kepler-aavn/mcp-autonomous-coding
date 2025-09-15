#!/usr/bin/env ts-node

// scripts/test-autonomous-coder.ts
import { AutonomousCoder, CodeRequest } from './autonomous-coder';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAutonomousCoder() {
  console.log('🧪 Testing Autonomous Coder...');
  
  // Verify environment variables
  if (!process.env.MCP_GITHUB_TOKEN && !process.env.GITHUB_PERSONAL_ACCESS_TOKEN) {
    console.error('❌ Missing GitHub token in environment variables');
    process.exit(1);
  }
  
  const coder = new AutonomousCoder();
  
  // Test request
  const testRequest: CodeRequest = {
    repository: process.env.DEFAULT_REPO || 'phungvannarich-kepler-aavn/mcp-autonomous-coding',
    task: 'Create a simple hello world function in Python',
    priority: 'medium',
    requester: 'test-user'
  };
  
  try {
    console.log('🚀 Processing test request...');
    await coder.processRequest(testRequest);
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAutonomousCoder().catch(console.error);
}

export { testAutonomousCoder };
