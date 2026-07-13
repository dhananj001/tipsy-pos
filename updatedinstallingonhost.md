# Tipsy POS Local Print Server: Windows Host Machine Installation Guide (ZIP Method)

This guide details the step-by-step process for installing and configuring the **Tipsy POS Local Print Server** on a client's local Windows PC using the **ZIP file method**.

This method is designed to be lightweight and simple, requiring **no Git installation** on the client's machine.

---

## 1. Prerequisites (On the Windows PC)

Before setting up the print server, install the following:

* **Node.js (LTS Version - v18 or newer)**
  * Download the Windows MSI installer from [nodejs.org](https://nodejs.org/).
  * Run the installer and check the box to *"Automatically install the necessary tools"* (this installs chocolatey/build tools if needed by certain native packages).

---

## 2. Step-by-Step Installation

### Step 2.1: Pack the Print Server
On your development machine, prepare the files:
1. Locate the `print-server` directory in your project.
2. **Exclude** the `node_modules` folder (do not include it in the ZIP, as dependencies will be installed directly on the Windows host machine).
3. Compress the remaining files inside the `print-server` folder into a ZIP file (e.g., `print-server.zip`).

### Step 2.2: Extract on Client's Windows PC
1. Transfer the `print-server.zip` to the client's computer (using USB drive, Google Drive, email, etc.).
2. Extract the contents to the root of the C drive:
   * **Target Path:** `C:\tipsy-pos-print-server\`

---

## 3. Configuration

1. In the extracted folder (`C:\tipsy-pos-print-server\`), copy the `.env.example` file and rename the copy to `.env`.
2. Open the `.env` file in Notepad and configure your credentials:

```ini
# Supabase Credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# POS Restaurant Context
# Replace with the unique UUID of this specific restaurant branch/location
RESTAURANT_ID=your-restaurant-uuid

# Print Server Options
PRINTER_CONNECTION_TIMEOUT=5000
```

> [!IMPORTANT]
> Make sure to use the **`SUPABASE_SERVICE_ROLE_KEY`** (found under Supabase Project Settings ➔ API). This backend key is required for the local print server to bypass Row Level Security (RLS) policies and listen to the print job queue.

---

## 4. Install Dependencies & Verify

Open **Command Prompt (cmd)** or **PowerShell** as **Administrator**, navigate to the directory, and run the following commands:

```cmd
cd C:\tipsy-pos-print-server
```

### Step 4.1: Install Node Packages
This downloads and installs the required drivers and packages:
```cmd
npm install
```

### Step 4.2: Run a Direct Hardware Test Print
Before connecting to the database, verify that your computer can communicate with the LAN printer. Run the built-in direct tester:
```cmd
node test-direct.js <printer-ip-address>
```
*Example:* `node test-direct.js 192.168.1.95`

*If this prints a sample ticket and cuts the paper, your local network setup is correct!*

### Step 4.3: Test the Live Connection
Run the server in development mode to test if it connects to Supabase and listens for print events:
```cmd
npm run dev
```
If it starts successfully, you will see a colorful banner and status logs indicating it has connected to Supabase Realtime. Send a test print from the admin web dashboard to verify. Press `Ctrl + C` to stop it.

---

## 5. Run Print Server 24/7 on Boot (Using PM2)

To ensure the print server runs in the background and starts automatically when the Windows computer boots up, configure it using PM2 (Process Manager 2):

### Step 5.1: Install PM2 globally
In your Command Prompt or PowerShell, run:
```cmd
npm install -g pm2
```

### Step 5.2: Start the application under PM2
Start the print server and save the process list so PM2 remembers it:
```cmd
pm2 start src/index.js --name "tipsy-print-server"
pm2 save
```

### Step 5.3: Set up automatic startup on Windows boot
To ensure PM2 resurrects your print server automatically when Windows starts:
1. Press `Win + R` on your keyboard, type **`shell:startup`**, and press Enter. This opens the Windows Startup folder.
2. Inside this folder, create a new text file and name it **`start-pos-printer.bat`** (make sure the file extension is `.bat`, not `.txt`).
3. Right-click the file, select **Edit** (with Notepad), and paste the following commands:
   ```batch
   @echo off
   pm2 resurrect
   ```
4. Save and close the file. The print server is now configured to start silently in the background whenever the computer logs in.

---

## 6. How to Perform Updates (Without Git)

When you make changes to the print-server code and need to update the client's Windows PC:

1. Package a new `print-server.zip` on your development machine (excluding `node_modules` and the `.env` file).
2. Transfer the file to the client's computer.
3. Open Command Prompt and stop the running PM2 print server:
   ```cmd
   pm2 stop tipsy-print-server
   ```
4. Copy the new files and overwrite the existing ones in `C:\tipsy-pos-print-server` (ensure their original `.env` file is NOT overwritten or deleted).
5. Run `npm install` to download any new packages if package configurations were modified:
   ```cmd
   npm install
   ```
6. Restart the print server:
   ```cmd
   pm2 start tipsy-print-server
   ```
