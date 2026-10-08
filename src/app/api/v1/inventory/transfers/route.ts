import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TransferService } from "@/modules/inventory/transfer-service";
import { z } from "zod";

const CreateTransferSchema = z.object({
  action: z.literal("create").default("create"),
  transferNumber: z.string().min(1),
  sourceLocationId: z.string().min(1),
  destLocationId: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().positive(),
    })
  ).min(1),
});

const DispatchTransferSchema = z.object({
  action: z.literal("dispatch"),
  transferId: z.string().min(1),
});

const ReceiveTransferSchema = z.object({
  action: z.literal("receive"),
  transferId: z.string().min(1),
});

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const [transfers, locations, products] = await Promise.all([
      prisma.stockTransfer.findMany({
        where: { tenantId: tenant.id },
        include: {
          sourceLocation: { select: { id: true, name: true, type: true } },
          destLocation: { select: { id: true, name: true, type: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.location.findMany({
        where: { tenantId: tenant.id, type: "INTERNAL" },
        select: { id: true, name: true, type: true },
      }),
      prisma.product.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, name: true, sku: true, costPrice: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transfers,
        locations,
        products,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "create";

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    if (action === "create") {
      const parsed = CreateTransferSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
      }

      const res = await TransferService.createTransfer({
        tenantId: tenant.id,
        actorId: "system-logistics-mgr",
        ...parsed.data,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: res.value });
    }

    if (action === "dispatch") {
      const parsed = DispatchTransferSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
      }

      const res = await TransferService.dispatchTransfer({
        tenantId: tenant.id,
        actorId: "system-logistics-mgr",
        transferId: parsed.data.transferId,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: res.value });
    }

    if (action === "receive") {
      const parsed = ReceiveTransferSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
      }

      const res = await TransferService.receiveTransfer({
        tenantId: tenant.id,
        actorId: "system-logistics-mgr",
        transferId: parsed.data.transferId,
      });

      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, data: res.value });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
