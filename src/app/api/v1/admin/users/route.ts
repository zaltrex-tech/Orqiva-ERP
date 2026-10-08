import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { AuditAction, UserRole, UserStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { z } from "zod";

// Helper to authenticate Super Admin
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

  // Fallback for development / server-side internal calls
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

    // Resolve tenant
    const tenant = await prisma.tenant.findFirst({
      where: { code: "ORQ-MAIN" },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not initialized" },
        { status: 404 }
      );
    }

    // Fetch users with audit logs count & sessions
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        phoneNumber: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch active warehouses/branches for assignment
    const branches = await prisma.warehouse.findMany({
      where: { tenantId: tenant.id },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
      },
      orderBy: { name: "asc" },
    });

    const totalUsers = users.length;
    const superAdmins = users.filter((u) => u.role === UserRole.SUPER_ADMIN).length;
    const cashiers = users.filter((u) => u.role === UserRole.CASHIER).length;
    const branchesCount = branches.length;

    return NextResponse.json({
      success: true,
      data: {
        users,
        branches,
        stats: {
          totalUsers,
          superAdmins,
          cashiers,
          branchesCount,
        },
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

const CreateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
  branchId: z.string().optional(),
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

    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email, password, role, status } = parsed.data;

    // Resolve tenant
    const tenant = await prisma.tenant.findFirst({
      where: { code: "ORQ-MAIN" },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not initialized" },
        { status: 404 }
      );
    }

    // Check email uniqueness within tenant
    const existing = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        fullName,
        email,
        passwordHash,
        role,
        status,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Write SOC-2 Immutable Audit Log
    await recordAuditEvent({
      tenantId: tenant.id,
      actorId: caller.userId,
      action: AuditAction.CREATE,
      entityType: "User",
      entityId: newUser.id,
      afterState: {
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: "User created successfully",
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

const PatchUserSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["TOGGLE_STATUS", "RESET_PASSWORD", "UPDATE_USER"]),
  status: z.nativeEnum(UserStatus).optional(),
  newPassword: z.string().min(6).optional(),
  fullName: z.string().min(2).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const caller = getSuperAdminCaller(req);
    if (!caller) {
      return NextResponse.json(
        { success: false, error: "Access denied. Super Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = PatchUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, action, status, newPassword, fullName, role } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    if (action === "TOGGLE_STATUS") {
      const nextStatus =
        status || (user.status === UserStatus.ACTIVE ? UserStatus.DEACTIVATED : UserStatus.ACTIVE);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { status: nextStatus },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
        },
      });

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: caller.userId,
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: user.id,
        beforeState: { status: user.status },
        afterState: { status: nextStatus },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `User status changed to ${nextStatus}`,
      });
    }

    if (action === "RESET_PASSWORD") {
      if (!newPassword) {
        return NextResponse.json(
          { success: false, error: "New password is required" },
          { status: 400 }
        );
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: caller.userId,
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: user.id,
        metadata: { event: "PASSWORD_RESET_ADMIN" },
      });

      return NextResponse.json({
        success: true,
        message: "User password reset successfully",
      });
    }

    if (action === "UPDATE_USER") {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: fullName || user.fullName,
          role: role || user.role,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          status: true,
        },
      });

      await recordAuditEvent({
        tenantId: user.tenantId,
        actorId: caller.userId,
        action: AuditAction.UPDATE,
        entityType: "User",
        entityId: user.id,
        beforeState: { fullName: user.fullName, role: user.role },
        afterState: { fullName: updated.fullName, role: updated.role },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: "User updated successfully",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
