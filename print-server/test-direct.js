/**
 * Standalone LAN Printer Tester
 * 
 * This script directly communicates with a LAN/Network thermal printer to test 
 * connection and formatting (KOT or BILL) without requiring a database connection.
 * 
 * Usage:
 *   node test-direct.js <printer-ip> [port] [type: KOT|BILL]
 * 
 * Examples:
 *   node test-direct.js 192.168.1.100
 *   node test-direct.js 192.168.1.100 9100 BILL
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load local environment if present
dotenv.config();

// Ensure a dummy SUPABASE_URL exists to prevent supabase.js validation from crashing
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = "https://xpwdtzhkkqqdwhxthiqn.supabase.co";
}

// Dynamically import the printer service and logger to guarantee env variables are loaded first
const { printerService } = await import("./src/services/printer.js");
const { logger } = await import("./src/utils/logger.js");

const args = process.argv.slice(2);
const printerIp = args[0];
const printerPort = parseInt(args[1] || "9100", 10);
const jobType = (args[2] || "KOT").toUpperCase();

if (!printerIp) {
  console.log(`
\x1b[35m======================================================
              LAN PRINTER DIRECT TESTER
======================================================\x1b[0m
Usage:
  node test-direct.js <printer-ip> [port] [type: KOT|BILL]

Arguments:
  <printer-ip>  The local LAN IP address of your thermal printer (e.g. 192.168.1.150)
  [port]        The TCP port of the printer (Default: 9100)
  [type]        Type of print layout to test: KOT or BILL (Default: KOT)

Examples:
  node test-direct.js 192.168.1.200
  node test-direct.js 192.168.1.200 9100 BILL
`);
  process.exit(1);
}

// 1. Prepare Mock Payloads
const mockKOT = {
  type: "KOT",
  restaurantName: "Tipsy POS Test",
  tableName: "Table",
  tableNumber: "12",
  captainName: "Dhananjay",
  kotNumber: "KOT-TEST-77",
  orderId: "test-order-uuid-12345678",
  timestamp: new Date().toISOString(),
  items: [
    { name: "Spicy Garlic Ramen", quantity: 2, notes: "Extra spicy, no spring onion" },
    { name: "Pork Gyoza", quantity: 1, notes: "Well fried" },
    { name: "Fresh Lime Soda", quantity: 3, notes: "Sweet & Salt mix" }
  ]
};

const mockBILL = {
  type: "BILL",
  restaurantName: "Tipsy POS Diner",
  restaurantAddress: "G-Block, Sector 63, Noida, UP",
  restaurantPhone: "+91 98765 43210",
  tableName: "Table",
  tableNumber: "12",
  captainName: "Dhananjay",
  invoiceNumber: "INV-TEST-2026",
  timestamp: new Date().toISOString(),
  subtotal: 780.00,
  taxPercent: 5.0,
  taxAmount: 39.00,
  grandTotal: 819.00,
  paymentMethod: "UPI / GPay",
  isPaid: true,
  items: [
    { name: "Spicy Garlic Ramen", quantity: 2, price: 290.00 },
    { name: "Pork Gyoza", quantity: 1, price: 200.00 },
    { name: "Fresh Lime Soda", quantity: 3, price: 0.00 } // complimentary
  ]
};

const selectedPayload = jobType === "BILL" ? mockBILL : mockKOT;

// 2. Setup objects
const mockJob = {
  id: `test-direct-${Date.now()}`,
  payload: selectedPayload
};

const printerInfo = {
  id: "test-printer-id",
  name: `Direct Test (${jobType})`,
  ip_address: printerIp,
  port: printerPort,
  type: jobType === "BILL" ? "billing" : "kitchen"
};

// 3. Fire local print job
async function runTest() {
  logger.system(`Starting Direct Print Test to ${printerIp}:${printerPort}`);
  logger.info(`Layout Selected: ${jobType}`);
  
  try {
    const success = await printerService.print(mockJob, printerInfo);
    if (success) {
      logger.success("====================================================");
      logger.success("   TEST COMPLETED: Print instruction sent successfully!");
      logger.success("   Please verify if your thermal printer printed.");
      logger.success("====================================================");
    }
  } catch (error) {
    logger.error("TEST FAILED: Direct printing failed.", error);
    console.log(`
\x1b[31mTroubleshooting Tips:\x1b[0m
1. Verify the IP address: Can you ping the printer at '${printerIp}'?
   Run: ping ${printerIp}
2. Verify Port: Is the printer listening on port ${printerPort}?
   Usually standard ESC/POS printers listen on port 9100.
3. Check Cables: Is the printer connected to the router/switch via Ethernet?
4. IP Subnet: Ensure your computer is on the same subnet (e.g. 192.168.1.x) as the printer.
`);
  }
}

runTest();
