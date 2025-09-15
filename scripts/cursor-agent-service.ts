import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface CursorAgentRequest {
  task: string;
  repository: string;
  language?: string;
  priority?: 'low' | 'medium' | 'high';
  requester: string;
  branch?: string;
}

export interface CursorAgentResponse {
  agentId: string;
  status: 'created' | 'running' | 'completed' | 'failed';
  message: string;
  prUrl?: string;
  branchName?: string;
  error?: string;
}

export class CursorAgentService {
  private apiKey: string;
  private baseUrl: string = 'https://api.cursor.com/v1'; // This might be the actual endpoint
  
  constructor() {
    this.apiKey = process.env.CURSOR_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('CURSOR_API_KEY environment variable is required');
    }
  }

  /**
   * Create a new Background Agent to generate code
   */
  public async createAgent(request: CursorAgentRequest): Promise<CursorAgentResponse> {
    try {
      console.log(`🤖 Creating Cursor Background Agent for: ${request.task}`);
      
      // Prepare the request payload
      const payload = {
        task: request.task,
        repository: request.repository,
        language: request.language || 'auto-detect',
        priority: request.priority || 'medium',
        requester: request.requester,
        branch: request.branch,
        // Additional options that Cursor might support
        options: {
          createPR: true,
          runTests: true,
          fixBugs: true,
          addDocumentation: true
        }
      };

      // Make API call to Cursor's Background Agent API
      const response = await this.makeApiCall('/agents', 'POST', payload);
      
      if (response.ok) {
        const data = await response.json();
        
        console.log(`✅ Cursor Agent created successfully: ${data.agentId}`);
        
        return {
          agentId: data.agentId,
          status: data.status || 'created',
          message: data.message || 'Agent created successfully',
          branchName: data.branchName,
          prUrl: data.prUrl
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Cursor API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

    } catch (error) {
      console.error('Error creating Cursor agent:', error);
      
      return {
        agentId: '',
        status: 'failed',
        message: 'Failed to create agent',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the status of a Background Agent
   */
  public async getAgentStatus(agentId: string): Promise<CursorAgentResponse> {
    try {
      console.log(`📊 Checking status for Cursor Agent: ${agentId}`);
      
      const response = await this.makeApiCall(`/agents/${agentId}`, 'GET');
      
      if (response.ok) {
        const data = await response.json();
        
        return {
          agentId: data.agentId,
          status: data.status,
          message: data.message || '',
          branchName: data.branchName,
          prUrl: data.prUrl,
          error: data.error
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Cursor API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

    } catch (error) {
      console.error('Error getting agent status:', error);
      
      return {
        agentId,
        status: 'failed',
        message: 'Failed to get agent status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * List all Background Agents
   */
  public async listAgents(limit: number = 10): Promise<CursorAgentResponse[]> {
    try {
      console.log(`📋 Listing Cursor Background Agents (limit: ${limit})`);
      
      const response = await this.makeApiCall(`/agents?limit=${limit}`, 'GET');
      
      if (response.ok) {
        const data = await response.json();
        
        return data.agents.map((agent: any) => ({
          agentId: agent.agentId,
          status: agent.status,
          message: agent.message || '',
          branchName: agent.branchName,
          prUrl: agent.prUrl,
          error: agent.error
        }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Cursor API Error: ${response.status} - ${errorData.error || response.statusText}`);
      }

    } catch (error) {
      console.error('Error listing agents:', error);
      return [];
    }
  }

  /**
   * Cancel a running Background Agent
   */
  public async cancelAgent(agentId: string): Promise<boolean> {
    try {
      console.log(`❌ Cancelling Cursor Agent: ${agentId}`);
      
      const response = await this.makeApiCall(`/agents/${agentId}/cancel`, 'POST');
      
      if (response.ok) {
        console.log(`✅ Agent ${agentId} cancelled successfully`);
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Failed to cancel agent: ${errorData.error}`);
        return false;
      }

    } catch (error) {
      console.error('Error cancelling agent:', error);
      return false;
    }
  }

  /**
   * Test the API connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Cursor API connection...');
      
      // Try to list agents as a connection test
      const response = await this.makeApiCall('/agents?limit=1', 'GET');
      
      if (response.ok) {
        console.log('✅ Cursor API connection successful');
        return true;
      } else {
        console.error(`❌ Cursor API connection failed: ${response.status}`);
        return false;
      }

    } catch (error) {
      console.error('❌ Cursor API connection test failed:', error);
      return false;
    }
  }

  private async makeApiCall(endpoint: string, method: string, body?: any): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Autonomous-Coder/1.0.0'
    };

    const config: RequestInit = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body);
    }

    console.log(`🌐 Making Cursor API call: ${method} ${url}`);
    
    return fetch(url, config);
  }

  /**
   * Get API usage statistics
   */
  public async getUsageStats(): Promise<any> {
    try {
      const response = await this.makeApiCall('/usage', 'GET');
      
      if (response.ok) {
        return await response.json();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return null;
    }
  }
}

export default CursorAgentService;
