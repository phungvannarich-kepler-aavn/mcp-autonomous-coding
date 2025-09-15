import { CursorAgentService } from './cursor-agent-service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testCursorAPI() {
  console.log('🧪 Testing Cursor Background Agent API Integration...');
  
  try {
    // Initialize the service
    const cursorService = new CursorAgentService();
    
    // Test 1: API Connection
    console.log('\n📡 Test 1: API Connection');
    const isConnected = await cursorService.testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to Cursor API');
      console.log('💡 Make sure CURSOR_API_KEY is set in your environment');
      return;
    }
    
    console.log('✅ API connection successful');
    
    // Test 2: List existing agents
    console.log('\n📋 Test 2: List Existing Agents');
    const existingAgents = await cursorService.listAgents(5);
    console.log(`📊 Found ${existingAgents.length} existing agents`);
    
    if (existingAgents.length > 0) {
      console.log('Recent agents:');
      existingAgents.forEach((agent, index) => {
        console.log(`  ${index + 1}. ${agent.agentId} - Status: ${agent.status}`);
        if (agent.message) console.log(`     Message: ${agent.message}`);
      });
    }
    
    // Test 3: Get usage stats
    console.log('\n📈 Test 3: Usage Statistics');
    const usageStats = await cursorService.getUsageStats();
    if (usageStats) {
      console.log('📊 Usage Stats:', JSON.stringify(usageStats, null, 2));
    } else {
      console.log('📊 No usage stats available');
    }
    
    // Test 4: Create a test agent (optional)
    const shouldCreateTestAgent = process.env.CREATE_TEST_AGENT === 'true';
    
    if (shouldCreateTestAgent) {
      console.log('\n🤖 Test 4: Create Test Agent');
      
      const testRequest = {
        task: 'Create a simple hello world function in Python with proper documentation',
        repository: process.env.DEFAULT_REPO || 'phungvannarich-kepler-aavn/mcp-autonomous-coding',
        language: 'python',
        priority: 'low' as const,
        requester: 'api-test'
      };
      
      console.log('📝 Creating test agent with request:', testRequest);
      
      const agentResponse = await cursorService.createAgent(testRequest);
      
      if (agentResponse.status !== 'failed') {
        console.log(`✅ Test agent created successfully!`);
        console.log(`   Agent ID: ${agentResponse.agentId}`);
        console.log(`   Status: ${agentResponse.status}`);
        console.log(`   Message: ${agentResponse.message}`);
        
        // Monitor the agent for a bit
        console.log('\n⏳ Monitoring agent status for 30 seconds...');
        
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          
          const status = await cursorService.getAgentStatus(agentResponse.agentId);
          console.log(`   Check ${i + 1}: Status = ${status.status}`);
          
          if (status.prUrl) {
            console.log(`   🔗 PR Created: ${status.prUrl}`);
            break;
          }
          
          if (status.status === 'completed' || status.status === 'failed') {
            console.log(`   🏁 Agent finished with status: ${status.status}`);
            if (status.error) {
              console.log(`   ❌ Error: ${status.error}`);
            }
            break;
          }
        }
        
      } else {
        console.error('❌ Failed to create test agent');
        console.error(`   Error: ${agentResponse.error}`);
      }
    } else {
      console.log('\n🤖 Test 4: Skipped (set CREATE_TEST_AGENT=true to enable)');
    }
    
    console.log('\n🎉 Cursor API integration test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    if (error instanceof Error && error.message.includes('CURSOR_API_KEY')) {
      console.log('\n💡 Setup Instructions:');
      console.log('1. Make sure you have the Cursor API key in your .env file:');
      console.log('   CURSOR_API_KEY=key_59829510eb377e1b92c3aaf8b483c15ecdd81041e8ab1ce94d369d9ec148435f');
      console.log('2. Ensure your Cursor Background Agent integration is properly configured');
      console.log('3. Check that your GitHub integration is connected in Cursor');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testCursorAPI().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export default testCursorAPI;
