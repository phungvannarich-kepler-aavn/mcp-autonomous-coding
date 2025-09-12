#!/bin/bash

# Install Cursor IDE
echo "Installing Cursor IDE..."
curl -fsSL https://update.cursor.sh/linux/install.sh | sh

# Create necessary directories
mkdir -p /workspaces/logs
mkdir -p /workspaces/config

# Set up git configuration
git config --global user.name "Autonomous Coding Bot"
git config --global user.email "bot@yourdomain.com"

# Install additional dependencies
echo "Installing dependencies..."
npm install -g typescript ts-node @slack/web-api @slack/events-api
pip install requests flask

# Make scripts executable
chmod +x /workspaces/scripts/*.sh

echo "Environment setup complete!"
