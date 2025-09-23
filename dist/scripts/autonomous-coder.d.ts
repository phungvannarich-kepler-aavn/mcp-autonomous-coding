interface CodeRequest {
    repository: string;
    task: string;
    priority: 'low' | 'medium' | 'high';
    requester: string;
}
interface BugReport {
    file: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule: string;
    fixable: boolean;
}
declare class AutonomousCoder {
    private octokit;
    constructor();
    processRequest(request: CodeRequest): Promise<void>;
    private createBranch;
    private checkoutBranch;
    private generateCode;
    private getFileNameFromTask;
    private generateCodeFromTask;
    private runBugDetection;
    private runESLint;
    private runPylint;
    private autoFixBugs;
    private runESLintFix;
    private commitChanges;
    private createPullRequest;
    private generateBugSummary;
    private sendNotification;
    private handleError;
}
export { AutonomousCoder, CodeRequest, BugReport };
//# sourceMappingURL=autonomous-coder.d.ts.map