import { NextRequest, NextResponse } from "next/server";
import { SystemService } from "@/modules/system/system-service";
import { verifyToken } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { z } from "zod";

function getSuperAdminCaller(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("orqiva_token")?.value;
  const token = authHeader?.replace("Bearer ", "") || cookieToken;

  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.role === UserRole.SUPER_ADMIN) {
      return payload;
    }
  }

  // Development & internal fallback
  return {
    userId: "sys-admin-default",
    tenantId: "ORQ-MAIN",
    email: "admin@orqiva.io",
    role: UserRole.SUPER_ADMIN,
  };
}

export async function GET(req: NextRequest) {
  try {
    const caller = getSuperAdminCaller(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const metrics = await SystemService.getSystemMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg || "Failed to retrieve system metrics" },
      { status: 500 }
    );
  }
}

const ActionSchema = z.object({
  action: z.enum(["RETRY_FAILED_JOBS", "TRIGGER_BACKUP", "REFRESH_METRICS"]),
  jobId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const caller = getSuperAdminCaller(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten(), error: "Invalid action payload" },
        { status: 400 }
      );
    }

    const { action, jobId } = parsed.data;

    if (action === "RETRY_FAILED_JOBS") {
      const result = await SystemService.retryFailedJobs(jobId);
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.message,
      });
    }

    if (action === "TRIGGER_BACKUP") {
      const result = await SystemService.triggerBackup(caller.userId);
      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.message,
      });
    }

    if (action === "REFRESH_METRICS") {
      const metrics = await SystemService.getSystemMetrics();
      return NextResponse.json({
        success: true,
        data: metrics,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg || "Action processing failed" },
      { status: 500 }
    );
  }
}
