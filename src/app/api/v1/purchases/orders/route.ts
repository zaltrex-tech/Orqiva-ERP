import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PurchaseService } from "@/modules/procurement/purchase-service";
import { z } from "zod";

const POSchema = z.object({
  vendorId: z.string().min(1),
  warehouseId: z.string().min(1),
  orderNumber: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      taxRate: z.number().min(0).default(15),
    })
  ).min(1),
});

export async function GET() {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const orders = await prisma.purchaseOrder.findMany({
      where: { tenantId: tenant.id },
      include: {
        vendor: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        receipts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: { orders } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = POSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, errors: parsed.error.flatten() }, { status: 400 });
    }

    const tenant = await prisma.tenant.findFirst({ where: { code: "ORQ-MAIN" } });
    if (!tenant) return NextResponse.json({ success: false, error: "Tenant missing" }, { status: 404 });

    const res = await PurchaseService.createPurchaseOrder({
      tenantId: tenant.id,
      ...parsed.data,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.value });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
