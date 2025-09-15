import * as fs from 'fs';
import * as path from 'path';

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Priority = 'low' | 'medium' | 'high';

export interface CodeRequest {
  id: string;
  task: string;
  language: string;
  repository: string;
  priority: Priority;
  requester: string;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
  branchName?: string;
  prUrl?: string;
  bugReport?: any[];
  metadata?: {
    error?: string;
    processingTime?: number;
    [key: string]: any;
  };
}

export interface RequestStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

type UpdateCallback = (requestId: string, request: CodeRequest) => void;

export class RequestTracker {
  private requests: Map<string, CodeRequest>;
  private dataFile: string;
  private updateCallbacks: Set<UpdateCallback>;

  constructor(dataFile: string = 'data/requests.json') {
    this.requests = new Map();
    this.dataFile = path.resolve(dataFile);
    this.updateCallbacks = new Set();
    
    this.ensureDataDirectory();
    this.loadRequests();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private loadRequests(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        const requestsArray = JSON.parse(data);
        
        // Convert array back to Map with proper Date objects
        this.requests = new Map(
          requestsArray.map((req: any) => [
            req.id,
            {
              ...req,
              createdAt: new Date(req.createdAt),
              updatedAt: new Date(req.updatedAt)
            }
          ])
        );
        
        console.log(`📊 Loaded ${this.requests.size} requests from storage`);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      this.requests = new Map();
    }
  }

  private saveRequests(): void {
    try {
      // Convert Map to array for JSON serialization
      const requestsArray = Array.from(this.requests.values());
      fs.writeFileSync(this.dataFile, JSON.stringify(requestsArray, null, 2));
    } catch (error) {
      console.error('Error saving requests:', error);
    }
  }

  public addRequest(request: Omit<CodeRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateRequestId();
    const now = new Date();
    
    const fullRequest: CodeRequest = {
      ...request,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    this.requests.set(id, fullRequest);
    this.saveRequests();
    this.notifyUpdate(id, fullRequest);

    console.log(`📝 Added new request: ${id} - ${request.task}`);
    return id;
  }

  public getRequest(id: string): CodeRequest | undefined {
    return this.requests.get(id);
  }

  public getAllRequests(page: number = 1, limit: number = 10): {
    requests: CodeRequest[];
    total: number;
    page: number;
    totalPages: number;
  } {
    const allRequests = Array.from(this.requests.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const requests = allRequests.slice(start, end);

    return {
      requests,
      total: allRequests.length,
      page,
      totalPages: Math.ceil(allRequests.length / limit)
    };
  }

  public updateStatus(id: string, status: RequestStatus, metadata?: any): boolean {
    const request = this.requests.get(id);
    if (!request) {
      return false;
    }

    request.status = status;
    request.updatedAt = new Date();
    
    if (metadata) {
      request.metadata = { ...request.metadata, ...metadata };
    }

    this.requests.set(id, request);
    this.saveRequests();
    this.notifyUpdate(id, request);

    console.log(`📊 Updated request ${id}: ${status}`);
    return true;
  }

  public updateBranchInfo(id: string, branchName: string): boolean {
    const request = this.requests.get(id);
    if (!request) {
      return false;
    }

    request.branchName = branchName;
    request.updatedAt = new Date();
    
    this.requests.set(id, request);
    this.saveRequests();
    this.notifyUpdate(id, request);

    return true;
  }

  public updatePRInfo(id: string, prUrl: string, bugReport?: any[]): boolean {
    const request = this.requests.get(id);
    if (!request) {
      return false;
    }

    request.prUrl = prUrl;
    request.status = 'completed';
    request.updatedAt = new Date();
    
    if (bugReport) {
      request.bugReport = bugReport;
    }

    // Calculate processing time
    const processingTime = request.updatedAt.getTime() - request.createdAt.getTime();
    request.metadata = { 
      ...request.metadata, 
      processingTime: Math.round(processingTime / 1000) // in seconds
    };

    this.requests.set(id, request);
    this.saveRequests();
    this.notifyUpdate(id, request);

    console.log(`✅ Request ${id} completed: ${prUrl}`);
    return true;
  }

  public getStats(): RequestStats {
    const requests = Array.from(this.requests.values());
    
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      processing: requests.filter(r => r.status === 'processing').length,
      completed: requests.filter(r => r.status === 'completed').length,
      failed: requests.filter(r => r.status === 'failed').length
    };
  }

  public getRequestsByStatus(status: RequestStatus): CodeRequest[] {
    return Array.from(this.requests.values())
      .filter(request => request.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public onUpdate(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  private notifyUpdate(requestId: string, request: CodeRequest): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(requestId, request);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `req_${timestamp}_${random}`;
  }

  public cleanup(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let removedCount = 0;
    for (const [id, request] of this.requests) {
      if (request.createdAt < cutoffDate && (request.status === 'completed' || request.status === 'failed')) {
        this.requests.delete(id);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      this.saveRequests();
      console.log(`🧹 Cleaned up ${removedCount} old requests`);
    }
    
    return removedCount;
  }
}

export default RequestTracker;
