#!/bin/bash

# scripts/setup-environment.sh
# Setup script for the autonomous coding environment

echo "🚀 Setting up Autonomous Coding Environment..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Set up environment variables from Codespace secrets
echo "🔐 Setting up environment variables..."

# Create .env file from template if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.template .env
    
    # Replace template values with actual Codespace secrets if available
    if [ ! -z "$MCP_GITHUB_TOKEN" ]; then
        sed -i "s/ghp_your_personal_access_token_here/$MCP_GITHUB_TOKEN/g" .env
    fi
    
    if [ ! -z "$WEBHOOK_SECRET" ]; then
        sed -i "s/your_webhook_secret_here/$WEBHOOK_SECRET/g" .env
    fi
    
    if [ ! -z "$SLACK_BOT_TOKEN" ]; then
        sed -i "s/xoxb-your-bot-token-here/$SLACK_BOT_TOKEN/g" .env
    fi
    
    if [ ! -z "$SLACK_SIGNING_SECRET" ]; then
        sed -i "s/your-slack-signing-secret/$SLACK_SIGNING_SECRET/g" .env
    fi
    
    # Set default repository
    sed -i "s/your-username\/your-repo/phungvannarich-kepler-aavn\/mcp-autonomous-coding/g" .env
    
    echo "✅ Environment file created"
else
    echo "✅ Environment file already exists"
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh
chmod +x scripts/*.ts

# Test the setup
echo "🧪 Testing the setup..."
if npm run test; then
    echo "✅ Setup completed successfully!"
    echo ""
    echo "🎉 Your autonomous coding environment is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Set up Slack integration (if needed)"
    echo "  2. Test the webhook server"
    echo "  3. Send your first autonomous coding request!"
    echo ""
else
    echo "⚠️  Setup completed with warnings"
    echo "Some tests failed, but the basic environment is ready"
fi
