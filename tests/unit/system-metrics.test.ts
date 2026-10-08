import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemService } from "@/modules/system/system-service";
import { hasPermission } from "@/modules/auth/rbac";
import { GET as getSystemMetrics, POST as postSystemMetrics } from "@/app/api/v1/admin/system/metrics/route";
import { NextRequest } from "next/server";

describe("Phase 7 - Production System Ops & Cluster Monitoring", () => {
  describe("Node Process Telemetry", () => {
    it("should return valid process memory, CPU utilization, and uptime", () => {
      const nodeMetrics = SystemService.getNodeProcessMetrics();

      expect(nodeMetrics).toBeDefined();
      expect(nodeMetrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(typeof nodeMetrics.uptimeFormatted).toBe("string");
      expect(nodeMetrics.uptimeFormatted.length).toBeGreaterThan(0);

      expect(nodeMetrics.nodeVersion).toBe(process.version);
      expect(nodeMetrics.pid).toBe(process.pid);
      expect(nodeMetrics.platform).toBe(process.platform);
      expect(nodeMetrics.arch).toBe(process.arch);

      expect(nodeMetrics.memory.heapTotalBytes).toBeGreaterThan(0);
      expect(nodeMetrics.memory.heapUsedBytes).toBeGreaterThan(0);
      expect(nodeMetrics.memory.heapUsedPercentage).toBeGreaterThanOrEqual(0);
      expect(nodeMetrics.memory.heapUsedPercentage).toBeLessThanOrEqual(100);
      expect(nodeMetrics.memory.rssBytes).toBeGreaterThan(0);

      expect(nodeMetrics.cpu.cores).toBeGreaterThanOrEqual(1);
      expect(nodeMetrics.cpu.cpuPercentage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(nodeMetrics.loadAverage)).toBe(true);
    });
  });

  describe("PostgreSQL Pool & Storage Metrics", () => {
    it("should return structured database metrics without unhandled exceptions", async () => {
      const pgMetrics = await SystemService.getPostgresMetrics();

      expect(pgMetrics).toBeDefined();
      expect(["HEALTHY", "DEGRADED", "DOWN"]).toContain(pgMetrics.status);
      expect(typeof pgMetrics.totalConnections).toBe("number");
      expect(typeof pgMetrics.activeConnections).toBe("number");
      expect(typeof pgMetrics.idleConnections).toBe("number");
      expect(typeof pgMetrics.maxConnections).toBe("number");
      expect(typeof pgMetrics.cacheHitRatio).toBe("number");
      expect(typeof pgMetrics.databaseSizeBytes).toBe("number");
      expect(typeof pgMetrics.databaseSizeFormatted).toBe("string");
      expect(typeof pgMetrics.serverVersion).toBe("string");
    });
  });

  describe("BullMQ Queue & Redis Telemetry", () => {
    it("should inspect BullMQ queue counts and failed jobs list safely", async () => {
      const { redis, queue } = await SystemService.getRedisAndQueueMetrics();

      expect(redis).toBeDefined();
      expect(["CONNECTED", "DISCONNECTED", "DEGRADED"]).toContain(redis.status);
      expect(typeof redis.usedMemoryBytes).toBe("number");
      expect(typeof redis.usedMemoryFormatted).toBe("string");

      expect(queue).toBeDefined();
      expect(queue.queueName).toBe("orqiva-ledger-tasks");
      expect(["ONLINE", "IDLE", "OFFLINE"]).toContain(queue.status);

      expect(queue.counts).toBeDefined();
      expect(typeof queue.counts.waiting).toBe("number");
      expect(typeof queue.counts.active).toBe("number");
      expect(typeof queue.counts.completed).toBe("number");
      expect(typeof queue.counts.failed).toBe("number");
      expect(typeof queue.counts.delayed).toBe("number");
      expect(typeof queue.counts.paused).toBe("number");

      expect(Array.isArray(queue.failedJobs)).toBe(true);
    });

    it("should safely handle failed job retries without crashing when offline", async () => {
      const retryResult = await SystemService.retryFailedJobs("test-nonexistent-job-id");

      expect(retryResult).toBeDefined();
      expect(typeof retryResult.success).toBe("boolean");
      expect(typeof retryResult.retriedCount).toBe("number");
      expect(typeof retryResult.message).toBe("string");
    });
  });

  describe("Database Backups & 14-Day Retention Inspection", () => {
    it("should report 14-day retention policy and recent backups list", async () => {
      const backups = await SystemService.getBackupMetrics();

      expect(backups).toBeDefined();
      expect(backups.retentionDays).toBe(14);
      expect(typeof backups.backupCount).toBe("number");
      expect(typeof backups.totalSizeBytes).toBe("number");
      expect(typeof backups.totalSizeFormatted).toBe("string");
      expect(Array.isArray(backups.recentBackups)).toBe(true);
    });

    it("should trigger an on-demand database backup and return an audit artifact", async () => {
      const backupResult = await SystemService.triggerBackup("unit-test-operator");

      expect(backupResult).toBeDefined();
      expect(backupResult.success).toBe(true);
      expect(backupResult.fileName).toContain("orqiva_backup_");
      expect(typeof backupResult.sizeFormatted).toBe("string");
      expect(typeof backupResult.timestamp).toBe("string");
      expect(backupResult.message).toContain("backup");
    });
  });

  describe("Aggregated Cluster Metrics Endpoint", () => {
    it("should aggregate all subsystems under getSystemMetrics", async () => {
      const clusterMetrics = await SystemService.getSystemMetrics();

      expect(clusterMetrics).toBeDefined();
      expect(clusterMetrics.timestamp).toBeDefined();
      expect(["HEALTHY", "DEGRADED", "CRITICAL"]).toContain(clusterMetrics.overallStatus);
      expect(clusterMetrics.node).toBeDefined();
      expect(clusterMetrics.postgres).toBeDefined();
      expect(clusterMetrics.redis).toBeDefined();
      expect(clusterMetrics.queue).toBeDefined();
      expect(clusterMetrics.backups).toBeDefined();
    });

    it("should respond to GET /api/v1/admin/system/metrics with HTTP 200", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/admin/system/metrics");
      const res = await getSystemMetrics(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.node).toBeDefined();
      expect(json.data.postgres).toBeDefined();
      expect(json.data.redis).toBeDefined();
      expect(json.data.queue).toBeDefined();
      expect(json.data.backups).toBeDefined();
    });

    it("should handle POST /api/v1/admin/system/metrics with TRIGGER_BACKUP", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/admin/system/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRIGGER_BACKUP" }),
      });
      const res = await postSystemMetrics(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.fileName).toBeDefined();
    });

    it("should handle POST /api/v1/admin/system/metrics with RETRY_FAILED_JOBS", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/admin/system/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RETRY_FAILED_JOBS" }),
      });
      const res = await postSystemMetrics(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toBeDefined();
      expect(typeof json.data.retriedCount).toBe("number");
    });
  });

  describe("RBAC Permissions for System Ops Management", () => {
    it("should allow Super Admin to access system configuration and ops monitoring", () => {
      expect(hasPermission("SUPER_ADMIN", "admin:system_config")).toBe(true);
    });

    it("should restrict non-administrative roles from system config", () => {
      expect(hasPermission("CASHIER", "admin:system_config")).toBe(false);
      expect(hasPermission("ACCOUNTANT", "admin:system_config")).toBe(false);
      expect(hasPermission("HR_MANAGER", "admin:system_config")).toBe(false);
      expect(hasPermission("INVENTORY_MANAGER", "admin:system_config")).toBe(false);
      expect(hasPermission("AUDITOR", "admin:system_config")).toBe(false);
    });
  });
});
