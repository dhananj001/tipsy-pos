import { supabase, CONFIG } from "../config/supabase.js";
import { printerService } from "./printer.js";
import { logger } from "../utils/logger.js";

// Cache of printer configurations to minimize DB lookups
const printerCache = new Map();

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
      }
    });
}

/**
 * Process a single print job from the queue
 * @param {Object} job - Print job record
 */
async function processJob(job) {
  // Prevent double processing if multiple events trigger
  if (job.status === "processing" || job.status === "printed") return;

  logger.info(`Processing print job [${job.id}] for printer: ${job.printer_id}`);

  // 1. Mark job as processing
  try {
    const { error: updateError } = await supabase
      .from("print_jobs")
      .update({ 
        status: "processing",
        attempts: (job.attempts || 0) + 1
      })
      .eq("id", job.id);

    if (updateError) throw updateError;
  } catch (error) {
    logger.error(`Failed to mark print job [${job.id}] as processing:`, error);
    return;
  }

  // 2. Fetch printer details (cache first, fallback to DB)
  let printerInfo = printerCache.get(job.printer_id);

  if (!printerInfo) {
    logger.info(`Printer [${job.printer_id}] not in cache. Fetching from database...`);
    try {
      const { data, error } = await supabase
        .from("printers")
        .select("*")
        .eq("id", job.printer_id)
        .single();

      if (error || !data) {
        throw new Error(`Printer with ID ${job.printer_id} not found in database.`);
      }

      printerInfo = data;
      printerCache.set(data.id, data); // cache it
    } catch (error) {
      logger.error(`Failed to retrieve printer configurations for job [${job.id}]:`, error);
      
      // Update job to failed
      await supabase
        .from("print_jobs")
        .update({
          status: "failed",
          error_message: `Printer resolution failed: ${error.message}`
        })
        .eq("id", job.id);
      return;
    }
  }

  // 3. Print
  try {
    await printerService.print(job, printerInfo);
    
    // 4. Update status to printed
    await supabase
      .from("print_jobs")
      .update({
        status: "printed",
        error_message: null
      })
      .eq("id", job.id);
  } catch (printError) {
    // 5. Handle print failures
    logger.error(`Print job execution failed for [${job.id}]:`, printError);
    
    await supabase
      .from("print_jobs")
      .update({
        status: "failed",
        error_message: printError.message || "Unknown ESC/POS network print error"
      })
      .eq("id", job.id);
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
