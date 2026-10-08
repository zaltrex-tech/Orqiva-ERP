import { startLedgerWorker } from "../modules/accounting/ledger-worker";

console.log("⚡ [Orqiva Worker Daemon]: Initializing BullMQ Worker Process...");

const worker = startLedgerWorker();

if (!worker) {
  console.log("ℹ️ [Orqiva Worker]: Redis not currently reachable. Worker loop standing by.");
} else {
  console.log("✅ [Orqiva Worker]: BullMQ Ledger Worker actively listening for jobs.");
}

const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 [Orqiva Worker]: Received ${signal}. Gracefully stopping worker...`);
  if (worker) {
    await worker.close();
  }
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Keep process alive
setInterval(() => {}, 1000 * 60 * 60);
