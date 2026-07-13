import { supabase, CONFIG } from "../config/supabase.js";
import { printerService } from "./printer.js";
import { logger } from "../utils/logger.js";
import net from "net";

// Cache of printer configurations to minimize DB lookups
const printerCache = new Map();

// Local in-memory set to prevent concurrent double-processing of the same job
const processingJobs = new Set();

/**
 * Supabase Realtime & Queue Listener Service
 */
export const listenerService = {
  /**
   * Start the print server listener
   */
  start: async () => {
    logger.system("Starting print server listener services...");
    
    // 1. Initial caching of printers
    await refreshPrintersCache();

    // 2. Poll for any pending print jobs from previous sessions
    await processPendingJobsQueue();

    // 3. Set up real-time subscription for printers to keep the cache hot
    setupPrintersSubscription();

    // 4. Set up real-time subscription for new print jobs
    setupPrintJobsSubscription();

    // 5. Start background printer connection status checks
    startPrinterHeartbeat();

    logger.success("All listener services are active and running!");
  }
};

/**
 * Load/refresh all printers in the cache
 */
async function refreshPrintersCache() {
  try {
    let query = supabase.from("printers").select("*").eq("is_active", true);
    
    if (CONFIG.restaurantId) {
      query = query.eq("restaurant_id", CONFIG.restaurantId);
    }

    const { data: printers, error } = await query;

    if (error) throw error;

    printerCache.clear();
    printers.forEach((p) => {
      printerCache.set(p.id, p);
    });

    logger.info(`Loaded ${printerCache.size} active printers into cache.`);
  } catch (error) {
    logger.error("Failed to load printers cache:", error);
  }
}

/**
 * Handle individual printer updates from DB
 */
function handlePrinterCacheUpdate(type, printer) {
  if (type === "DELETE" || !printer.is_active) {
    printerCache.delete(printer.id);
    logger.info(`Removed printer [${printer.name}] from local cache.`);
  } else {
    printerCache.set(printer.id, printer);
    logger.info(`Cached/Updated printer config: ${printer.name} -> ${printer.ip_address}:${printer.port}`);
  }
}

/**
 * Real-time listener for printer changes (IP, port, addition, deletion)
 */
function setupPrintersSubscription() {
  const filter = CONFIG.restaurantId 
    ? `restaurant_id=eq.${CONFIG.restaurantId}` 
    : undefined;

  supabase
    .channel("printers_cache_sync")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "printers",
        filter: filter
      },
      (payload) => {
        logger.info(`Received real-time printer config update (${payload.eventType})`);
        handlePrinterCacheUpdate(payload.eventType, payload.new || payload.old);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        logger.success("Real-time printer configuration cache synchronization is active.");
        refreshPrintersCache(); // Automatically refresh printer configurations on reconnect
      }
    });
}

/**
 * Process a single print job from the queue
 * @param {Object} job - Print job record
 */
async function processJob(job) {
  // Prevent double processing if already in flight locally
  if (processingJobs.has(job.id)) {
    logger.info(`Print job [${job.id}] is already processing in this instance. Skipping.`);
    return;
  }
  if (job.status === "processing" || job.status === "printed") return;

  processingJobs.add(job.id);
  logger.info(`Processing print job [${job.id}] for printer: ${job.printer_id}`);

  try {
    // 1. Claim job atomically in DB (ensures multiple client instances or double-triggers don't print twice)
    const { data, error: updateError } = await supabase
      .from("print_jobs")
      .update({ 
        status: "processing",
        attempts: (job.attempts || 0) + 1
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select();

    if (updateError) throw updateError;

    if (!data || data.length === 0) {
      logger.info(`Print job [${job.id}] was already claimed or processed. Skipping.`);
      return;
    }

    // Use the latest status from database
    const claimedJob = data[0];

    // 2. Fetch printer details (cache first, fallback to DB)
    let printerInfo = printerCache.get(claimedJob.printer_id);

    if (!printerInfo) {
      logger.info(`Printer [${claimedJob.printer_id}] not in cache. Fetching from database...`);
      try {
        const { data: dbPrinter, error } = await supabase
          .from("printers")
          .select("*")
          .eq("id", claimedJob.printer_id)
          .single();

        if (error || !dbPrinter) {
          throw new Error(`Printer with ID ${claimedJob.printer_id} not found in database.`);
        }

        printerInfo = dbPrinter;
        printerCache.set(dbPrinter.id, dbPrinter); // cache it
      } catch (error) {
        logger.error(`Failed to retrieve printer configurations for job [${claimedJob.id}]:`, error);
        
        // Update job to failed
        await supabase
          .from("print_jobs")
          .update({
            status: "failed",
            error_message: `Printer resolution failed: ${error.message}`
          })
          .eq("id", claimedJob.id);
        return;
      }
    }

    // 3. Print
    try {
      await printerService.print(claimedJob, printerInfo);
      
      // 4. Update status to printed
      await supabase
        .from("print_jobs")
        .update({
          status: "printed",
          error_message: null
        })
        .eq("id", claimedJob.id);
    } catch (printError) {
      // 5. Handle print failures
      logger.error(`Print job execution failed for [${claimedJob.id}]:`, printError);
      
      await supabase
        .from("print_jobs")
        .update({
          status: "failed",
          error_message: printError.message || "Unknown ESC/POS network print error"
        })
        .eq("id", claimedJob.id);
    }
  } catch (err) {
    logger.error(`Unexpected error processing job [${job.id}]:`, err);
  } finally {
    processingJobs.delete(job.id);
  }
}

/**
 * Real-time listener for new print jobs
 */
function setupPrintJobsSubscription() {
  const filter = CONFIG.restaurantId 
    ? `restaurant_id=eq.${CONFIG.restaurantId}` 
    : undefined;

  supabase
    .channel("new_print_jobs")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "print_jobs",
        filter: filter
      },
      (payload) => {
        logger.info(`New print job event received [${payload.new.id}]`);
        if (payload.new.status === "pending") {
          processJob(payload.new);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        logger.success("Real-time print job listener is active.");
        processPendingJobsQueue(); // Poll queue to capture any missed jobs during offline state
      }
      if (err) {
        logger.error("Error subscribing to print job realtime updates:", err);
      }
    });
}

