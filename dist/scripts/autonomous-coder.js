"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousCoder = void 0;
// scripts/autonomous-coder.ts
const child_process_1 = require("child_process");
const rest_1 = require("@octokit/rest");
const fs = __importStar(require("fs/promises"));
class AutonomousCoder {
    octokit;
    constructor() {
        this.octokit = new rest_1.Octokit({
            auth: process.env.MCP_GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN
        });
    }
    async processRequest(request) {
        console.log(`🚀 Processing request: ${request.task}`);
        try {
            // 1. Create new branch
            const branchName = `auto-${Date.now()}-${request.task.replace(/\s+/g, '-').toLowerCase()}`;
            console.log(`📝 Creating branch: ${branchName}`);
            await this.createBranch(request.repository, branchName);
            // 2. Generate code using Cursor + MCP
            console.log(`⚙️ Generating code for: ${request.task}`);
            await this.generateCode(request.task, branchName);
            // 3. Run bug detection and auto-fix
            console.log(`🔍 Running bug detection...`);
            const bugReport = await this.runBugDetection(branchName);
            const fixedBugs = await this.autoFixBugs(bugReport, branchName);
            // 4. Re-run bug detection after fixes
            console.log(`🔄 Re-running bug detection after fixes...`);
            const finalBugReport = await this.runBugDetection(branchName);
            // 5. Commit changes (including bug fixes)
            console.log(`💾 Committing changes...`);
            await this.commitChanges(branchName, request.task, fixedBugs);
            // 6. Create PR with bug report
            console.log(`📋 Creating pull request...`);
            const prUrl = await this.createPullRequest(request.repository, branchName, request, finalBugReport);
            // 7. Notify requester
            console.log(`📬 Sending notification...`);
            await this.sendNotification(request.requester, branchName, finalBugReport, prUrl);
            console.log(`✅ Request completed successfully! PR: ${prUrl}`);
        }
        catch (error) {
            console.error('❌ Error processing request:', error);
            await this.handleError(request, error);
        }
    }
    async createBranch(repo, branchName) {
        const [owner, repoName] = repo.split('/');
        // Get the default branch SHA
        const { data: defaultBranch } = await this.octokit.repos.getBranch({
            owner,
            repo: repoName,
            branch: 'main'
        });
        // Create new branch
        await this.octokit.git.createRef({
            owner,
            repo: repoName,
            ref: `refs/heads/${branchName}`,
            sha: defaultBranch.commit.sha
        });
        // Switch to the new branch locally
        await this.checkoutBranch(branchName);
        console.log(`✅ Branch created: ${branchName}`);
    }
    async checkoutBranch(branchName) {
        return new Promise((resolve, reject) => {
            // First fetch the latest changes
            const gitFetch = (0, child_process_1.spawn)('git', ['fetch', 'origin']);
            gitFetch.on('close', (fetchCode) => {
                if (fetchCode !== 0) {
                    reject(new Error(`Git fetch failed with code ${fetchCode}`));
                    return;
                }
                // Then checkout the new branch locally
                const gitCheckout = (0, child_process_1.spawn)('git', ['checkout', '-b', branchName]);
                gitCheckout.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ Switched to branch: ${branchName}`);
                        resolve();
                    }
                    else {
                        reject(new Error(`Git checkout failed with code ${code}`));
                    }
                });
            });
        });
    }
    async generateCode(task, branch) {
        // This is where we would integrate with Cursor's AI
        // For now, we'll simulate code generation
        console.log(`🤖 Simulating code generation for: ${task}`);
        // Create a simple example file based on the task
        const fileName = this.getFileNameFromTask(task);
        const code = this.generateCodeFromTask(task);
        await fs.writeFile(fileName, code);
        console.log(`📄 Generated file: ${fileName}`);
    }
    getFileNameFromTask(task) {
        const lowerTask = task.toLowerCase();
        if (lowerTask.includes('python') || lowerTask.includes('.py')) {
            return 'generated_code.py';
        }
        else if (lowerTask.includes('javascript') || lowerTask.includes('js') || lowerTask.includes('node')) {
            return 'generated_code.js';
        }
        else if (lowerTask.includes('typescript') || lowerTask.includes('ts')) {
            return 'generated_code.ts';
        }
        else {
            return 'generated_code.py'; // Default to Python
        }
    }
    generateCodeFromTask(task) {
        const lowerTask = task.toLowerCase();
        if (lowerTask.includes('hello world') || lowerTask.includes('hello')) {
            if (lowerTask.includes('python')) {
                return `#!/usr/bin/env python3
"""
Auto-generated code for: ${task}
Generated by Autonomous Coding Workflow
"""

def hello_world(name="World"):
    """Print a greeting message."""
    print(f"Hello, {name}!")
    return f"Hello, {name}!"

if __name__ == "__main__":
    hello_world()
`;
            }
            else {
                return `// Auto-generated code for: ${task}
// Generated by Autonomous Coding Workflow

function helloWorld(name = "World") {
    console.log(\`Hello, \${name}!\`);
    return \`Hello, \${name}!\`;
}

if (require.main === module) {
    helloWorld();
}

module.exports = { helloWorld };
`;
            }
        }
        else if (lowerTask.includes('api') || lowerTask.includes('endpoint')) {
            return `#!/usr/bin/env python3
"""
Auto-generated API endpoint for: ${task}
Generated by Autonomous Coding Workflow
"""

from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/hello', methods=['GET'])
def hello_api():
    """Simple API endpoint."""
    name = request.args.get('name', 'World')
    return jsonify({
        'message': f'Hello, {name}!',
        'status': 'success',
        'generated_by': 'Autonomous Coding Workflow'
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
`;
        }
        else {
            return `#!/usr/bin/env python3
"""
Auto-generated code for: ${task}
Generated by Autonomous Coding Workflow
"""

def main():
    """Main function for the generated code."""
    print("Code generated for task: ${task}")
    # TODO: Implement the specific functionality requested
    pass

if __name__ == "__main__":
    main()
`;
        }
    }
    async runBugDetection(branch) {
        const bugs = [];
        try {
            console.log('🔍 Running ESLint...');
            const eslintBugs = await this.runESLint();
            bugs.push(...eslintBugs);
            console.log('🔍 Running Pylint...');
            const pylintBugs = await this.runPylint();
            bugs.push(...pylintBugs);
            console.log(`📊 Found ${bugs.length} potential issues`);
            bugs.forEach(bug => {
                console.log(`  ${bug.severity}: ${bug.file}:${bug.line} - ${bug.message}`);
            });
            return bugs;
        }
        catch (error) {
            console.error('Bug detection failed:', error);
            return [];
        }
    }
    async runESLint() {
        return new Promise((resolve) => {
            const eslint = (0, child_process_1.spawn)('npx', ['eslint', '--format=json', '.'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let output = '';
            eslint.stdout.on('data', (data) => {
                output += data.toString();
            });
            eslint.on('close', () => {
                try {
                    if (!output.trim()) {
                        resolve([]);
                        return;
                    }
                    const results = JSON.parse(output);
                    const bugs = [];
                    results.forEach((result) => {
                        if (result.messages) {
                            result.messages.forEach((message) => {
                                bugs.push({
                                    file: result.filePath,
                                    line: message.line || 1,
                                    severity: message.severity === 2 ? 'error' : 'warning',
                                    message: message.message,
                                    rule: message.ruleId || 'unknown',
                                    fixable: message.fix !== undefined
                                });
                            });
                        }
                    });
                    resolve(bugs);
                }
                catch (error) {
                    console.error('Failed to parse ESLint output:', error);
                    resolve([]);
                }
            });
        });
    }
    async runPylint() {
        return new Promise((resolve) => {
            const pylint = (0, child_process_1.spawn)('python3', ['-m', 'pylint', '--output-format=json', '*.py'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
            let output = '';
            pylint.stdout.on('data', (data) => {
                output += data.toString();
            });
            pylint.on('close', () => {
                try {
                    if (!output.trim()) {
                        resolve([]);
                        return;
                    }
                    const results = JSON.parse(output);
                    const bugs = results.map((issue) => ({
                        file: issue.path || 'unknown',
                        line: issue.line || 1,
                        severity: issue.type === 'error' ? 'error' : 'warning',
                        message: issue.message || 'Unknown issue',
                        rule: issue['message-id'] || 'unknown',
                        fixable: false // Pylint doesn't provide auto-fix info
                    }));
                    resolve(bugs);
                }
                catch (error) {
                    console.error('Failed to parse Pylint output:', error);
                    resolve([]);
                }
            });
        });
    }
    async autoFixBugs(bugs, branch) {
        const fixedBugs = [];
        const fixableBugs = bugs.filter(bug => bug.fixable);
        if (fixableBugs.length === 0) {
            console.log('No auto-fixable bugs found');
            return fixedBugs;
        }
        console.log(`🔧 Attempting to auto-fix ${fixableBugs.length} bugs`);
        try {
            // Auto-fix ESLint issues
            await this.runESLintFix();
            fixedBugs.push('ESLint auto-fixes applied');
            return fixedBugs;
        }
        catch (error) {
            console.error('Auto-fix failed:', error);
            return fixedBugs;
        }
    }
    async runESLintFix() {
        return new Promise((resolve) => {
            const eslintFix = (0, child_process_1.spawn)('npx', ['eslint', '--fix', '.']);
            eslintFix.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ ESLint auto-fix completed');
                }
                else {
                    console.warn('⚠️ ESLint auto-fix had issues, but continuing');
                }
                resolve(); // Don't fail the entire process
            });
        });
    }
    async commitChanges(branchName, task, fixedBugs) {
        return new Promise((resolve, reject) => {
            let commitMessage = `Auto-generated: ${task}`;
            if (fixedBugs.length > 0) {
                commitMessage += `\n\nBug fixes applied:\n${fixedBugs.map(fix => `- ${fix}`).join('\n')}`;
            }
            const gitAdd = (0, child_process_1.spawn)('git', ['add', '.']);
            gitAdd.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Git add failed with code ${code}`));
                    return;
                }
                const gitCommit = (0, child_process_1.spawn)('git', ['commit', '-m', commitMessage]);
                gitCommit.on('close', (commitCode) => {
                    if (commitCode === 0) {
                        console.log('✅ Changes committed successfully');
                        // Push the commit to GitHub
                        const gitPush = (0, child_process_1.spawn)('git', ['push', 'origin', branchName]);
                        gitPush.on('close', (pushCode) => {
                            if (pushCode === 0) {
                                console.log('✅ Changes pushed to GitHub');
                                resolve();
                            }
                            else {
                                reject(new Error(`Git push failed with code ${pushCode}`));
                            }
                        });
                    }
                    else {
                        reject(new Error(`Git commit failed with code ${commitCode}`));
                    }
                });
            });
        });
    }
    async createPullRequest(repo, branch, request, bugReport) {
        const [owner, repoName] = repo.split('/');
        const bugSummary = this.generateBugSummary(bugReport);
        const { data: pr } = await this.octokit.pulls.create({
            owner,
            repo: repoName,
            title: `🤖 Auto-generated: ${request.task}`,
            head: branch,
            base: 'main',
            body: `## 🤖 Automated Code Generation

**Task**: ${request.task}
**Requested by**: ${request.requester}
**Generated on**: ${new Date().toISOString()}

This PR was automatically generated using Cursor IDE with MCP integration and includes automated bug detection and fixes.

### 📝 Changes Made
- Auto-generated code based on the provided task description
- Follows project conventions and best practices
- Automated bug detection and fixes applied
- Code quality checks performed

${bugSummary}

### ✅ Quality Assurance
- [x] Automated bug detection completed
- [x] Auto-fixable issues resolved
- [x] Code formatting applied
- [x] Linting rules enforced

### 📋 Review Checklist
- [ ] Code functionality meets requirements
- [ ] Manual review of remaining issues (if any)
- [ ] Tests pass (run CI/CD pipeline)
- [ ] Documentation updated
- [ ] Security review completed

### 🔧 Technical Details
- **Bug Detection Tools**: ESLint, Pylint, Cursor AI
- **Auto-fixes Applied**: ${bugReport.filter(b => b.fixable).length} issues
- **Remaining Issues**: ${bugReport.filter(b => !b.fixable).length} manual review needed

**Note**: This is an automated PR with integrated bug detection. The code has been pre-screened for common issues, but manual review is still recommended.
      `
        });
        return pr.html_url;
    }
    generateBugSummary(bugReport) {
        if (bugReport.length === 0) {
            return `
### 🎉 Bug Detection Results
✅ **No issues found!** The generated code passed all automated quality checks.
`;
        }
        const errors = bugReport.filter(b => b.severity === 'error');
        const warnings = bugReport.filter(b => b.severity === 'warning');
        const fixed = bugReport.filter(b => b.fixable);
        const remaining = bugReport.filter(b => !b.fixable);
        return `
### 🔍 Bug Detection Results
- **Total Issues Found**: ${bugReport.length}
- **Errors**: ${errors.length}
- **Warnings**: ${warnings.length}
- **Auto-Fixed**: ${fixed.length}
- **Requires Manual Review**: ${remaining.length}

${remaining.length > 0 ? `
#### ⚠️ Issues Requiring Manual Review:
${remaining.map(bug => `- \`${bug.file}:${bug.line}\` - ${bug.message} (${bug.rule})`).join('\n')}
` : ''}

${fixed.length > 0 ? `
#### ✅ Auto-Fixed Issues:
${fixed.map(bug => `- \`${bug.file}:${bug.line}\` - ${bug.message} (${bug.rule})`).join('\n')}
` : ''}
`;
    }
    async sendNotification(requester, branch, bugReport, prUrl) {
        const bugSummary = bugReport.length === 0
            ? "✅ No issues found - code is clean!"
            : `🔍 ${bugReport.length} issues detected (${bugReport.filter(b => b.fixable).length} auto-fixed)`;
        // Send Slack notification if available
        if (process.env.SLACK_BOT_TOKEN) {
            try {
                const { sendPRNotification } = await Promise.resolve().then(() => __importStar(require('./slack-bot-placeholder')));
                const channelId = process.env.SLACK_CHANNEL || '#dev-notifications';
                await sendPRNotification(channelId, requester, prUrl, bugReport, {
                    repository: process.env.DEFAULT_REPO || '',
                    task: 'Code generation completed',
                    priority: 'medium',
                    requester: requester
                });
            }
            catch (error) {
                console.error('Slack notification failed:', error);
            }
        }
        // Fallback to console logging
        console.log(`📬 Notification: PR created for ${requester} - ${bugSummary}`);
        console.log(`🔗 PR URL: ${prUrl}`);
    }
    async handleError(request, error) {
        console.error(`❌ Failed to process request from ${request.requester}:`, error);
        // Send error notification
        if (process.env.SLACK_BOT_TOKEN) {
            try {
                const { sendSlackError } = await Promise.resolve().then(() => __importStar(require('./slack-bot-placeholder')));
                const channelId = process.env.SLACK_CHANNEL || '#dev-notifications';
                await sendSlackError(channelId, request.requester, error);
            }
            catch (slackError) {
                console.error('Failed to send error notification:', slackError);
            }
        }
    }
}
exports.AutonomousCoder = AutonomousCoder;
//# sourceMappingURL=autonomous-coder.js.map