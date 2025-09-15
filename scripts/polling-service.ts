import { Octokit } from '@octokit/rest';
import { RequestTracker, CodeRequest } from './request-tracker';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class PollingService {
  private octokit: Octokit;
  private requestTracker: RequestTracker;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastCheckTime: Date | null = null;
  private pollingInterval: number;

  constructor(requestTracker: RequestTracker, intervalSeconds: number = 30) {
    this.requestTracker = requestTracker;
    this.pollingInterval = intervalSeconds * 1000; // Convert to milliseconds
    
    // Initialize GitHub API client
    this.octokit = new Octokit({
      auth: process.env.MCP_GITHUB_TOKEN || process.env.GITHUB_TOKEN
    });
  }

  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ Polling service is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting polling service (every ${this.pollingInterval / 1000} seconds)`);
    
    // Run initial check
    this.checkPendingRequests();
    
    // Set up recurring checks
    this.intervalId = setInterval(() => {
      this.checkPendingRequests();
    }, this.pollingInterval);
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('⏹️ Polling service stopped');
  }

  public getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  public isPolling(): boolean {
    return this.isRunning;
  }

  private async checkPendingRequests(): Promise<void> {
    try {
      this.lastCheckTime = new Date();
      
      // Get all processing requests (these might have PRs created)
      const processingRequests = this.requestTracker.getRequestsByStatus('processing');
      
      if (processingRequests.length === 0) {
        return;
      }

      console.log(`🔍 Checking ${processingRequests.length} processing requests...`);
      
      // Check each processing request
      for (const request of processingRequests) {
        await this.checkRequestStatus(request);
      }

    } catch (error) {
      console.error('Error in polling service:', error);
    }
  }

  private async checkRequestStatus(request: CodeRequest): Promise<void> {
    try {
      // If we already have a PR URL, the request is complete
      if (request.prUrl) {
        return;
      }

      // Look for branches that match the request pattern
      const branchPattern = this.generateBranchPattern(request);
      const branches = await this.findMatchingBranches(request.repository, branchPattern);
      
      if (branches.length === 0) {
        // No matching branches found yet
        return;
      }

      // Check the most recent matching branch
      const latestBranch = branches[0];
      console.log(`🔍 Found branch for request ${request.id}: ${latestBranch.name}`);
      
      // Update branch info if not already set
      if (!request.branchName) {
        this.requestTracker.updateBranchInfo(request.id, latestBranch.name);
      }

      // Look for PR associated with this branch
      const pr = await this.findPullRequestForBranch(request.repository, latestBranch.name);
      
      if (pr) {
        console.log(`✅ Found PR for request ${request.id}: ${pr.html_url}`);
        
        // Update request with PR information
        this.requestTracker.updatePRInfo(request.id, pr.html_url);
        
        // TODO: Could also fetch bug detection results from PR description
      }

    } catch (error) {
      console.error(`Error checking request ${request.id}:`, error);
      
      // If we get repeated errors, mark as failed
      const errorCount = (request.metadata?.errorCount || 0) + 1;
      if (errorCount >= 5) {
        this.requestTracker.updateStatus(request.id, 'failed', {
          error: 'Too many polling errors',
          errorCount
        });
      } else {
        this.requestTracker.updateStatus(request.id, 'processing', {
          errorCount,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private generateBranchPattern(request: CodeRequest): string {
    // Generate pattern based on how autonomous-coder creates branches
    // Pattern: auto-{timestamp}-{task-slug}
    const taskSlug = request.task
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50); // Limit length
    
    return `auto-*-${taskSlug}*`;
  }

  private async findMatchingBranches(repository: string, pattern: string): Promise<Array<{name: string, sha: string, created: Date}>> {
    try {
      const [owner, repo] = repository.split('/');
      
      // Get all branches
      const { data: branches } = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });

      // Filter branches that match the pattern
      const matchingBranches = branches
        .filter(branch => this.matchesPattern(branch.name, pattern))
        .map(branch => ({
          name: branch.name,
          sha: branch.commit.sha,
          created: new Date() // GitHub API doesn't provide branch creation time directly
        }))
        .sort((a, b) => b.created.getTime() - a.created.getTime()); // Sort by newest first

      return matchingBranches;

    } catch (error) {
      console.error('Error fetching branches:', error);
      return [];
    }
  }

  private matchesPattern(branchName: string, pattern: string): boolean {
    // Convert pattern to regex
    // Replace * with .* and escape special regex characters
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\\\*/g, '.*'); // Convert \* back to .*
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(branchName);
  }

  private async findPullRequestForBranch(repository: string, branchName: string): Promise<any | null> {
    try {
      const [owner, repo] = repository.split('/');
      
      // Search for PRs with this branch as head
      const { data: prs } = await this.octokit.pulls.list({
        owner,
        repo,
        head: `${owner}:${branchName}`,
        state: 'all',
        per_page: 1
      });

      return prs.length > 0 ? prs[0] : null;

    } catch (error) {
      console.error('Error fetching pull requests:', error);
      return null;
    }
  }

  public async checkSpecificRequest(requestId: string): Promise<boolean> {
    const request = this.requestTracker.getRequest(requestId);
    if (!request) {
      return false;
    }

    await this.checkRequestStatus(request);
    return true;
  }

  public getStats(): {
    isRunning: boolean;
    lastCheck: Date | null;
    interval: number;
    processingRequests: number;
  } {
    const processingRequests = this.requestTracker.getRequestsByStatus('processing');
    
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheckTime,
      interval: this.pollingInterval / 1000, // Return in seconds
      processingRequests: processingRequests.length
    };
  }
}

export default PollingService;
