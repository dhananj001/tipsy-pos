# Tipsy POS: Windows Host Machine Installation & Remote Update Guide

This guide details the step-by-step workflow for installing and updating the **Tipsy POS Local Print Server** on a client's Windows PC. We use the **Git Sparse Checkout (Option B)** pattern to optimize security (only pulling print-server source code, not the entire Next.js codebase) and minimize disk footprint, while enabling simple, remote updates.

---

## 1. Prerequisites (To be installed on the Client's Windows PC)

Before setting up the print server, install the following software:

1. **Node.js (LTS Version - v18 or newer)**
   * Download the MSI installer from [nodejs.org](https://nodejs.org/).
   * Run the installer and check the box that says "Automatically install the necessary tools" (this installs Chocolatey/Build Tools if needed).
2. **Git for Windows**
   * Download from [git-scm.com](https://git-scm.com/download/win).
   * Install with default settings. Ensure Git is added to the system PATH (default choice).

---

## 2. Step-by-Step Installation: Git Sparse Checkout (Option B)

This process downloads **only** the `print-server` directory onto the Windows PC, leaving the frontend codebase secure in your remote repository.

Open **Command Prompt (cmd)** or **PowerShell** on the Windows machine and run the following commands:

### Step 2.1: Create & Navigate to the Destination Directory
```cmd
mkdir C:\tipsy-pos
cd C:\tipsy-pos
```

### Step 2.2: Initialize a Git Repository
```cmd
git init
```

### Step 2.3: Add Your Remote Repository Link
Configure your remote repository URL (replace with your actual GitHub username/repo link):
```cmd
git remote add origin https://github.com/your-username/tipsy-pos.git
```

### Step 2.4: Enable Sparse Checkout
Instruct Git to only fetch specific directories:
```cmd
git config core.sparseCheckout true
```

### Step 2.5: Specify the Folder to Download
Create the sparse-checkout configuration and specify that we only want the `print-server` directory:
```cmd
echo print-server/ >> .git/info/sparse-checkout
```

### Step 2.6: Pull the Code
Pull the code from your repository (usually the `main` or `master` branch):
```cmd
git pull origin main
```
*Verify that only the `print-server` directory is now visible in `C:\tipsy-pos`.*

---

## 3. Configuration & Dependency Installation

Navigate into the downloaded folder and install the Node.js packages:

```cmd
cd print-server
npm install
```

### Configure the Environment Variables:
1. In `C:\tipsy-pos\print-server`, copy `.env.example` to `.env`.
   ```cmd
   copy .env.example .env
   ```
2. Open the `.env` file in Notepad and configure:
   * **`SUPABASE_URL`**: Your production Supabase project URL.
   * **`SUPABASE_SERVICE_ROLE_KEY`**: Your Supabase `service_role` key (required to bypass RLS and read print job queues).
   * **`RESTAURANT_ID`**: The unique UUID of this specific restaurant branch.
3. Test if the server boots up correctly:
   ```cmd
   npm start
   ```
   *(If it boots without errors, stop it using `Ctrl + C` and proceed to daemonize it).*

---

## 4. Run Print Server 24/7 on Boot

To prevent the print server from closing when the terminal window is closed, we need to run it as a service. You have two excellent options on Windows:

### Option A: Using NSSM (Non-Sucking Service Manager) — *Recommended for production*
NSSM is a lightweight tool that runs any executable/script as a native Windows service. It runs in the background on startup, even if no user logs in.

1. Download NSSM from [nssm.cc/download](https://nssm.cc/download).
2. Extract the `nssm.exe` file (from the `win64` folder in the zip) and place it in `C:\windows\system32` (or inside `C:\tipsy-pos\print-server`).
3. Open Command Prompt as **Administrator** and run:
   ```cmd
   nssm install tipsy-print-server
   ```
4. A GUI configuration window will open. Fill it in as follows:
   * **Path**: Select the path to your Node.js executable (usually `C:\Program Files\nodejs\node.exe`).
   * **Startup directory**: `C:\tipsy-pos\print-server`
   * **Arguments**: `src/index.js`
5. Click **Install service**.
6. Start the service:
   ```cmd
   nssm start tipsy-print-server
   ```
   *The print server is now running as a native Windows service.*

---

### Option B: Using PM2 + Windows Startup Script
If you prefer managing processes via PM2 commands:

1. Install PM2 globally:
   ```cmd
   npm install -g pm2
   ```
2. Start the application:
   ```cmd
   pm2 start src/index.js --name "tipsy-print-server"
   pm2 save
   ```
3. To ensure PM2 starts when Windows boots up:
   * Press `Win + R`, type `shell:startup`, and press Enter. This opens the Startup folder.
   * Create a new text file named `start-pos-printer.bat`.
   * Open it in Notepad and add:
     ```batch
     @echo off
     pm2 resurrect
     ```
   * Save and close the file. PM2 will now resurrect your print server whenever a user logs in.

---

## 5. Workflow for Remote Updates

When you change the print-server code locally and push it to GitHub, follow these steps to update the client's PC.

Create a file named `update.bat` in `C:\tipsy-pos\print-server\`:

```batch
@echo off
cd C:\tipsy-pos\print-server
echo ==========================================
echo Updating Tipsy Print Server...
echo ==========================================

:: Pull latest code from github
git pull origin main

:: Re-install packages if package.json changed
call npm install

:: Restart the service to apply changes
:: (Uncomment the section corresponding to your choice in Section 4)

:: IF YOU CHOSE OPTION A (NSSM):
nssm restart tipsy-print-server

:: IF YOU CHOSE OPTION B (PM2):
:: pm2 restart tipsy-print-server

echo Update completed successfully!
pause
```

### How to trigger this update remotely:
* **Manual Remote Control:** Log in via AnyDesk / TeamViewer / Chrome Remote Desktop, double-click `update.bat`, and the server updates and restarts in 3 seconds.
* **Command Line/SSH:** If you have an SSH server enabled on their Windows machine, run `ssh admin@client-ip "C:\tipsy-pos\print-server\update.bat"`.
* **Automated Scheduler:** You can set up a Windows Task Scheduler task to run `update.bat` every night at 3:00 AM automatically.
