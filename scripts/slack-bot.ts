import { App, ExpressReceiver } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { AutonomousCoder } from './autonomous-coder';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface CodeRequest {
  repository: string;
  task: string;
  priority: 'low' | 'medium' | 'high';
  requester: string;
  channelId: string;
  language?: string;
}

export class SlackBot {
  private app: App;
  private autonomousCoder: AutonomousCoder;
  private receiver: ExpressReceiver;

  constructor() {
    // Initialize Express receiver for custom endpoints
    this.receiver = new ExpressReceiver({
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      endpoints: '/slack/events'
    });

    // Initialize Slack app
    this.app = new App({
      token: process.env.SLACK_BOT_TOKEN,
      receiver: this.receiver,
      appToken: process.env.SLACK_APP_TOKEN
    });

    // Initialize autonomous coder
    this.autonomousCoder = new AutonomousCoder();

    this.setupCommands();
    this.setupEvents();
  }

  private setupCommands(): void {
    // /code-request slash command
    this.app.command('/code-request', async ({ command, ack, respond, client }) => {
      await ack();

      try {
        // Parse command text
        const params = this.parseCodeRequest(command.text);
        if (!params) {
          await respond({
            text: `❌ Invalid format. Use: \`/code-request [task] [language] [repository]\`\n\n*Examples:*\n• \`/code-request "Create a login function" python my-repo\`\n• \`/code-request "Add email validation" javascript frontend-app\``,
            response_type: 'ephemeral'
          });
          return;
        }

        // Create code request
        const codeRequest: CodeRequest = {
          repository: params.repository || process.env.DEFAULT_REPO || '',
          task: params.task,
          priority: 'medium',
          requester: command.user_name,
          channelId: command.channel_id,
          language: params.language
        };

        // Send confirmation
        await respond({
          text: `🚀 *Code Generation Request Received!*\n\n*Task:* ${codeRequest.task}\n*Language:* ${codeRequest.language || 'Auto-detect'}\n*Repository:* ${codeRequest.repository}\n*Priority:* ${codeRequest.priority}\n\n⏳ Processing your request... I'll notify you when the PR is ready!`,
          response_type: 'in_channel'
        });

        // Process the request asynchronously
        this.processCodeRequest(codeRequest);

      } catch (error) {
        console.error('Error handling /code-request:', error);
        await respond({
          text: `❌ Error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          response_type: 'ephemeral'
        });
      }
    });

    // /code-status command to check ongoing requests
    this.app.command('/code-status', async ({ command, ack, respond }) => {
      await ack();
      
      await respond({
        text: `📊 *Code Generation Status*\n\n🟢 *System Status:* Operational\n🤖 *Available Languages:* Python, JavaScript, TypeScript\n📝 *Active Requests:* 0\n\n*Usage:* \`/code-request "[task description]" [language] [repository]\``,
        response_type: 'ephemeral'
      });
    });
  }

  private setupEvents(): void {
    // Handle app mentions (@bot help)
    this.app.event('app_mention', async ({ event, client }) => {
      try {
        const helpText = `👋 Hi! I'm your AI Code Generator bot!\n\n*Commands:*\n• \`/code-request "[task]" [language] [repo]\` - Generate code\n• \`/code-status\` - Check system status\n\n*Examples:*\n• \`/code-request "Create a user authentication system" python backend\`\n• \`/code-request "Add form validation" javascript frontend\`\n\n🚀 I'll create a PR with AI-generated code and notify you for review!`;

        await client.chat.postMessage({
          channel: event.channel,
          text: helpText,
          thread_ts: event.ts
        });
      } catch (error) {
        console.error('Error handling app mention:', error);
      }
    });

    // Handle button interactions (approve/reject PR)
    this.app.action('approve_pr', async ({ action, ack, respond, client, body }) => {
      await ack();
      
      // Implementation for PR approval
      await respond({
        text: `✅ PR approved! The code will be merged.`,
        replace_original: false
      });
    });

    this.app.action('reject_pr', async ({ action, ack, respond, client, body }) => {
      await ack();
      
      // Implementation for PR rejection  
      await respond({
        text: `❌ PR rejected. Please provide feedback for improvements.`,
        replace_original: false
      });
    });
  }

  private parseCodeRequest(text: string): { task: string; language?: string; repository?: string } | null {
    if (!text.trim()) return null;

    // Parse different formats:
    // "task description" language repository
    // "task description" language  
    // "task description"
    
    const parts = text.trim().split(/\s+/);
    
    // Extract quoted task description
    const quotedMatch = text.match(/"([^"]+)"/);
    if (quotedMatch) {
      const task = quotedMatch[1];
      const remaining = text.replace(quotedMatch[0], '').trim().split(/\s+/).filter(p => p);
      
      return {
        task,
        language: remaining[0] || undefined,
        repository: remaining[1] || undefined
      };
    }

    // Fallback: treat entire text as task
    return {
      task: text.trim()
    };
  }

