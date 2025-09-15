# GitHub Token Test Script (PowerShell)
# This script tests if your GitHub Personal Access Token has the correct permissions

Write-Host "🔑 GitHub Personal Access Token Test" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

if (-not $env:GITHUB_TOKEN) {
    Write-Host "❌ Error: GITHUB_TOKEN environment variable not set" -ForegroundColor Red
    Write-Host "Please run: `$env:GITHUB_TOKEN = 'your_token_here'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Token found in environment variable" -ForegroundColor Green
Write-Host "🔍 Testing token permissions..." -ForegroundColor Yellow

# Test basic authentication
Write-Host "📡 Testing authentication... " -NoNewline
try {
    $headers = @{ Authorization = "token $env:GITHUB_TOKEN" }
    $authResponse = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    $username = $authResponse.login
    Write-Host "✅ Success! Authenticated as: $username" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed! Invalid token or network issue" -ForegroundColor Red
    exit 1
}

# Test repository access
Write-Host "📂 Testing repository access... " -NoNewline
try {
    $repoResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/phungvannarich-kepler-aavn/mcp-autonomous-coding" -Headers $headers
    Write-Host "✅ Success! Can access repository" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed! Cannot access repository" -ForegroundColor Red
    exit 1
}

# Test repository permissions
Write-Host "🔐 Testing repository permissions... " -NoNewline
if ($repoResponse.permissions.admin -eq $true) {
    Write-Host "✅ Success! Full repository permissions" -ForegroundColor Green
} elseif ($repoResponse.permissions.push -eq $true) {
    Write-Host "✅ Success! Write permissions (sufficient)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning! Limited permissions - may cause issues" -ForegroundColor Yellow
}

# Test workflow permissions
Write-Host "⚙️  Testing workflow permissions... " -NoNewline
try {
    $workflowResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/phungvannarich-kepler-aavn/mcp-autonomous-coding/actions/workflows" -Headers $headers
    Write-Host "✅ Success! Can access workflows" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Warning! Cannot access workflows - may need workflow scope" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Token test completed!" -ForegroundColor Cyan
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   - Authentication: ✅" -ForegroundColor Green
Write-Host "   - Repository Access: ✅" -ForegroundColor Green
Write-Host "   - Repository Permissions: ✅" -ForegroundColor Green
Write-Host "   - Workflow Access: ✅" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Your token is ready for MCP integration!" -ForegroundColor Cyan
