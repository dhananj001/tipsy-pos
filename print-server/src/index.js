import { listenerService } from "./services/listener.js";
import { logger } from "./utils/logger.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const VERSION = "1.0.0";

function printBanner() {
  const banner = `
======================================================
  ████████╗██╗██████╗ ███████╗██╗   ██╗    ██████╗  ██████╗ ███████╗
  ╚══██╔══╝██║██╔══██╗██╔════╝╚██╗ ██╔╝    ██╔══██╗██╔═══██╗██╔════╝
     ██║   ██║██████╔╝███████╗ ╚████╔╝     ██████╔╝██║   ██║███████╗
     ██║   ██║██╔═══╝ ╚════██║  ╚██╔╝      ██╔═══╝ ██║   ██║╚════██║
     ██║   ██║██║     ███████║   ██║       ██║     ╚██████╔╝███████║
     ╚═╝   ╚═╝╚═╝     ╚══════╝   ╚═╝       ╚═╝      ╚═════╝ ╚══════╝
======================================================
              T I P S Y   P O S   P R I N T E R
                      Version ${VERSION}
======================================================
`;
  console.log("\x1b[35m%s\x1b[0m", banner); // Magenta color for banner
}

async function main() {
  printBanner();
  
  logger.system("Initializing Tipsy POS Local Print Server...");

  // Handle termination signals gracefully
  process.on("SIGINT", () => {
    logger.system("Received SIGINT. Shutting down gracefully...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.system("Received SIGTERM. Shutting down gracefully...");
    process.exit(0);
  });

  // Prevent crashes on unhandled errors in commercial production environment
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception thrown:", error);
  });

  try {
    // Start listening
    await listenerService.start();
    logger.success("Print server started successfully and is ready to accept print jobs.");
  } catch (error) {
    logger.error("Fatal error during print server initialization:", error);
    process.exit(1);
  }
}

main();
