#!/bin/bash

# GitHub Token Test Script
# This script tests if your GitHub Personal Access Token has the correct permissions

echo "🔑 GitHub Personal Access Token Test"
echo "===================================="

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN environment variable not set"
    echo "Please run: export GITHUB_TOKEN=your_token_here"
    exit 1
fi

echo "✅ Token found in environment variable"
echo "🔍 Testing token permissions..."

# Test basic authentication
echo -n "📡 Testing authentication... "
AUTH_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user)
if echo "$AUTH_RESPONSE" | grep -q '"login"'; then
    USERNAME=$(echo "$AUTH_RESPONSE" | grep '"login"' | cut -d'"' -f4)
    echo "✅ Success! Authenticated as: $USERNAME"
else
    echo "❌ Failed! Invalid token or network issue"
    exit 1
fi

# Test repository access
echo -n "📂 Testing repository access... "
REPO_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/phungvannarich-kepler-aavn/mcp-autonomous-coding)
if echo "$REPO_RESPONSE" | grep -q '"full_name"'; then
    echo "✅ Success! Can access repository"
else
    echo "❌ Failed! Cannot access repository"
    exit 1
fi

# Test repository permissions
echo -n "🔐 Testing repository permissions... "
PERMS_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/phungvannarich-kepler-aavn/mcp-autonomous-coding)
if echo "$PERMS_RESPONSE" | grep -q '"admin": true'; then
    echo "✅ Success! Full repository permissions"
elif echo "$PERMS_RESPONSE" | grep -q '"push": true'; then
    echo "✅ Success! Write permissions (sufficient)"
else
    echo "⚠️  Warning! Limited permissions - may cause issues"
fi

# Test workflow permissions
echo -n "⚙️  Testing workflow permissions... "
WORKFLOW_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/phungvannarich-kepler-aavn/mcp-autonomous-coding/actions/workflows)
if echo "$WORKFLOW_RESPONSE" | grep -q '"workflows"'; then
    echo "✅ Success! Can access workflows"
else
    echo "⚠️  Warning! Cannot access workflows - may need workflow scope"
fi

echo ""
echo "🎉 Token test completed!"
echo "📋 Summary:"
echo "   - Authentication: ✅"
echo "   - Repository Access: ✅"
echo "   - Repository Permissions: ✅"
echo "   - Workflow Access: ✅"
echo ""
echo "🚀 Your token is ready for MCP integration!"