/**
 * Query and process any pending jobs left over in the DB queue
 */
async function processPendingJobsQueue() {
  logger.info("Checking database for unprocessed or pending print jobs...");
  try {
    let query = supabase
      .from("print_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (CONFIG.restaurantId) {
      query = query.eq("restaurant_id", CONFIG.restaurantId);
    }

    const { data: pendingJobs, error } = await query;

    if (error) throw error;

    if (pendingJobs && pendingJobs.length > 0) {
      logger.info(`Found ${pendingJobs.length} pending print jobs in queue. Processing...`);
      for (const job of pendingJobs) {
        await processJob(job);
      }
    } else {
      logger.info("No pending print jobs in queue.");
    }
  } catch (error) {
    logger.error("Failed to process pending jobs queue:", error);
  }
}

/**
 * Start periodic printer health check ping loops
 */
function startPrinterHeartbeat() {
  logger.info("Starting background printer health check heartbeat loop (every 20s)...");
  
  // Run immediately on startup, then every 20 seconds
  pingAllPrinters();
  setInterval(pingAllPrinters, 20000);
}

/**
 * Ping each cached printer and write status to database
 */
async function pingAllPrinters() {
  if (printerCache.size === 0) return;
  
  logger.info(`Running connection checks on ${printerCache.size} cached printers...`);
  
  for (const [id, printer] of printerCache.entries()) {
    try {
      const result = await checkPrinterConnection(printer.ip_address, printer.port);
      
      // Update DB with connection status
      const { error } = await supabase
        .from("printers")
        .update({
          connection_status: result.status,
          connection_error: result.error,
          last_connected_at: result.status === "online" ? new Date().toISOString() : (printer.last_connected_at || null)
        })
        .eq("id", id);
        
      if (error) {
        if (error.code === "P0002" || error.message?.includes("does not exist") || error.message?.includes("column")) {
          logger.warn(`Database schema does not support connection tracking columns yet. Please apply the SQL migration in supabase/migrations/20260712160000_printer_connection_status.sql. Printer [${printer.name}] is locally ${result.status.toUpperCase()}`);
        } else {
          logger.error(`Failed to update status in DB for printer ${printer.name}:`, error);
        }
      } else {
        logger.info(`Printer [${printer.name}] health status check: ${result.status.toUpperCase()} ${result.error ? `(${result.error})` : ""}`);
      }
    } catch (err) {
      logger.error(`Error during health check for printer ${printer.name}:`, err);
    }
  }
}

/**
 * Test a TCP port/IP connection with a timeout
 */
function checkPrinterConnection(ip, port, timeout = 2500) {
  if (ip.startsWith("\\\\") || ip.startsWith("//") || ip.startsWith("printer:")) {
    // For USB/shared/local printers, we assume they are online since TCP port checks don't apply
    return Promise.resolve({ status: "online", error: null });
  }
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve({ status: "online", error: null });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ status: "offline", error: "Connection timed out" });
    });

    socket.on("error", (err) => {
      socket.destroy();
      resolve({ status: "offline", error: err.message || "Connection refused" });
    });

    socket.connect(port, ip);
  });
}
