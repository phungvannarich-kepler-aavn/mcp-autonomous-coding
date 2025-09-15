import express from 'express';
import cors from 'cors';
import path from 'path';
import { AutonomousCoder } from './autonomous-coder';
import { RequestTracker, CodeRequest, RequestStatus } from './request-tracker';
import { PollingService } from './polling-service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class DashboardServer {
  private app: express.Application;
  private autonomousCoder: AutonomousCoder;
  private requestTracker: RequestTracker;
  private pollingService: PollingService;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.autonomousCoder = new AutonomousCoder();
    this.requestTracker = new RequestTracker();
    this.pollingService = new PollingService(this.requestTracker);

    this.setupMiddleware();
    this.setupRoutes();
    this.startPolling();
  }

  private setupMiddleware(): void {
    // Enable CORS for all routes
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));
    
    // Serve static files from public directory
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private setupRoutes(): void {
    // Serve the main dashboard page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/dashboard.html'));
    });

    // API: Submit new code request
    this.app.post('/api/code-request', async (req, res) => {
      try {
        const { task, language, repository, priority } = req.body;

        // Validate required fields
        if (!task) {
          return res.status(400).json({ error: 'Task description is required' });
        }

        // Create code request
        const codeRequest: Omit<CodeRequest, 'id' | 'status' | 'createdAt'> = {
          task: task.trim(),
          language: language || 'auto-detect',
          repository: repository || process.env.DEFAULT_REPO || '',
          priority: priority || 'medium',
          requester: 'web-user'
        };

        // Add to tracker
        const requestId = this.requestTracker.addRequest(codeRequest);
        
        // Start processing asynchronously
        this.processRequestAsync(requestId);

        // Return request ID immediately
        res.json({ 
          success: true, 
          requestId,
          message: 'Request submitted successfully! Processing will begin shortly.',
          status: 'pending'
        });

      } catch (error) {
        console.error('Error submitting code request:', error);
        res.status(500).json({ 
          error: 'Failed to submit request',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // API: Get request status
    this.app.get('/api/request/:id', (req, res) => {
      const requestId = req.params.id;
      const request = this.requestTracker.getRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      res.json(request);
    });

    // API: Get all requests (with pagination)
    this.app.get('/api/requests', (req, res) => {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const requests = this.requestTracker.getAllRequests(page, limit);
      
      res.json(requests);
    });

    // API: Get system status
    this.app.get('/api/status', (req, res) => {
      const stats = this.requestTracker.getStats();
      res.json({
        system: 'operational',
        uptime: process.uptime(),
        requests: stats,
        polling: {
          enabled: true,
          interval: '30 seconds',
          lastCheck: this.pollingService.getLastCheckTime()
        }
      });
    });

    // API: Server-Sent Events for real-time updates
    this.app.get('/api/events', (req, res) => {
      // Set headers for SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Real-time updates enabled' })}\n\n`);

      // Subscribe to request updates
      const unsubscribe = this.requestTracker.onUpdate((requestId, request) => {
        res.write(`data: ${JSON.stringify({ 
          type: 'request_update', 
          requestId, 
          request 
        })}\n\n`);
      });

      // Clean up on client disconnect
      req.on('close', () => {
        unsubscribe();
      });
    });

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  }

  private async processRequestAsync(requestId: string): Promise<void> {
    try {
      const request = this.requestTracker.getRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Update status to processing
      this.requestTracker.updateStatus(requestId, 'processing');

      // Process with autonomous coder
      await this.autonomousCoder.processRequest({
        repository: request.repository,
        task: request.task,
        priority: request.priority,
        requester: request.requester
      });

      // Polling service will detect completion and update status

    } catch (error) {
      console.error(`Error processing request ${requestId}:`, error);
      this.requestTracker.updateStatus(requestId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private startPolling(): void {
    // Start the polling service
    this.pollingService.start();
    console.log('📊 Polling service started - checking GitHub every 30 seconds');
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🌐 Dashboard server running on http://localhost:${this.port}`);
        console.log(`📊 API endpoints available at http://localhost:${this.port}/api/`);
        console.log(`🔄 Real-time updates: http://localhost:${this.port}/api/events`);
        resolve();
      });
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const port = parseInt(process.env.DASHBOARD_PORT || '3000');
  const server = new DashboardServer(port);
  
  server.start().catch(error => {
    console.error('Failed to start dashboard server:', error);
    process.exit(1);
  });
}

export default DashboardServer;
