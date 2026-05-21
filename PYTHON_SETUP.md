# Python Setup Guide

## Problem
You're getting the error: `python : The term 'python' is not recognized`

This means Python is not installed on your system or not in your PATH.

## Solution: Install Python

### Option 1: Download from Python.org (Recommended)

1. **Download Python:**
   - Go to: https://www.python.org/downloads/
   - Click "Download Python 3.12.x" (or latest version)

2. **Install Python:**
   - Run the downloaded installer
   - **IMPORTANT:** Check the box "Add Python to PATH" at the bottom of the first screen
   - Click "Install Now"
   - Wait for installation to complete

3. **Verify Installation:**
   - Close and reopen your PowerShell terminal
   - Run: `python --version`
   - You should see something like: `Python 3.12.x`

### Option 2: Install from Microsoft Store

1. Open Microsoft Store
2. Search for "Python 3.12" or "Python 3.11"
3. Click "Install"
4. This automatically adds Python to PATH

### Option 3: Use Chocolatey (if installed)

```powershell
choco install python
```

## After Installing Python

1. **Close and reopen your PowerShell terminal** (important for PATH to update)

2. **Navigate to the project:**
   ```powershell
   cd apps\nlp-python
   ```

3. **Create virtual environment:**
   ```powershell
   python -m venv .venv
   ```

4. **Activate virtual environment:**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   If you get an execution policy error, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

5. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

## Quick Setup Script

Alternatively, after installing Python, you can run the setup script from the project root:

```powershell
.\setup-venv.ps1
```

This will automatically:
- Check for Python
- Create the virtual environment
- Install dependencies

## Troubleshooting

### Python still not found after installation?
- Make sure you checked "Add Python to PATH" during installation
- Close and reopen your terminal
- Restart your computer if needed

### Execution Policy Error?
If you see: "cannot be loaded because running scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Still having issues?
Check if Python is installed but not in PATH:
```powershell
Get-Command python* -ErrorAction SilentlyContinue
```

