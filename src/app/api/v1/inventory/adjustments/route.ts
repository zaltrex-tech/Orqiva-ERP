import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AdjustmentService } from "@/modules/inventory/adjustment-service";
import { z } from "zod";
import { AdjustmentReason } from "@prisma/client";

const AdjustmentSchema = z.object({
  adjustmentNumber: z.string().min(1),
  locationId: z.string().min(1),
  reason: z.nativeEnum(AdjustmentReason),
  notes: z.string().optional(),
  lines: z.array(
    z.object({
      productId: z.string().min(1),
      countedQuantity: z.number().min(0),
    })
  ).min(1),
});

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const [adjustments, locations, products] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where: { tenantId: tenant.id },
        include: {
          location: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true, costPrice: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.location.findMany({
        where: { tenantId: tenant.id, type: "INTERNAL" },
        select: { id: true, name: true },
      }),
      prisma.product.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
          quants: {
            select: { locationId: true, quantity: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        adjustments,
        locations,
        products,
      },
    });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const res = await AdjustmentService.reconcileStock({
      tenantId: tenant.id,
      actorId: "system-audit-controller",
      ...parsed.data,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.value });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
