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
 * Focus: Professional split receipt matching DotPe format (Consolidated Statement & separate GST/VAT Invoices).
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

  const hasGst = gstItems.length > 0;
  const hasVat = vatItems.length > 0;

  // Helper functions for formatting
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    const m = months[date.getMonth()];
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    let hrs = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hrs >= 12 ? 'AM' : 'AM'; // Match AM/PM correctly
    const displayAmpm = hrs >= 12 ? 'AM' : 'AM'; // For mock consistency if preferred, let's keep real AM/PM
    const actualAmpm = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12;
    hrs = hrs ? hrs : 12;
    const hrsStr = String(hrs).padStart(2, '0');
    return `${m} ${d} ${y} ${hrsStr}:${mins} ${actualAmpm}`;
  };

  const formattedDateTime = formatDateTime(timestamp);

  // Calculate values for GST group
  const gstSubtotal = gstItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gstDiscount = gstSubtotal * (discountPercent / 100);
  const gstTaxable = Math.max(0, gstSubtotal - gstDiscount);
  const cgstAmount = gstTaxable * (taxPercent / 2 / 100);
  const sgstAmount = gstTaxable * (taxPercent / 2 / 100);
  const gstServiceCharge = gstSubtotal * (serviceChargePercent / 100);
  const gstTotal = gstTaxable + cgstAmount + sgstAmount + gstServiceCharge;

  // Calculate values for VAT group
  const vatSubtotal = vatItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatDiscount = vatSubtotal * (discountPercent / 100);
  const vatTaxable = Math.max(0, vatSubtotal - vatDiscount);
  const vatAmountCalculated = vatTaxable * (vatPercent / 100);
  const vatServiceCharge = vatSubtotal * (serviceChargePercent / 100);
  const vatTotal = vatTaxable + vatAmountCalculated + vatServiceCharge;

  const totalBeforeRounding = (hasGst ? gstTotal : 0) + (hasVat ? vatTotal : 0);
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

  // Helper to print a single invoice section
  const printInvoiceSection = (title, secItems, secSubtotal, secDiscount, secServiceCharge, isGstSec, isVatSec, secTotal) => {
    printer.alignCenter();
    printer.printBoldTrue();
    printer.println(title);
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
    const totalSecQty = secItems.reduce((sum, item) => sum + item.quantity, 0);
    const invoiceNoSuffix = isGstSec ? "-A" : isVatSec ? "-B" : "";
    const displayInvoiceNo = invoiceNumber ? `${invoiceNumber}${invoiceNoSuffix}` : "";
    
    printer.println(
      padRight(`Order ${displayInvoiceNo}`, 24) + 
      padLeft(`${secItems.length} ${secItems.length === 1 ? 'item' : 'items'} (${totalSecQty} Qty)`, 24)
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

    // Items
    secItems.forEach(item => {
      const rowStr = formatInvoiceRow(item.name, item.quantity, item.price, item.quantity * item.price);
      printer.println(rowStr);
    });
    drawCustomLine();

    // Totals
    printer.alignRight();
    printer.println(padRight("Sub Total", 34) + padLeft(secSubtotal.toFixed(2), 14));

    if (secDiscount > 0) {
      printer.println(padRight(`Discount (${discountPercent}%):`, 34) + padLeft((-secDiscount).toFixed(2), 14));
    }

    if (isGstSec) {
      if (cgstAmount > 0) {
        printer.println(padRight(`CGST ${(taxPercent/2).toFixed(1)}% on ${gstTaxable.toFixed(2)}`, 34) + padLeft(cgstAmount.toFixed(2), 14));
      }
      if (sgstAmount > 0) {
        printer.println(padRight(`SGST ${(taxPercent/2).toFixed(1)}% on ${gstTaxable.toFixed(2)}`, 34) + padLeft(sgstAmount.toFixed(2), 14));
      }
    }

    if (isVatSec) {
      if (vatAmountCalculated > 0) {
        printer.println(padRight(`VAT ${vatPercent.toFixed(1)}% on ${vatTaxable.toFixed(2)}`, 34) + padLeft(vatAmountCalculated.toFixed(2), 14));
      }
    }

    if (secServiceCharge > 0) {
      printer.println(padRight(`Service Charge (${serviceChargePercent}%):`, 34) + padLeft(secServiceCharge.toFixed(2), 14));
    }

    drawCustomLine();
    printer.printBoldTrue();
    printer.println(padRight("Bill Total", 34) + padLeft(secTotal.toFixed(2), 14));
    printer.printBoldFalse();
    printer.newLine();

    // Footer
    printer.alignCenter();
    printer.printBoldTrue();
    printer.println(restaurantName);
    printer.printBoldFalse();
    if (restaurantAddress) printer.println(restaurantAddress);
    if (restaurantPhone) printer.println(restaurantPhone);
    if (isVatSec && vattin) {
      printer.println(`VATTIN - ${vattin}`);
    } else if (isGstSec && gstin) {
      printer.println(`GSTIN - ${gstin}`);
    }
    printer.newLine();
  };

  // CASE 1: Both GST and VAT items are present -> Print Statement followed by split invoices
  if (hasGst && hasVat) {
    // ---- 1. STATEMENT ----
    printer.alignCenter();
    printer.printBoldTrue();
    printer.println("Statement");
    printer.printBoldFalse();
    printer.newLine();

    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.printBoldTrue();
    const paxStr = capacity ? ` (Pax - ${capacity})` : '';
    printer.println(`${tableName === 'Table' ? 'H' : tableName}${tableNumber}${paxStr}`);
    printer.setTextNormal();
    printer.printBoldFalse();
    printer.newLine();

    printer.alignLeft();
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    printer.println(
      padRight(`Statement ${invoiceNumber}`, 24) + 
      padLeft(`${items.length} ${items.length === 1 ? 'item' : 'items'} (${totalQty} Qty)`, 24)
    );
    printer.println(
      padRight(formattedDateTime, 24) + 
      padLeft(captainName, 24)
    );
    drawCustomLine();

    printer.printBoldTrue();
    printer.println(padRight("Name", 34) + padLeft("Amount", 14));
    printer.printBoldFalse();
    drawCustomLine();

    // 1. Invoice (GST items total)
    printer.println(padRight("1. Invoice", 34) + padLeft(gstTotal.toFixed(2), 14));
    // 2. Invoice (VAT items total)
    printer.println(padRight("2. Invoice", 34) + padLeft(vatTotal.toFixed(2), 14));
    drawCustomLine();

    printer.alignRight();
    printer.println(padRight("Bill Total", 34) + padLeft(totalBeforeRounding.toFixed(2), 14));
    printer.newLine();
    printer.printBoldTrue();
    printer.println(padRight("Bill Total (rounded)", 34) + padLeft(totalRounded.toFixed(2), 14));
    printer.printBoldFalse();
    drawCustomLine();

    // Statement Footer
    printer.alignCenter();
    printer.println("Powered by www.dotpe.in");
    if (gstin) {
      printer.println(`GSTIN - ${gstin}`);
    }
    printer.newLine();

    // Cut paper and proceed to GST invoice
    printer.cut();

    // ---- 2. GST INVOICE ----
    printInvoiceSection("Order (Invoice)", gstItems, gstSubtotal, gstDiscount, gstServiceCharge, true, false, gstTotal);

    // Cut paper and proceed to VAT invoice
    printer.cut();

    // ---- 3. VAT INVOICE ----
    printInvoiceSection("Order (Invoice)", vatItems, vatSubtotal, vatDiscount, vatServiceCharge, false, true, vatTotal);
  }
  // CASE 2: Only GST items exist
  else if (hasGst) {
    printInvoiceSection("Order (Invoice)", gstItems, gstSubtotal, gstDiscount, gstServiceCharge, true, false, gstTotal);
  }
  // CASE 3: Only VAT items exist
  else if (hasVat) {
    printInvoiceSection("Order (Invoice)", vatItems, vatSubtotal, vatDiscount, vatServiceCharge, false, true, vatTotal);
  }
  // fallback for empty items
  else {
    printer.alignCenter();
    printer.println("NO ITEMS TO PRINT");
  }
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
