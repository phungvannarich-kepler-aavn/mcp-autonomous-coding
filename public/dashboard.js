class DashboardApp {
    constructor() {
        this.eventSource = null;
        this.requests = new Map();
        this.stats = {};
        
        this.initializeEventListeners();
        this.loadInitialData();
        this.setupRealTimeUpdates();
        
        // Refresh data every 30 seconds as backup to real-time updates
        setInterval(() => this.refreshData(), 30000);
    }

    initializeEventListeners() {
        // Form submission
        document.getElementById('codeRequestForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRequest();
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadRequests()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            this.stats = data.requests;
            this.updateStatsDisplay();
            
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadRequests() {
        try {
            const response = await fetch('/api/requests?limit=20');
            const data = await response.json();
            
            // Update local requests map
            data.requests.forEach(request => {
                this.requests.set(request.id, request);
            });
            
            this.updateRequestsDisplay();
            
        } catch (error) {
            console.error('Error loading requests:', error);
            document.getElementById('statusSection').innerHTML = 
                '<div class="error">Failed to load requests</div>';
        }
    }

    updateStatsDisplay() {
        document.getElementById('totalRequests').textContent = this.stats.total || 0;
        document.getElementById('pendingRequests').textContent = this.stats.pending || 0;
        document.getElementById('processingRequests').textContent = this.stats.processing || 0;
        document.getElementById('completedRequests').textContent = this.stats.completed || 0;
    }

    updateRequestsDisplay() {
        const statusSection = document.getElementById('statusSection');
        
        if (this.requests.size === 0) {
            statusSection.innerHTML = '<div class="loading">No requests yet. Submit your first code generation request!</div>';
            return;
        }

        // Convert to array and sort by creation time (newest first)
        const requestsArray = Array.from(this.requests.values())
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const requestsHtml = requestsArray.map(request => this.renderRequestItem(request)).join('');
        statusSection.innerHTML = requestsHtml;
    }

    renderRequestItem(request) {
        const createdAt = new Date(request.createdAt).toLocaleString();
        const updatedAt = new Date(request.updatedAt).toLocaleString();
        
        let statusDetails = `Created: ${createdAt}`;
        if (request.updatedAt !== request.createdAt) {
            statusDetails += `<br>Updated: ${updatedAt}`;
        }
        
        if (request.metadata?.processingTime) {
            statusDetails += `<br>Processing time: ${request.metadata.processingTime}s`;
        }

        let prLinkHtml = '';
        if (request.prUrl) {
            prLinkHtml = `<a href="${request.prUrl}" target="_blank" class="pr-link">📋 View Pull Request</a>`;
        }

        let bugReportHtml = '';
        if (request.bugReport && request.bugReport.length > 0) {
            const bugCount = request.bugReport.length;
            const fixedCount = request.bugReport.filter(bug => bug.fixable).length;
            bugReportHtml = `<br>🔍 ${bugCount} issues found (${fixedCount} auto-fixed)`;
        } else if (request.status === 'completed') {
            bugReportHtml = '<br>✅ No issues found - code is clean!';
        }

        return `
            <div class="status-item ${request.status}">
                <div class="status-header">
                    <div class="status-title">${this.truncateText(request.task, 60)}</div>
                    <div class="status-badge ${request.status}">${request.status}</div>
                </div>
                <div class="status-details">
                    <strong>Language:</strong> ${request.language} | 
                    <strong>Repository:</strong> ${request.repository || 'Default'} | 
                    <strong>Priority:</strong> ${request.priority}
                    <br>${statusDetails}${bugReportHtml}
                    ${prLinkHtml}
                </div>
            </div>
        `;
    }

    async submitRequest() {
        const submitBtn = document.getElementById('submitBtn');
        const messageDiv = document.getElementById('submitMessage');
        
        // Get form data
        const task = document.getElementById('task').value.trim();
        const language = document.getElementById('language').value;
        const repository = document.getElementById('repository').value.trim();
        const priority = document.getElementById('priority').value;

        if (!task) {
            this.showError('Task description is required');
            return;
        }

        // Disable form and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner"></div>Submitting...';
        messageDiv.innerHTML = '';

        try {
            const response = await fetch('/api/code-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task,
                    language: language === 'auto-detect' ? '' : language,
                    repository: repository || undefined,
                    priority
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Success
                this.showSuccess(`Request submitted successfully! Request ID: ${result.requestId}`);
                
                // Clear form
                document.getElementById('codeRequestForm').reset();
                
                // Refresh data
                setTimeout(() => this.refreshData(), 1000);
                
            } else {
                this.showError(result.error || 'Failed to submit request');
            }

        } catch (error) {
            console.error('Error submitting request:', error);
            this.showError('Network error. Please try again.');
            
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🚀 Generate Code';
        }
    }

    setupRealTimeUpdates() {
        try {
            this.eventSource = new EventSource('/api/events');
            
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleRealTimeUpdate(data);
                } catch (error) {
                    console.error('Error parsing real-time update:', error);
                }
            };

            this.eventSource.onerror = (error) => {
                console.error('EventSource error:', error);
                // Reconnect after 5 seconds
                setTimeout(() => {
                    if (this.eventSource.readyState === EventSource.CLOSED) {
                        this.setupRealTimeUpdates();
                    }
                }, 5000);
            };

        } catch (error) {
            console.error('Error setting up real-time updates:', error);
        }
    }

    handleRealTimeUpdate(data) {
        if (data.type === 'request_update') {
            // Update local request data
            this.requests.set(data.requestId, data.request);
            
            // Refresh displays
            this.updateRequestsDisplay();
            this.loadStats(); // Refresh stats
            
            console.log(`Real-time update for request ${data.requestId}: ${data.request.status}`);
        }
    }

    async refreshData() {
        try {
            await this.loadStats();
            await this.loadRequests();
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    showError(message) {
        const messageDiv = document.getElementById('submitMessage');
        messageDiv.innerHTML = `<div class="error">${message}</div>`;
        setTimeout(() => messageDiv.innerHTML = '', 5000);
    }

    showSuccess(message) {
        const messageDiv = document.getElementById('submitMessage');
        messageDiv.innerHTML = `<div class="success">${message}</div>`;
        setTimeout(() => messageDiv.innerHTML = '', 5000);
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardApp();
});
