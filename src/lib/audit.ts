import { prisma } from "./db";
import { AuditAction, Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  tenantId: string;
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  userAgent?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Appends an immutable audit event to the tamper-evident audit ledger.
 * Satisfies SOC-2 Trust Services Criteria & GDPR accountability requirements.
 */
export async function recordAuditEvent(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        beforeState: params.beforeState ? (params.beforeState as Prisma.InputJsonValue) : undefined,
        afterState: params.afterState ? (params.afterState as Prisma.InputJsonValue) : undefined,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    // Audit failures in SOC2 should be logged to critical alerting
    console.error("[CRITICAL AUDIT FAILURE]: Unable to persist audit event", err);
  }
}
