# PowerShell script to set up Python virtual environment
# Run this after installing Python

Write-Host "Checking Python installation..." -ForegroundColor Cyan

# Try different Python commands
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
}

if ($null -eq $pythonCmd) {
    Write-Host "ERROR: Python not found. Please install Python from https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host "Make sure to check 'Add Python to PATH' during installation." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found Python: $pythonCmd" -ForegroundColor Green

# Navigate to nlp-python directory
$nlpDir = "apps\nlp-python"
if (Test-Path $nlpDir) {
    Set-Location $nlpDir
    Write-Host "Changed to directory: $nlpDir" -ForegroundColor Cyan
} else {
    Write-Host "Warning: $nlpDir not found. Creating venv in current directory." -ForegroundColor Yellow
}

# Create virtual environment
Write-Host "Creating virtual environment..." -ForegroundColor Cyan
& $pythonCmd -m venv .venv

if ($LASTEXITCODE -eq 0) {
    Write-Host "Virtual environment created successfully!" -ForegroundColor Green
    
    # Activate virtual environment
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & ".\.venv\Scripts\Activate.ps1"
    
    # Install dependencies
    if (Test-Path "requirements.txt") {
        Write-Host "Installing dependencies from requirements.txt..." -ForegroundColor Cyan
        & $pythonCmd -m pip install --upgrade pip
        & $pythonCmd -m pip install -r requirements.txt
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Dependencies installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "Warning: Some dependencies may have failed to install." -ForegroundColor Yellow
        }
    } else {
        Write-Host "No requirements.txt found. Skipping dependency installation." -ForegroundColor Yellow
    }
    
    Write-Host "`nSetup complete! Virtual environment is active." -ForegroundColor Green
    Write-Host "To activate it later, run: .\.venv\Scripts\Activate.ps1" -ForegroundColor Cyan
} else {
    Write-Host "Failed to create virtual environment." -ForegroundColor Red
    exit 1
}

