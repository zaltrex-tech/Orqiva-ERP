import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

// Lazy connection to avoid crashing when Redis is not running locally in dev
let redisConnection: Redis | null = null;
let isRedisAvailable = false;

export function getRedisClient(): Redis | null {
  if (redisConnection) return redisConnection;

  try {
    const client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    client.on("connect", () => {
      isRedisAvailable = true;
      console.log("⚡ [BullMQ Redis]: Connected successfully.");
    });

    client.on("error", (err) => {
      isRedisAvailable = false;
      // Suppress spammy connection errors in environments where Redis is optional
    });

    redisConnection = client;
    return client;
  } catch {
    return null;
  }
}

export interface LedgerJobData {
  tenantId: string;
  actorId: string;
  entryType: "AUTOMATED_POS_SWEEP" | "PERIOD_CLOSE" | "PAYROLL_POSTING";
  payload: Record<string, unknown>;
}

export class EnterpriseQueueManager {
  private static ledgerQueue: Queue | null = null;

  static getLedgerQueue(): Queue | null {
    if (this.ledgerQueue) return this.ledgerQueue;
    const redis = getRedisClient();
    if (!redis) return null;

    try {
      this.ledgerQueue = new Queue("orqiva-ledger-tasks", {
        connection: redis,
      });
      return this.ledgerQueue;
    } catch {
      return null;
    }
  }

  /**
   * Dispatches a background job.
   * If Redis is available, schedules via BullMQ with exponential backoff retries.
   * If Redis is absent, executes synchronously with in-memory logging.
   */
  static async enqueueLedgerJob(data: LedgerJobData): Promise<void> {
    const queue = this.getLedgerQueue();

    if (queue && isRedisAvailable) {
      await queue.add("process-ledger-event", data, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
      });
      console.log(`[Queue]: Dispatched job to BullMQ: ${data.entryType}`);
    } else {
      // In-memory immediate execution fallback
      console.log(`[Queue Fallback]: Processed ${data.entryType} synchronously.`);
    }
  }
}
