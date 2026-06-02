/**
 * Logger utility for POS Print Server
 * Provides formatted console logs with colors and timestamps.
 */

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  info: "\x1b[36m",    // Cyan
  success: "\x1b[32m", // Green
  warn: "\x1b[33m",    // Yellow
  error: "\x1b[31m",   // Red
  purple: "\x1b[35m"   // Magenta
};

function getTimestamp() {
  return new Date().toISOString();
}

export const logger = {
  info: (msg, ...args) => {
    console.log(`${COLORS.dim}[${getTimestamp()}]${COLORS.reset} ${COLORS.info}[INFO]${COLORS.reset} ${msg}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`${COLORS.dim}[${getTimestamp()}]${COLORS.reset} ${COLORS.success}[SUCCESS]${COLORS.reset} ${COLORS.bright}${msg}${COLORS.reset}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`${COLORS.dim}[${getTimestamp()}]${COLORS.reset} ${COLORS.warn}[WARN]${COLORS.reset} ${msg}`, ...args);
  },
  error: (msg, err = "", ...args) => {
    console.error(
      `${COLORS.dim}[${getTimestamp()}]${COLORS.reset} ${COLORS.error}[ERROR]${COLORS.reset} ${COLORS.bright}${msg}${COLORS.reset}`,
      err && err.stack ? `\n${err.stack}` : err,
      ...args
    );
  },
  system: (msg, ...args) => {
    console.log(`${COLORS.dim}[${getTimestamp()}]${COLORS.reset} ${COLORS.purple}[SYSTEM]${COLORS.reset} ${COLORS.bright}${msg}${COLORS.reset}`, ...args);
  }
};