  private async processCodeRequest(request: CodeRequest): Promise<void> {
    try {
      console.log(`🚀 Processing code request from ${request.requester}: ${request.task}`);
      
      // Process the request using autonomous coder
      await this.autonomousCoder.processRequest(request);
      
      console.log(`✅ Code request completed for ${request.requester}`);
      
    } catch (error) {
      console.error('Error processing code request:', error);
      
      // Send error notification to user
      await this.sendErrorNotification(request.channelId, request.requester, error as Error);
    }
  }

  public async sendPRNotification(channelId: string, requester: string, prUrl: string, bugReport: any[], request: CodeRequest): Promise<void> {
    try {
      const bugSummary = bugReport.length === 0 
        ? '✅ No issues found - code is clean!' 
        : `🔍 ${bugReport.length} issues detected (${bugReport.filter(b => b.fixable).length} auto-fixed)`;

      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎉 *Code Generation Complete!*\n\n*Requester:* <@${requester}>\n*Task:* ${request.task}\n*Repository:* ${request.repository}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Bug Detection:* ${bugSummary}\n*Pull Request:* <${prUrl}|View PR>`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve & Merge'
              },
              style: 'primary',
              action_id: 'approve_pr',
              value: prUrl
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔍 Review Changes'
              },
              url: prUrl
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Request Changes'
              },
              style: 'danger',
              action_id: 'reject_pr',
              value: prUrl
            }
          ]
        }
      ];

      await this.app.client.chat.postMessage({
        channel: channelId,
        text: `Code generation complete! PR: ${prUrl}`,
        blocks
      });

      console.log(`📬 PR notification sent to ${channelId} for ${requester}: ${prUrl}`);
      
    } catch (error) {
      console.error('Failed to send PR notification:', error);
    }
  }

  public async sendErrorNotification(channelId: string, requester: string, error: Error): Promise<void> {
    try {
      await this.app.client.chat.postMessage({
        channel: channelId,
        text: `❌ *Code Generation Failed*\n\n*Requester:* <@${requester}>\n*Error:* ${error.message}\n\nPlease try again or contact support if the issue persists.`
      });

      console.log(`❌ Error notification sent to ${channelId} for ${requester}: ${error.message}`);
      
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }

  public async start(port: number = 3001): Promise<void> {
    try {
      await this.app.start(port);
      console.log(`🤖 Slack bot server started on port ${port}!`);
      console.log(`📱 Ready to receive /code-request commands!`);
    } catch (error) {
      console.error('Failed to start Slack bot:', error);
      throw error;
    }
  }

  public getExpressApp() {
    return this.receiver.app;
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  const bot = new SlackBot();
  const port = parseInt(process.env.SLACK_PORT || '3001');
  
  bot.start(port).catch(error => {
    console.error('Failed to start Slack bot:', error);
    process.exit(1);
  });
}

export default SlackBot;
