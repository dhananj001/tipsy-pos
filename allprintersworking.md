# Tipsy POS - Local Print Server & Printer Setup Guide

This document records the exact architecture, modifications, and hardware configurations implemented to get all KOT/Bill printing working seamlessly. **Do not modify these core mechanics further as the system is now stable and fully operational.**

---

## 1. System Architecture

The print system relies on a hybrid cloud-to-local bridge:
1. **Supabase Cloud Database:** Orders place new print jobs into the `print_jobs` table.
2. **Supabase Realtime:** broadcasts `INSERT` events via WebSockets immediately to any connected clients.
3. **Local Print Server (Node.js):** Runs as a persistent PM2 background service on the host machine (`DESKTOP-VJVJQ4E`), subscribing to these events.
4. **Local Hardware Spooling:** The print server routes print jobs directly to their respective hardware ports (TCP for network/LAN printers, and native Windows Spooler copy for shared USB printers).

---

## 2. Core Fixes Implemented

### A. Extended API Compatibility Hotfix
*   **Problem:** The `node-thermal-printer` library threw `TypeError: printer.printBoldTrue is not a function` and crashed the print loop when executing orders.
*   **Solution:** Extended the `ThermalPrinter` prototype at the top of `print-server/src/services/printer.js` to map these deprecated calls to the library's correct native `.bold(true)` and `.bold(false)` methods.

### B. Windows USB Shared Printer Spooling Bypass
*   **Problem:** USB printers (like the Counter RP3160 Gold) cannot be connected to via raw TCP socket IP addresses. However, when trying to print to a Windows shared UNC path (`\\localhost\rp3160`), the library's file interface timed out after 5 seconds due to a buggy internal queue library (`write-file-queue`).
*   **Solution:** Bypassed `printer.execute()` for any connection URI starting with `\\` or `//`. Instead, the server writes the formatted ESC/POS printer buffer to a temporary binary file and uses the native Windows command prompt command (`copy /B "tempfile" "\\hostname\share"`) to copy the data directly into the Windows spooler. This is the most robust and standard method of raw printing on Windows.

### C. Heartbeat / Health Check Bypass
*   **Problem:** Shared local USB printers don't listen on a TCP port, meaning the print server's background status checks kept marking the Counter printer as `OFFLINE`.
*   **Solution:** Updated the `checkPrinterConnection` function in `listener.js` to immediately return `online` for any printer whose IP/path starts with `\\` or `//`, preventing false offline alerts.

### D. Dashboard Form Validation Update
*   **Problem:** The printers admin page rejected any input that wasn't a standard IPv4 address, blocking admins from inputting shared printer UNC paths.
*   **Solution:** Updated the form validation in `src/app/(admin)/dashboard/printers/page.tsx` to allow inputs starting with `\\`, `//`, or `printer:`, and updated placeholders and helper labels to guide administrators.

---

## 3. Current Working Configurations

| Printer Name | Connection Type | Mapped Port / Address | Windows Share Name |
| :--- | :--- | :--- | :--- |
| **Kitchen One** | Network (LAN) | `192.168.1.95:9100` | N/A |
| **Counter One** | Local USB | `\\DESKTOP-VJVJQ4E\rp3160` | `rp3160` |
| **Bar One** | Local USB | `\\DESKTOP-VJVJQ4E\barip195` | `barip195` |

---

## 4. Maintenance & Commands

### Restarting the Print Server
If you change `.env` configurations or deploy code updates on the host machine, run:
```cmd
pm2 restart tipsy-print-server --update-env
```

### Viewing Logs
To verify that events are being received and printed, run:
```cmd
pm2 logs tipsy-print-server --lines 100
```

### Checking Status
```cmd
pm2 status
```
