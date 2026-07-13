import { ThermalPrinter, PrinterTypes } from "node-thermal-printer";
import fs from "fs";
import { exec } from "child_process";
import path from "path";

// Extend ThermalPrinter prototype with helper methods to map to the correct library functions
ThermalPrinter.prototype.printBoldTrue = function() {
  this.bold(true);
};
ThermalPrinter.prototype.printBoldFalse = function() {
  this.bold(false);
};

import { logger } from "../utils/logger.js";
import { CONFIG } from "../config/supabase.js";

/**
 * Recursively sanitizes strings in the payload object to prevent printing gibberish.
 * Replaces Indian Rupee symbol (₹) with 'Rs.' and strips all non-ASCII characters.
 */
function sanitizePayload(obj) {
  if (typeof obj === "string") {
    return obj
      .replace(/₹/g, "Rs.")
      .replace(/[^\x00-\x7F]/g, "")
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizePayload);
  }
  if (typeof obj === "object" && obj !== null) {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = sanitizePayload(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

/**
 * Core Printer Service
 * Connects to ESC/POS LAN printers and renders styled receipts/KOTs.
 */
export const printerService = {
  /**
   * Print a job payload to a network printer
   * @param {Object} job - The print job record
   * @param {Object} printerInfo - The printer metadata (ip, port, type, etc.)
   * @returns {Promise<boolean>} Resolves to true if printed successfully
   */
  print: async (job, printerInfo) => {
    const { ip_address, port, name: printerName } = printerInfo;
    const printerIp = ip_address.trim();
    
    // Support Windows shared printer UNC paths (e.g. \\localhost\RP3160) or custom interfaces
    let connectionUri;
    if (printerIp.startsWith("\\\\") || printerIp.startsWith("//") || printerIp.startsWith("printer:")) {
      connectionUri = printerIp;
    } else {
      const printerPort = port || 9100;
      connectionUri = `tcp://${printerIp}:${printerPort}`;
    }

    logger.info(`Attempting print job [${job.id}] on printer: ${printerName} (${connectionUri})`);

    // Sanitize the print payload to prevent printer configuration and character set issues
    const payload = sanitizePayload(job.payload || {});

    // Initialize the thermal printer
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // Standard ESC/POS
      interface: connectionUri,
      timeout: CONFIG.printerTimeout,
      characterSet: "SLOVENIA", // Support standard Latin/ASCII character sets
      removeSpecialCharacters: false
    });

    try {
      // 1. Clear printer buffer
      printer.clear();

      // 2. Format print document based on job type
      const jobType = (payload.type || "KOT").toUpperCase();
      if (jobType === "KOT") {
        renderKOT(printer, payload);
      } else if (jobType === "BILL" || jobType === "INVOICE") {
        renderBill(printer, payload);
      } else {
        renderGeneric(printer, payload);
      }

      // 3. Cut Paper
      printer.cut();

      // 4. Execute printing
      if (connectionUri.startsWith("\\\\") || connectionUri.startsWith("//")) {
        // For USB shared printers on Windows, write the buffer to a temp file and copy it to the printer share path
        const buffer = printer.getBuffer();
        const tempFilePath = path.join(process.cwd(), `temp_print_${Date.now()}.bin`);
        
        await fs.promises.writeFile(tempFilePath, buffer);
        
        await new Promise((resolve, reject) => {
          // Normalize backslashes for Windows copy command
          const normalizedPath = connectionUri.replace(/\//g, "\\");
          exec(`copy /B "${tempFilePath}" "${normalizedPath}"`, (error, stdout, stderr) => {
            if (error) {
              logger.error(`Shell copy to printer failed: ${stderr || error.message}`);
              reject(new Error(stderr || error.message));
            } else {
              logger.info(`Shell copy stdout: ${stdout.trim()}`);
              resolve();
            }
          });
        });
        
        // Clean up temp file
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (e) {
          logger.warn(`Failed to clean up temp file ${tempFilePath}: ${e.message}`);
        }
      } else {
        // Standard TCP print execute
        await printer.execute();
      }
      logger.success(`Successfully printed job [${job.id}] on ${printerName}`);
      return true;
    } catch (error) {
      logger.error(`Printing failed for job [${job.id}] on printer [${printerName}]:`, error);
      throw error;
    }
  }
};

/**
 * Render Kitchen Order Ticket (KOT)
 * Focus: High legibility, large table number, clear notes for modifiers.
 */
function renderKOT(printer, payload) {
  const {
    restaurantName = "Tipsy POS",
    tableName = "Table",
    tableNumber = "N/A",
    captainName = "Captain",
    kotNumber = "",
    orderId = "",
    timestamp = new Date().toISOString(),
    items = []
  } = payload;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' });

  // Header Banner
  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.setTextDoubleWidth();
  printer.printBoldTrue();
  printer.println("--- KOT ---");
  printer.setTextNormal();
  printer.printBoldFalse();
  printer.newLine();

  // Big Table Number for Waiter/Chef reference
  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.setTextDoubleWidth();
  printer.printBoldTrue();
  printer.println(`${tableName.toUpperCase()} - ${tableNumber}`);
  printer.setTextNormal();
  printer.printBoldFalse();
  printer.newLine();

  // Ticket Meta Information
  printer.alignLeft();
  printer.println(`Date: ${formattedDate}   Time: ${formattedTime}`);
  if (kotNumber) printer.println(`KOT #: ${kotNumber}`);
  if (orderId) printer.println(`Order ID: ${orderId.substring(0, 8)}...`);
  printer.println(`Captain: ${captainName}`);
  printer.drawLine();

  // Columns Header
  // 48 columns standard for 80mm thermal paper
  // QTY (5) | ITEM NAME (33) | TYPE/NOTES
  printer.printBoldTrue();
  printer.println(padRight("QTY", 6) + "ITEM NAME");
  printer.printBoldFalse();
  printer.drawLine();

  // List Items
  items.forEach(item => {
    // Large Qty for absolute clarity
    printer.setTextDoubleHeight();
    printer.printBoldTrue();
    printer.print(padRight(` ${item.quantity}x `, 7));
    
    printer.setTextNormal();
    printer.printBoldFalse();
    
    // Print item name
    printer.println(item.name);

    // If item has kitchen modifiers/notes, print prominently
    if (item.notes && item.notes.trim()) {
      printer.setTextDoubleWidth();
      printer.printBoldTrue();
      printer.println(`  * NOTE: ${item.notes.trim().toUpperCase()}`);
      printer.setTextNormal();
      printer.printBoldFalse();
    }
    
    printer.newLine();
  });

  printer.drawLine();
  printer.alignCenter();
  printer.println(`Generated at ${formattedTime}`);
  printer.newLine();
}

/**
 * Render Customer Invoice / Bill
 * Focus: Professional receipt format with subtotal, tax details, payment method, and footer.
 */
function renderBill(printer, payload) {
  const {
    restaurantName = "Tipsy POS",
    restaurantAddress = "",
    restaurantPhone = "",
    tableName = "Table",
    tableNumber = "N/A",
    captainName = "Captain",
    invoiceNumber = "",
    orderId = "",
    timestamp = new Date().toISOString(),
    items = [],
    subtotal = 0,
    taxPercent = 0,
    taxAmount = 0,
    grandTotal = 0,
    paymentMethod = "Pending",
    isPaid = false
  } = payload;

  const formattedTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = new Date(timestamp).toLocaleDateString([], { day: '2-digit', month: 'short' });

  // Restaurant Brand Header
  printer.alignCenter();
  printer.setTextDoubleHeight();
  printer.printBoldTrue();
  printer.println(restaurantName.toUpperCase());
  printer.setTextNormal();
  printer.printBoldFalse();

  if (restaurantAddress) printer.println(restaurantAddress);
  if (restaurantPhone) printer.println(`Phone: ${restaurantPhone}`);
  printer.newLine();

  // Bill Header Title
  printer.setTextDoubleHeight();
  printer.printBoldTrue();
  printer.println(isPaid ? "PAID INVOICE" : "ESTIMATE BILL");
  printer.setTextNormal();
  printer.printBoldFalse();
  printer.newLine();

  // Metadata
  printer.alignLeft();
  printer.println(`Date: ${formattedDate}   Time: ${formattedTime}`);
  if (invoiceNumber) printer.println(`Invoice: ${invoiceNumber}`);
  printer.println(`${tableName}: ${tableNumber} | Captain: ${captainName}`);
  printer.drawLine();

  // Columns: Qty & Item (32 chars) | Price (8 chars) | Total (8 chars)
  printer.printBoldTrue();
  printer.println(
    padRight("QTY & ITEM", 30) + 
    padLeft("PRICE", 9) + 
    padLeft("TOTAL", 9)
  );
  printer.printBoldFalse();
  printer.drawLine();

  // List Items
  items.forEach(item => {
    const itemTotal = (item.quantity * item.price).toFixed(2);
    const priceStr = parseFloat(item.price).toFixed(2);
    
    // Format description
    const qtyAndName = `${item.quantity} x ${item.name}`;
    
    if (qtyAndName.length <= 30) {
      printer.println(
        padRight(qtyAndName, 30) + 
        padLeft(priceStr, 9) + 
        padLeft(itemTotal, 9)
      );
    } else {
      // Wrap text cleanly if long item name
      printer.println(qtyAndName.substring(0, 30));
      printer.println(
        padRight("  " + qtyAndName.substring(30), 30) + 
        padLeft(priceStr, 9) + 
        padLeft(itemTotal, 9)
      );
    }
  });
  printer.drawLine();

  // Totals Section
  printer.alignRight();
  printer.println(`Subtotal: ${padLeft(parseFloat(subtotal).toFixed(2), 10)}`);
  
  if (taxPercent > 0 || taxAmount > 0) {
    const taxLabel = `Tax (${taxPercent}%):`;
    printer.println(`${taxLabel} ${padLeft(parseFloat(taxAmount).toFixed(2), 10)}`);
  }
  
  printer.drawLine();
  printer.setTextDoubleHeight();
  printer.printBoldTrue();
  printer.println(`GRAND TOTAL: ${padLeft(parseFloat(grandTotal).toFixed(2), 10)}`);
  printer.setTextNormal();
  printer.printBoldFalse();
  printer.newLine();

  // Payment Mode
  printer.alignLeft();
  printer.println(`Payment Mode: ${paymentMethod.toUpperCase()}`);
  printer.println(`Payment Status: ${isPaid ? "COMPLETED" : "UNPAID"}`);
  printer.drawLine();

  // Footer Message
  printer.alignCenter();
  printer.printBoldTrue();
  printer.println("THANK YOU FOR DINING WITH US!");
  printer.printBoldFalse();
  printer.println("Please visit again.");
  printer.newLine();
}

/**
 * Render Generic/Plain print payload
 */
function renderGeneric(printer, payload) {
  printer.alignCenter();
  if (payload.title) {
    printer.setTextDoubleHeight();
    printer.printBoldTrue();
    printer.println(payload.title);
    printer.setTextNormal();
    printer.printBoldFalse();
    printer.newLine();
  }

  printer.alignLeft();
  if (payload.text) {
    printer.println(payload.text);
  } else {
    printer.println(JSON.stringify(payload, null, 2));
  }
  printer.newLine();
}

// Formatting helpers
function padRight(str, len) {
  str = String(str);
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

function padLeft(str, len) {
  str = String(str);
  return str.length >= len ? str : " ".repeat(len - str.length) + str;
}
