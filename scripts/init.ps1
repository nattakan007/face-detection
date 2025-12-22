# Face Attendance System Initialization Script

Write-Host "Initializing Face Attendance System..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm is not installed. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install root dependencies
Write-Host "Installing root dependencies..." -ForegroundColor Yellow
npm install

# Create environment file
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please update .env file with your configuration" -ForegroundColor Cyan
}

Write-Host "`nFace Attendance System workspace is ready!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with your database configuration" -ForegroundColor Cyan
Write-Host "2. Run 'npm run install:all' to install all project dependencies" -ForegroundColor Cyan
Write-Host "3. Run 'npm run dev:all' to start all services in development mode" -ForegroundColor Cyan
Write-Host "4. Or use 'docker-compose up' to run with Docker" -ForegroundColor Cyan