# Tipsy POS Local Print Server - Complete PM2 Setup & Operations Guide

> **Target Machine**: `DESKTOP-VJVJQ4E` (Cashier / POS Host PC)  
> **Installation Folder**: `C:\tipsy-pos-print-server\`  
> **Service Name**: `tipsy-print-server`  
> **Purpose**: Runs the local Node.js print server 24/7 in the background with auto-restart on boot and crash recovery.

---

## 1. Why Switch from `npm run dev` to PM2?

| Feature | `npm run dev` (Current) | PM2 (Permanent Setup) |
|---|---|---|
| **Terminal Window** | Must stay open. If closed, printing stops. | **Runs 100% invisibly in the background.** |
| **PC Reboot / Power Cut** | Does not restart automatically. | **Starts automatically when Windows boots up.** |
| **Crash / WiFi Blip** | Shuts down with an error. | **Restarts automatically within 1 second.** |
| **Daily Operation** | Staff must manually run commands. | **Zero touch. Cashier just turns on PC.** |

---

## 2. Step-by-Step PM2 Setup on the Windows PC

Perform these steps directly on the Windows computer (`DESKTOP-VJVJQ4E`).

### Step 1: Stop the Currently Running `npm run dev`
1. Go to the open Command Prompt / PowerShell window where `npm run dev` is currently running.
2. Press **`Ctrl + C`** on the keyboard.
3. When prompted `Terminate batch job (Y/N)?`, type **`Y`** and press **Enter**.

---

### Step 2: Open Command Prompt as Administrator
1. Click the Windows Start menu.
2. Type **`cmd`**.
3. Right-click on **Command Prompt** and select **Run as Administrator**.

---

### Step 3: Navigate to the Print Server Directory
In the administrator Command Prompt, run:
```cmd
cd C:\tipsy-pos-print-server
```

---

### Step 4: Install PM2 Globally
Install PM2 so it can be accessed from anywhere on the PC:
```cmd
npm install -g pm2
```
*(Wait 10–20 seconds for the installation to finish).*

---

### Step 5: Start the Print Server Under PM2
Start the print server in production mode and give it a clean service name:
```cmd
pm2 start npm --name "tipsy-print-server" -- start
```

You will see a green table in the terminal showing:
```
┌────┬──────────────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name                 │ mode    │ ↺       │ status   │ cpu    │ memory│
├────┼──────────────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
│ 0  │ tipsy-print-server   │ fork    │ 0       │ online   │ 0%     │ 45mb │
└────┴──────────────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┘
```
**`status: online`** indicates the service is active and listening to Supabase!

---

### Step 6: Configure Auto-Start on Windows Boot

To make sure the print server starts automatically whenever the PC is turned on or rebooted:

#### Method A: Using `pm2-windows-startup` (Recommended)
In the same Administrator Command Prompt, run:
```cmd
npm install -g pm2-windows-startup
pm2-startup install
pm2 save
```

#### Method B: Fallback (Standard PM2 Save)
If `pm2-windows-startup` is already configured:
```cmd
pm2 save
```

---

## 3. Daily Operations & Useful Commands

All of these commands can be run from any Command Prompt window on that machine:

### Check Status (Is it running?)
```cmd
pm2 status
```

### View Live Print Logs (See tickets being printed)
```cmd
pm2 logs tipsy-print-server --lines 50
```
*(Press `Ctrl + C` to exit the log view. The background service will keep running).*

### Restart the Print Server (e.g., after editing `.env`)
```cmd
pm2 restart tipsy-print-server --update-env
```

### Stop the Print Server (Temporarily)
```cmd
pm2 stop tipsy-print-server
```

### Start it Back Up
```cmd
pm2 start tipsy-print-server
```

---

## 4. Hardware Verification & Test Printing

After starting PM2, verify that the printers respond:

1. **Check Realtime Connection**:
   Run:
   ```cmd
   pm2 logs tipsy-print-server --lines 20
   ```
   You should see:
   `[SUCCESS] Real-time printer configuration cache synchronization is active.`  
   `[SUCCESS] All listener services are active and running!`

2. **Send a Test Print from the Web App**:
   - Go to your Tipsy POS dashboard: `http://localhost:3000/dashboard/printers` (or hosted URL).
   - Click **Test Print** next to `Kitchen One`, `Counter One`, or `Bar One`.
   - The physical thermal printer will print a test receipt and cut the paper.

---

## 5. Troubleshooting Cheatsheet

| Issue | Cause | Fix |
|---|---|---|
| **Status says `errored` or `stopped`** | Missing `.env` or port already occupied | Run `pm2 logs tipsy-print-server --err` to see the exact error message. |
| **PC rebooted but print server didn't start** | `pm2 save` was not run after starting | Run `cd C:\tipsy-pos-print-server`, then `pm2 start npm --name "tipsy-print-server" -- start`, followed by `pm2 save`. |
| **USB Printer says offline** | Windows share path not shared | Ensure the USB printer is shared under Windows Settings -> Printers -> Sharing as `rp3160` or `barip195`. |
| **LAN Printer not printing** | IP address changed by router | Verify printer IP is still `192.168.1.95`. If router assigned a new IP, update it in `/dashboard/printers`. |
