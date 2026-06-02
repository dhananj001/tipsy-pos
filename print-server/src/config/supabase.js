import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const restaurantId = process.env.RESTAURANT_ID;

if (!supabaseUrl) {
  logger.error("SUPABASE_URL is missing in environment variables. Check .env file.");
  process.exit(1);
}

if (!supabaseKey || supabaseKey === "placeholder-service-role-key") {
  logger.warn("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is missing or using placeholder value. Supabase integration might not authenticate correctly.");
}

if (!restaurantId || restaurantId === "placeholder-restaurant-uuid") {
  logger.warn("RESTAURANT_ID is not configured. The print server will listen to print jobs across all restaurants (or may fail RLS policies depending on credentials).");
}

logger.info(`Initializing Supabase client with URL: ${supabaseUrl}`);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true
  },
  db: {
    schema: "public"
  }
});

export const CONFIG = {
  restaurantId,
  printerTimeout: parseInt(process.env.PRINTER_CONNECTION_TIMEOUT || "5000", 10)
};
