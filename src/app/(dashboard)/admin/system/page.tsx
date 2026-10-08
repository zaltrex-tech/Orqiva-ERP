"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Server,
  Zap,
  Cpu,
  Database,
  Activity,
  RefreshCw,
  HardDriveDownload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Repeat,
  ShieldCheck,
  RotateCw,
  FileArchive,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";
import type { SystemMetricsResult } from "@/modules/system/system-service";

export default function SystemMonitoringPage() {
  const { t, locale } = useI18n();

  const [metrics, setMetrics] = useState<SystemMetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  const fetchMetrics = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await fetch("/api/v1/admin/system/metrics");
      const json = await res.json();
      if (json.success && json.data) {
        setMetrics(json.data);
      } else {
        if (!silent) toast.error(json.error || t("common.error", "Failed to fetch metrics"));
      }
    } catch {
      if (!silent) toast.error(t("common.error", "Network error fetching metrics"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics]);

  const handleTriggerBackup = async () => {
    try {
      setIsTriggeringBackup(true);
      const res = await fetch("/api/v1/admin/system/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRIGGER_BACKUP" }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(
          `${t("system.backupSuccess", "Database backup created and verified successfully")}: ${json.data?.fileName || ""} (${json.data?.sizeFormatted || ""})`
        );
        fetchMetrics(true);
      } else {
        toast.error(json.message || t("system.backupError", "Database backup execution failed"));
      }
    } catch {
      toast.error(t("system.backupError", "Database backup execution failed"));
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleRetryJob = async (jobId?: string) => {
    try {
      if (jobId) {
        setRetryingJobId(jobId);
      } else {
        setIsRetryingAll(true);
      }

      const res = await fetch("/api/v1/admin/system/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RETRY_FAILED_JOBS",
          jobId,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message || "Job(s) re-queued successfully");
        fetchMetrics(true);
      } else {
        toast.error(json.message || "Failed to retry job(s)");
      }
    } catch {
      toast.error("Network error while retrying jobs");
    } finally {
      setRetryingJobId(null);
      setIsRetryingAll(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header & Cluster Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-6 h-6 text-amber-400" />
                {t("system.title", "System Operations & Cluster Monitoring")}
              </h1>
              {metrics && (
                <Badge
                  variant={
                    metrics.overallStatus === "HEALTHY"
                      ? "emerald"
                      : metrics.overallStatus === "DEGRADED"
                      ? "amber"
                      : "rose"
                  }
                  className="ms-2 px-2.5 py-0.5 uppercase font-mono tracking-wider text-[11px]"
                >
                  {metrics.overallStatus === "HEALTHY"
                    ? t("system.healthy", "Healthy & Nominal")
                    : metrics.overallStatus === "DEGRADED"
                    ? t("system.degraded", "Degraded Performance")
                    : t("system.critical", "Critical Outage")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {t(
                "system.subtitle",
                "Real-time health telemetry across PostgreSQL, Redis, BullMQ workers, and containerized runtime."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin" : ""}`} style={{ animationDuration: "10s" }} />
              {t("system.autoRefresh", "Auto Refresh (10s)")}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMetrics(false)}
              disabled={refreshing}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {t("system.refresh", "Refresh Telemetry")}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerBackup}
              disabled={isTriggeringBackup}
              className="gap-2 text-xs font-semibold shadow-luxury-sm"
            >
              <HardDriveDownload className={`w-4 h-4 ${isTriggeringBackup ? "animate-bounce" : ""}`} />
              {isTriggeringBackup
                ? t("system.triggeringBackup", "Executing Backup...")
                : t("system.triggerBackup", "Trigger Database Backup")}
            </Button>
          </div>
        </div>

        {/* 4 Core Cluster Status Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: PostgreSQL Enterprise DB */}
          <Card className="relative overflow-hidden border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    {t("system.cardPostgres", "PostgreSQL Database")}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metrics?.postgres.serverVersion || "PostgreSQL 16"}
                  </span>
                </div>
              </div>
              <Badge
                variant={metrics?.postgres.status === "HEALTHY" ? "emerald" : "rose"}
                className="text-[10px] py-0.5"
              >
                {metrics?.postgres.status || "CHECKING"}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.connections", "Active Connections")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.postgres.activeConnections ?? 0} / {metrics?.postgres.maxConnections ?? 100}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({metrics?.postgres.idleConnections ?? 0} idle)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.cacheHitRatio", "Buffer Cache Hit Ratio")}</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {metrics?.postgres.cacheHitRatio ?? 99.8}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.dbSize", "Database Size")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.postgres.databaseSizeFormatted || "0 MB"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                <span className="text-slate-400">{t("system.latency", "Query Latency")}</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {metrics?.postgres.latencyMs !== null && metrics?.postgres.latencyMs !== undefined
                    ? `${metrics.postgres.latencyMs} ms`
                    : "N/A"}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Redis Broker & Memory Store */}
          <Card className="relative overflow-hidden border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    {t("system.cardRedis", "Redis Cache & Broker")}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    v{metrics?.redis.version || "7.x"}
                  </span>
                </div>
              </div>
              <Badge
                variant={metrics?.redis.status === "CONNECTED" ? "emerald" : "slate"}
                className="text-[10px] py-0.5"
              >
                {metrics?.redis.status || "DISCONNECTED"}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.memoryUsage", "Memory Usage")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.redis.usedMemoryFormatted || "0 B"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.peakMemory", "Peak Memory")}</span>
                <span className="font-semibold text-slate-300 font-mono">
                  {metrics?.redis.peakMemoryFormatted || "0 B"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.connectedClients", "Connected Clients")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.redis.connectedClients ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                <span className="text-slate-400">{t("system.latency", "Ping Latency")}</span>
                <span className="font-mono text-amber-400 font-semibold">
                  {metrics?.redis.latencyMs !== null && metrics?.redis.latencyMs !== undefined
                    ? `${metrics.redis.latencyMs} ms`
                    : "N/A"}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 3: BullMQ Task Worker */}
          <Card className="relative overflow-hidden border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    {t("system.cardWorker", "BullMQ Task Worker")}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metrics?.queue.queueName || "orqiva-ledger-tasks"}
                  </span>
                </div>
              </div>
              <Badge
                variant={
                  metrics?.queue.status === "ONLINE"
                    ? "emerald"
                    : metrics?.queue.status === "IDLE"
                    ? "amber"
                    : "slate"
                }
                className="text-[10px] py-0.5"
              >
                {metrics?.queue.status || "OFFLINE"}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.waitingJobs", "Waiting")}</span>
                <span className="font-semibold text-amber-400 font-mono">
                  {metrics?.queue.counts.waiting ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.activeJobs", "Active")}</span>
                <span className="font-semibold text-indigo-400 font-mono">
                  {metrics?.queue.counts.active ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.completedJobs", "Completed")}</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {metrics?.queue.counts.completed ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                <span className="text-slate-400">{t("system.failedJobs", "Failed")}</span>
                <span
                  className={`font-mono font-semibold ${
                    (metrics?.queue.counts.failed ?? 0) > 0 ? "text-rose-400 font-bold" : "text-slate-400"
                  }`}
                >
                  {metrics?.queue.counts.failed ?? 0}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 4: Web Node Runtime */}
          <Card className="relative overflow-hidden border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    {t("system.cardWeb", "Web Application Node")}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    PID {metrics?.node.pid || process.pid}
                  </span>
                </div>
              </div>
              <Badge variant="indigo" className="text-[10px] py-0.5">
                {metrics?.node.nodeVersion || process.version}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.uptime", "System Uptime")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.node.uptimeFormatted || "0s"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.heapUsage", "Heap Memory")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.node.memory.heapUsedFormatted || "0 MB"} (
                  {metrics?.node.memory.heapUsedPercentage ?? 0}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("system.rssMemory", "RSS Memory")}</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {metrics?.node.memory.rssFormatted || "0 MB"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/40">
                <span className="text-slate-400">{t("system.cpuUtilization", "CPU Cores")}</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {metrics?.node.cpu.cores || 1} Cores ({metrics?.node.cpu.cpuPercentage ?? 0}%)
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* BullMQ Queue Management & Error Triage */}
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="w-4 h-4 text-amber-400" />
                {t("system.queueSectionTitle", "BullMQ Queue Management & Error Triage")}
              </CardTitle>
              <CardDescription>
                {t(
                  "system.queueSectionDesc",
                  "Inspect deferred ledger jobs, batch processing latency, and retry dead-letter jobs."
                )}
              </CardDescription>
            </div>
            {(metrics?.queue.failedJobs.length ?? 0) > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRetryJob()}
                disabled={isRetryingAll}
                className="gap-2 text-xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRetryingAll ? "animate-spin" : ""}`} />
                {isRetryingAll
                  ? t("system.retrying", "Retrying...")
                  : t("system.retryAll", "Retry All Failed Jobs")}
              </Button>
            )}
          </CardHeader>

          {metrics?.queue.failedJobs && metrics.queue.failedJobs.length > 0 ? (
            <div className="divide-y divide-slate-800/60 border border-slate-800/80 rounded-lg overflow-hidden">
              {metrics.queue.failedJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 hover:bg-slate-950/70 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="rose" className="font-mono text-[11px]">
                        ID: {job.id}
                      </Badge>
                      <span className="font-semibold text-sm text-slate-200">{job.name}</span>
                      <span className="text-xs text-slate-400">
                        ({t("system.attempts", "Attempts")}: {job.attemptsMade})
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(job.timestamp).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                      </span>
                    </div>
                    <p className="text-xs text-rose-300/90 font-mono bg-rose-500/10 p-2 rounded border border-rose-500/20 break-all">
                      {job.failedReason}
                    </p>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetryJob(job.id)}
                      disabled={retryingJobId === job.id}
                      className="gap-1.5 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${retryingJobId === job.id ? "animate-spin" : ""}`} />
                      {t("system.retryJob", "Retry Job")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-lg bg-slate-950/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/80 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">
                {t("system.noFailedJobs", "No Failed Jobs in BullMQ Queue")}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {t(
                  "system.noFailedJobsDesc",
                  "All ledger sweep events and background processes are completing smoothly."
                )}
              </p>
            </div>
          )}
        </Card>

        {/* Database Backups & 14-Day Retention Inspection */}
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                {t("system.backupSectionTitle", "Production Database Backups (14-Day Retention)")}
              </CardTitle>
              <CardDescription>
                {t(
                  "system.backupSectionDesc",
                  "Automated pg_dump exports with gzip compression and SHA-256 tamper-evident integrity."
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="indigo" className="text-xs gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                {t("system.fourteenDays", "14 Days Automatic Pruning")}
              </Badge>
            </div>
          </CardHeader>

          {/* Backup KPI Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 mb-4 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">{t("system.lastBackup", "Last Backup")}</span>
              <span className="font-semibold text-slate-200 font-mono">
                {metrics?.backups.lastBackupDate
                  ? new Date(metrics.backups.lastBackupDate).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")
                  : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t("system.backupCount", "Available Backups")}</span>
              <span className="font-semibold text-amber-400 font-mono">
                {metrics?.backups.backupCount ?? 0} Archives
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t("system.totalBackupStorage", "Total Storage")}</span>
              <span className="font-semibold text-emerald-400 font-mono">
                {metrics?.backups.totalSizeFormatted || "0 B"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">{t("system.retentionPolicy", "Retention")}</span>
              <span className="font-semibold text-slate-300 font-mono">
                {metrics?.backups.retentionDays ?? 14} Days Rolling
              </span>
            </div>
          </div>

          {/* Backup Archives List */}
          {metrics?.backups.recentBackups && metrics.backups.recentBackups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="pb-2 text-start">{t("system.fileName", "Archive File")}</th>
                    <th className="pb-2 text-start">{t("system.fileSize", "Size")}</th>
                    <th className="pb-2 text-start">{t("system.createdAt", "Created")}</th>
                    <th className="pb-2 text-end">{t("common.status", "Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {metrics.backups.recentBackups.map((bk) => (
                    <tr key={bk.fileName} className="hover:bg-slate-900/40">
                      <td className="py-2.5 font-mono text-slate-200 flex items-center gap-2">
                        <FileArchive className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate max-w-xs">{bk.fileName}</span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-300">{bk.sizeFormatted}</td>
                      <td className="py-2.5 font-mono text-slate-400">
                        {new Date(bk.createdAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US")}
                      </td>
                      <td className="py-2.5 text-end">
                        <Badge variant="emerald" className="text-[10px] py-0">
                          {bk.hasChecksum
                            ? t("system.checksumVerified", "SHA-256 Verified")
                            : "GZIP Compressed"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              <Info className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              {t("system.noBackupsYet", "No backup archives found on storage disk.")}
            </div>
          )}
        </Card>
      </div>
    </ErrorBoundary>
  );
}
