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

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Printing operation timed out (12000ms). Verify printer is powered on, connected to the network/host, and the IP/UNC share path '${connectionUri}' is correct.`));
      }, 12000);

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
          
          await new Promise((res, rej) => {
            // Normalize backslashes for Windows copy command
            const normalizedPath = connectionUri.replace(/\//g, "\\");
            exec(`copy /B "${tempFilePath}" "${normalizedPath}"`, { timeout: 8000 }, (error, stdout, stderr) => {
              if (error) {
                logger.error(`Shell copy to printer failed: ${stderr || error.message}`);
                rej(new Error(stderr || error.message));
              } else {
                logger.info(`Shell copy stdout: ${stdout.trim()}`);
                res();
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
        clearTimeout(timeoutId);
        resolve(true);
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error(`Printing failed for job [${job.id}] on printer [${printerName}]:`, error);
        reject(error);
      }
    });
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
 * Focus: Professional consolidated receipt in a single invoice page.
 */
function renderBill(printer, payload) {
  let {
    restaurantName = "Tipsy POS",
    restaurantAddress = "",
    restaurantPhone = "",
    tableName = "Table",
    tableNumber = "N/A",
    captainName = "Captain",
    invoiceNumber = "",
    timestamp = new Date().toISOString(),
    items = [],
    subtotal = 0,
    taxPercent = 0,
    vatPercent = 0,
    discountPercent = 0,
    serviceChargePercent = 0,
    capacity = 0,
    gstin = "",
    vattin = ""
  } = payload;

  // Professional defaults matching DotPe style for "Tipsy Duckling" if not explicitly provided
  if (restaurantName.toLowerCase().includes("tipsy") || restaurantName.toLowerCase().includes("duckling")) {
    if (!gstin) gstin = "27AEUFS6964H1Z3";
    if (!vattin) vattin = "2855160048V";
    if (!restaurantAddress) restaurantAddress = "Pune";
    if (!restaurantPhone) restaurantPhone = "9130182609";
  }

  // Filter items by type (bar items get VAT, everything else gets GST)
  const gstItems = items.filter(item => (item.printer_type || "kitchen").toLowerCase() !== "bar");
  const vatItems = items.filter(item => (item.printer_type || "").toLowerCase() === "bar");

  // Helper functions for formatting
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    const m = months[date.getMonth()];
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    let hrs = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const actualAmpm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    const hrsStr = String(hrs).padStart(2, '0');
    return `${m} ${d} ${y} ${hrsStr}:${mins} ${actualAmpm}`;
  };

  const formattedDateTime = formatDateTime(timestamp);

  // Calculate values
  const totalSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDiscount = totalSubtotal * (discountPercent / 100);

  // GST portion calculations
  const gstSubtotal = gstItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gstDiscount = gstSubtotal * (discountPercent / 100);
  const gstTaxable = Math.max(0, gstSubtotal - gstDiscount);
  const cgstAmount = gstTaxable * (taxPercent / 2 / 100);
  const sgstAmount = gstTaxable * (taxPercent / 2 / 100);

  // VAT portion calculations
  const vatSubtotal = vatItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatDiscount = vatSubtotal * (discountPercent / 100);
  const vatTaxable = Math.max(0, vatSubtotal - vatDiscount);
  const vatAmountCalculated = vatTaxable * (vatPercent / 100);

  // Service Charge calculation (on overall subtotal)
  const totalServiceCharge = totalSubtotal * (serviceChargePercent / 100);

  const totalBeforeRounding = totalSubtotal - totalDiscount + cgstAmount + sgstAmount + vatAmountCalculated + totalServiceCharge;
  const totalRounded = Math.round(totalBeforeRounding);

  const drawCustomLine = () => {
    printer.println("-".repeat(48));
  };

  const formatInvoiceRow = (name, qty, rate, amount) => {
    const qtyStr = String(qty);
    const rateStr = parseFloat(rate).toFixed(0);
    const amountStr = parseFloat(amount).toFixed(2);

    if (name.length <= 24) {
      return padRight(name, 26) + padLeft(qtyStr, 5) + padLeft(rateStr, 7) + padLeft(amountStr, 10);
    } else {
      const line1 = name.substring(0, 24);
      const line2 = name.substring(24);
      return padRight(line1, 26) + padLeft(qtyStr, 5) + padLeft(rateStr, 7) + padLeft(amountStr, 10) + "\n" + padRight("  " + line2, 48);
    }
  };

  // Header / Title
  printer.alignCenter();
  printer.printBoldTrue();
  printer.println("Order (Invoice)");
  printer.printBoldFalse();
  printer.newLine();

  // Table / Pax
  printer.setTextDoubleHeight();
  printer.setTextDoubleWidth();
  printer.printBoldTrue();
  const paxStr = capacity ? ` (Pax - ${capacity})` : '';
  printer.println(`${tableName === 'Table' ? 'H' : tableName}${tableNumber}${paxStr}`);
  printer.setTextNormal();
  printer.printBoldFalse();
  printer.newLine();

  // Metadata
  printer.alignLeft();
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  printer.println(
    padRight(`Order ${invoiceNumber}`, 24) + 
    padLeft(`${items.length} ${items.length === 1 ? 'item' : 'items'} (${totalQty} Qty)`, 24)
  );
  printer.println(
    padRight(formattedDateTime, 24) + 
    padLeft(captainName, 24)
  );
  drawCustomLine();

  // Table Header
  printer.printBoldTrue();
  printer.println(
    padRight("Name", 26) + 
    padLeft("Qty", 5) + 
    padLeft("Rate", 7) + 
    padLeft("Amount", 10)
  );
  printer.printBoldFalse();
  drawCustomLine();

  // Print all items in one table
  items.forEach(item => {
    const rowStr = formatInvoiceRow(item.name, item.quantity, item.price, item.quantity * item.price);
    printer.println(rowStr);
  });
  drawCustomLine();

  // Totals
  printer.alignRight();
  printer.println(padRight("Sub Total", 34) + padLeft(totalSubtotal.toFixed(2), 14));

  if (totalDiscount > 0) {
    printer.println(padRight(`Discount (${discountPercent}%):`, 34) + padLeft((-totalDiscount).toFixed(2), 14));
  }

  if (cgstAmount > 0) {
    printer.println(padRight(`CGST ${(taxPercent/2).toFixed(1)}% on ${gstTaxable.toFixed(2)}`, 34) + padLeft(cgstAmount.toFixed(2), 14));
  }
  if (sgstAmount > 0) {
    printer.println(padRight(`SGST ${(taxPercent/2).toFixed(1)}% on ${gstTaxable.toFixed(2)}`, 34) + padLeft(sgstAmount.toFixed(2), 14));
  }

  if (vatAmountCalculated > 0) {
    printer.println(padRight(`VAT ${vatPercent.toFixed(1)}% on ${vatTaxable.toFixed(2)}`, 34) + padLeft(vatAmountCalculated.toFixed(2), 14));
  }

  if (totalServiceCharge > 0) {
    printer.println(padRight(`Service Charge (${serviceChargePercent}%):`, 34) + padLeft(totalServiceCharge.toFixed(2), 14));
  }

  drawCustomLine();
  printer.printBoldTrue();
  printer.println(padRight("Bill Total", 34) + padLeft(totalBeforeRounding.toFixed(2), 14));
  printer.newLine();
  printer.println(padRight("Bill Total (rounded)", 34) + padLeft(totalRounded.toFixed(2), 14));
  printer.printBoldFalse();
  drawCustomLine();

  // Footer
  printer.alignCenter();
  printer.printBoldTrue();
  printer.println(restaurantName);
  printer.printBoldFalse();
  if (restaurantAddress) printer.println(restaurantAddress);
  if (restaurantPhone) printer.println(restaurantPhone);
  
  if (gstin) {
    printer.println(`GSTIN - ${gstin}`);
  }
  if (vattin) {
    printer.println(`VATTIN - ${vattin}`);
  }
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
